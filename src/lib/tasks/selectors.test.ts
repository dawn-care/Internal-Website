import { describe, expect, it } from 'vitest'
import { createMockTasks } from './mock'
import {
  applyFilters,
  compareByDoneBy,
  DEFAULT_FILTERS,
  doneByDate,
  githubLink,
  groupByAssignee,
  groupByDue,
  isDueSoon,
  isOverdue,
  selectBlocked,
  selectDueSoon,
  selectMine,
  selectOverdue,
  sumTotals,
} from './selectors'
import type { StatusKey, Task } from './types'

// Tests run in America/New_York (see vite.config.ts).
const TODAY = new Date(2026, 8, 29, 12, 0) // Tue, Sep 29 2026, noon
const LATE_TODAY = new Date(2026, 8, 29, 23, 30) // already Sep 30 in UTC

let n = 0
function task(fields: Partial<Task> & { key?: StatusKey } = {}): Task {
  n += 1
  const { key = 'inProgress', ...rest } = fields
  return {
    itemId: `item${n}`,
    contentId: `c${n}`,
    kind: 'draft',
    title: `Task ${n}`,
    assignees: [],
    status: key,
    statusKey: key,
    updatedAt: '2026-09-20T00:00:00Z',
    ...rest,
  }
}

const ids = (tasks: Task[]) => tasks.map((t) => t.itemId)

describe('doneByDate (GitHub date fields as local dates)', () => {
  it('parses "YYYY-MM-DD" as local midnight, not UTC midnight', () => {
    const date = doneByDate(task({ doneBy: '2026-09-29' }))!
    // As UTC midnight this would be Sep 28, 8pm in New York.
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(29)
    expect(date.getHours()).toBe(0)
  })

  it('is null when unset or malformed', () => {
    expect(doneByDate(task())).toBeNull()
    expect(doneByDate(task({ doneBy: '2026-02-30' }))).toBeNull()
  })
})

describe('isOverdue', () => {
  it('is true only for open tasks whose date is before today', () => {
    expect(isOverdue(task({ doneBy: '2026-09-28' }), TODAY)).toBe(true)
    expect(isOverdue(task({ doneBy: '2026-09-29' }), TODAY)).toBe(false)
    expect(isOverdue(task({ doneBy: '2026-09-28', key: 'done' }), TODAY)).toBe(false)
    expect(isOverdue(task(), TODAY)).toBe(false)
  })

  it('counts blocked tasks as open', () => {
    expect(isOverdue(task({ doneBy: '2026-09-01', key: 'blocked' }), TODAY)).toBe(true)
  })

  it('uses the local day late in the evening', () => {
    // At 11:30pm on Sep 29 local, a task due Sep 29 is due today, not overdue.
    expect(isOverdue(task({ doneBy: '2026-09-29' }), LATE_TODAY)).toBe(false)
  })
})

describe('isDueSoon', () => {
  it('covers today through 3 days out', () => {
    expect(isDueSoon(task({ doneBy: '2026-09-29' }), TODAY)).toBe(true)
    expect(isDueSoon(task({ doneBy: '2026-10-02' }), TODAY)).toBe(true)
    expect(isDueSoon(task({ doneBy: '2026-10-03' }), TODAY)).toBe(false)
  })

  it('excludes overdue, done, and undated tasks', () => {
    expect(isDueSoon(task({ doneBy: '2026-09-28' }), TODAY)).toBe(false)
    expect(isDueSoon(task({ doneBy: '2026-09-30', key: 'done' }), TODAY)).toBe(false)
    expect(isDueSoon(task(), TODAY)).toBe(false)
  })

  it('crosses month and year boundaries', () => {
    const dec30 = new Date(2026, 11, 30)
    expect(isDueSoon(task({ doneBy: '2027-01-02' }), dec30)).toBe(true)
    expect(isDueSoon(task({ doneBy: '2027-01-03' }), dec30)).toBe(false)
  })
})

describe('list selectors', () => {
  const overdue = task({ doneBy: '2026-09-20' })
  const soon = task({ doneBy: '2026-09-30' })
  const blocked = task({ key: 'blocked', doneBy: '2026-10-20' })
  const done = task({ key: 'done', doneBy: '2026-09-20' })
  const all = [overdue, soon, blocked, done]

  it('selectOverdue / selectDueSoon / selectBlocked', () => {
    expect(ids(selectOverdue(all, TODAY))).toEqual([overdue.itemId])
    expect(ids(selectDueSoon(all, TODAY))).toEqual([soon.itemId])
    expect(ids(selectBlocked(all))).toEqual([blocked.itemId])
  })

  it('selectMine matches assignees case-insensitively', () => {
    const mine = task({ assignees: [{ login: 'Ada', avatarUrl: '' }] })
    expect(ids(selectMine([mine, overdue], 'ada'))).toEqual([mine.itemId])
  })
})

describe('compareByDoneBy', () => {
  it('sorts by date, then P0 first, then title; undated last', () => {
    const tasks = [
      task({ title: 'undated' }),
      task({ title: 'b', doneBy: '2026-10-01', priority: 'P2' }),
      task({ title: 'a', doneBy: '2026-10-01' }),
      task({ title: 'c', doneBy: '2026-10-01', priority: 'P0' }),
      task({ title: 'early', doneBy: '2026-09-30', priority: 'P2' }),
    ]
    expect(tasks.sort(compareByDoneBy).map((t) => t.title)).toEqual([
      'early',
      'c',
      'b',
      'a',
      'undated',
    ])
  })
})

describe('groupByDue', () => {
  it('buckets into overdue / this week (7 days) / later / no date / done', () => {
    const g = groupByDue(
      [
        task({ title: 'late', doneBy: '2026-09-28' }),
        task({ title: 'today', doneBy: '2026-09-29' }),
        task({ title: 'week end', doneBy: '2026-10-05' }),
        task({ title: 'later', doneBy: '2026-10-06' }),
        task({ title: 'undated' }),
        task({ title: 'finished', key: 'done', doneBy: '2026-09-01' }),
      ],
      TODAY,
    )
    const titles = (list: Task[]) => list.map((t) => t.title)
    expect(titles(g.overdue)).toEqual(['late'])
    expect(titles(g.thisWeek)).toEqual(['today', 'week end'])
    expect(titles(g.later)).toEqual(['later'])
    expect(titles(g.noDate)).toEqual(['undated'])
    expect(titles(g.done)).toEqual(['finished'])
  })
})

describe('groupByAssignee', () => {
  const team = [
    { id: '1', login: 'ada', name: 'Ada', avatarUrl: '' },
    { id: '2', login: 'bo', name: 'Bo', avatarUrl: '' },
  ]

  it('gives every member a section, blocked first; then outsiders; then unassigned', () => {
    const ada = { login: 'ada', avatarUrl: '' }
    const a1 = task({ assignees: [ada], doneBy: '2026-09-30' })
    const a2 = task({ assignees: [ada], key: 'blocked', doneBy: '2026-10-30' })
    const outside = task({ assignees: [{ login: 'guest', avatarUrl: '' }] })
    const nobody = task()
    const groups = groupByAssignee([a1, a2, outside, nobody], team)
    expect(groups.map((g) => g.member?.login ?? null)).toEqual(['ada', 'bo', 'guest', null])
    expect(ids(groups[0].tasks)).toEqual([a2.itemId, a1.itemId])
    expect(groups[1].tasks).toEqual([])
  })

  it('lists a task under each of its assignees', () => {
    const shared = task({
      assignees: [
        { login: 'ada', avatarUrl: '' },
        { login: 'bo', avatarUrl: '' },
      ],
    })
    const groups = groupByAssignee([shared], team)
    expect(groups.map((g) => g.tasks.length)).toEqual([1, 1])
  })
})

describe('sumTotals', () => {
  it('adds up hours, counting tasks without an estimate', () => {
    expect(sumTotals([task({ estimateHours: 4 }), task({ estimateHours: 1.5 }), task({})])).toEqual(
      { estimateHours: 5.5, unestimated: 1 },
    )
  })
})

describe('applyFilters', () => {
  const dev = task({ type: 'Dev', priority: 'P0' })
  const docs = task({ type: 'Docs' })
  const backlog = task({ type: 'Dev', key: 'productBacklog', status: 'Product Backlog' })
  const done = task({ key: 'done', type: 'Dev' })
  const all = [dev, docs, backlog, done]

  it('defaults to every open task', () => {
    expect(ids(applyFilters(all, DEFAULT_FILTERS))).toEqual([
      dev.itemId,
      docs.itemId,
      backlog.itemId,
    ])
  })

  it('filters by type and priority, and shows Done on request', () => {
    const f = { ...DEFAULT_FILTERS, type: 'Dev', showDone: true }
    expect(ids(applyFilters(all, f))).toEqual([dev.itemId, backlog.itemId, done.itemId])
    expect(ids(applyFilters(all, { ...f, priority: 'P0' }))).toEqual([dev.itemId])
  })

  it('shows Done tasks when the Status filter asks for them', () => {
    expect(ids(applyFilters(all, { ...DEFAULT_FILTERS, status: 'done' }))).toEqual([done.itemId])
  })
})

describe('githubLink', () => {
  it('links issues and PRs directly, drafts to the project board', () => {
    const board = 'https://github.com/orgs/x/projects/1'
    expect(githubLink(task({ kind: 'issue', url: 'https://i', number: 4 }), board)).toEqual({
      href: 'https://i',
      label: 'Open issue #4 in GitHub',
    })
    expect(githubLink(task(), board).href).toBe(board)
  })
})

describe('mock data', () => {
  const { tasks, meta } = createMockTasks(TODAY)

  it('covers the cases the UI must handle', () => {
    expect(new Set(tasks.map((t) => t.kind))).toEqual(new Set(['draft', 'issue', 'pr']))
    expect(selectOverdue(tasks, TODAY).length).toBeGreaterThan(0)
    expect(selectBlocked(tasks).length).toBeGreaterThan(0)
    expect(tasks.some((t) => t.estimateHours === undefined)).toBe(true)
    // Every board column a deadline cares about.
    for (const key of ['activeBacklog', 'inProgress', 'inReview', 'blocked', 'productBacklog']) {
      expect(tasks.some((t) => t.statusKey === key)).toBe(true)
    }
  })

  it('uses the real Status options, with the deadline in the Active Backlog name', () => {
    expect(meta.statuses.map((s) => [s.name, s.key])).toEqual([
      ['Product Backlog', 'productBacklog'],
      ['Active Backlog (DEADLINE 12-16-26)', 'activeBacklog'],
      ['In progress', 'inProgress'],
      ['In review', 'inReview'],
      ['Done', 'done'],
      ['Blocked', 'blocked'],
    ])
    expect(meta.hasEstimate).toBe(true)
  })
})
