import { describe, expect, it } from 'vitest'
import type { Meeting } from '../meetings'
import type { Task } from '../tasks/types'
import { isAllCaughtUp, meetingPrep, prProblems, waitingCounts, workCounts } from './summary'
import type { DashboardPr, DashboardResponse, MyPr, MyWork, ReviewQueuePr } from './types'
import { applyOverrides } from './useDashboard'

const NOW = new Date('2026-09-30T14:00:00Z') // Wed Sep 30, 10am Eastern

const task = (itemId: string, fields: Partial<Task> = {}): Task => ({
  itemId,
  contentId: itemId,
  kind: 'issue',
  title: itemId,
  assignees: [],
  status: 'In progress',
  statusKey: 'inProgress',
  updatedAt: '2026-09-01T00:00:00Z',
  ...fields,
})

function work(fields: Partial<MyWork> = {}): MyWork {
  return {
    columns: { activeBacklog: [], inProgress: [], inReview: [], blocked: [] },
    counts: { activeBacklog: 0, inProgress: 0, inReview: 0, blocked: 0, overdue: 0, open: 0 },
    hiddenCount: 0,
    statuses: [],
    ...fields,
  }
}

function response(fields: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    me: { login: 'ada', name: 'Ada', avatarUrl: '' },
    deadline: {
      deadline: null,
      refinement: null,
      board: null,
      boardError: null,
      release: null,
      releaseError: null,
    },
    work: work(),
    reviewQueue: [],
    myPrs: [],
    meetings: { connected: true, meetings: [] },
    generatedAt: '2026-09-30T14:00:00.000Z',
    ...fields,
  }
}

/** A PR that follows every rule. */
const goodPr: Pick<
  DashboardPr,
  | 'isRelease'
  | 'targetsCorrectBase'
  | 'ticket'
  | 'missingFocusLabel'
  | 'size'
  | 'needsMedia'
  | 'hasMedia'
> = {
  isRelease: false,
  targetsCorrectBase: true,
  ticket: { number: 1, linked: true, labels: ['Server'] },
  missingFocusLabel: false,
  size: { lines: 10, files: 1, over: false },
  needsMedia: true,
  hasMedia: true,
}

describe('waitingCounts', () => {
  it('is all caught up only when every count is known and zero', () => {
    expect(isAllCaughtUp(waitingCounts(response(), NOW))).toBe(true)
    const failed = response({ reviewQueue: { error: { code: 'internal', message: 'x' } } })
    expect(waitingCounts(failed, NOW).reviews).toBeNull()
    expect(isAllCaughtUp(waitingCounts(failed, NOW))).toBe(false)
  })

  it('counts reviews, overdue and blocked tasks, failing CI, and PRs to fix up', () => {
    const counts = waitingCounts(
      response({
        reviewQueue: [{}, {}] as ReviewQueuePr[],
        myPrs: [
          { ...goodPr, isDraft: false, ciState: 'FAILURE' },
          // A UI change with no photo: needs fixing.
          { ...goodPr, isDraft: false, ciState: 'SUCCESS', hasMedia: false },
          // Drafts aren't nagged about.
          { ...goodPr, isDraft: true, ciState: null, ticket: null },
        ] as MyPr[],
        work: work({
          columns: {
            activeBacklog: [],
            inProgress: [task('a', { doneBy: '2026-09-01' })],
            inReview: [],
            blocked: [
              task('c', { statusKey: 'blocked' }),
              // Checked off here since it loaded (and it was overdue).
              task('d', { statusKey: 'done', status: 'Done', doneBy: '2026-09-02' }),
            ],
          },
          counts: {
            activeBacklog: 0,
            inProgress: 1,
            inReview: 0,
            blocked: 2,
            overdue: 7,
            open: 8,
          },
        }),
      }),
      NOW,
    )
    expect(counts).toEqual({ reviews: 2, overdue: 6, blocked: 1, failingCi: 1, prFixes: 1 })
  })
})

describe('workCounts', () => {
  it('subtracts tasks checked off here since the dashboard loaded', () => {
    const counts = workCounts(
      work({
        columns: {
          activeBacklog: [task('a', { statusKey: 'done', status: 'Done' })],
          inProgress: [],
          inReview: [],
          blocked: [],
        },
        counts: { activeBacklog: 3, inProgress: 0, inReview: 0, blocked: 0, overdue: 0, open: 5 },
      }),
      NOW,
    )
    expect(counts).toMatchObject({ activeBacklog: 2, open: 4 })
  })
})

describe('prProblems', () => {
  it('is empty for a PR that follows every rule', () => {
    expect(prProblems(goodPr)).toEqual([])
  })

  it('names each broken rule', () => {
    expect(
      prProblems({
        ...goodPr,
        targetsCorrectBase: false,
        ticket: null,
        size: { lines: 900, files: 3, over: true },
        hasMedia: false,
      }),
    ).toEqual(['Wrong base branch', 'No ticket', 'Over 750 lines or 15 files', 'No photo or video'])
    expect(prProblems({ ...goodPr, missingFocusLabel: true })).toEqual([
      'Ticket has no focus-area label',
    ])
  })

  it('holds a canary → main release to none of the feature-PR rules', () => {
    expect(
      prProblems({
        ...goodPr,
        isRelease: true,
        ticket: null,
        size: { lines: 9000, files: 80, over: true },
        needsMedia: false,
      }),
    ).toEqual([])
  })

  it('needs no photo or video when the PR doesn’t change the UI', () => {
    expect(prProblems({ ...goodPr, needsMedia: false, hasMedia: false })).toEqual([])
  })
})

describe('meetingPrep', () => {
  const sponsor = (start: string, docs: { agenda?: unknown; fourUp?: unknown }) => ({
    id: start,
    title: 'Sponsor Meeting',
    start,
    end: start.replace('T21:00', 'T22:15'),
    allDay: false,
    kind: 'official' as const,
    recurring: true,
    htmlLink: 'https://calendar.google.com/',
    ...docs,
  })
  const MONDAY = new Date('2026-09-28T14:00:00Z')

  it('nudges the day before a sponsor meeting that is missing its Agenda or 4Up', () => {
    const tuesday = sponsor('2026-09-29T21:00:00Z', { agenda: { id: 'a' }, fourUp: null })
    expect(meetingPrep([tuesday], MONDAY)).toEqual({ meeting: tuesday, missing: ['4Up'] })
    const neither = sponsor('2026-09-29T21:00:00Z', { agenda: null, fourUp: null })
    expect(meetingPrep([neither], MONDAY)?.missing).toEqual(['Agenda', '4Up'])
  })

  it('says nothing when both are posted, a feed hasn’t loaded, or it’s days away', () => {
    expect(
      meetingPrep([sponsor('2026-09-29T21:00:00Z', { agenda: {}, fourUp: {} })], MONDAY),
    ).toBeNull()
    expect(meetingPrep([sponsor('2026-09-29T21:00:00Z', {})], MONDAY)).toBeNull()
    expect(
      meetingPrep([sponsor('2026-10-06T21:00:00Z', { agenda: null, fourUp: null })], MONDAY),
    ).toBeNull()
  })

  it('ignores other meetings and sponsor meetings that are over', () => {
    const retro = {
      ...sponsor('2026-09-28T21:00:00Z', { agenda: null, fourUp: null }),
      kind: 'retro' as const,
    }
    const over = sponsor('2026-09-28T12:00:00Z', { agenda: null, fourUp: null })
    over.end = '2026-09-28T13:00:00Z'
    expect(meetingPrep([retro, over] as Meeting[], MONDAY)).toBeNull()
  })
})

describe('applyOverrides', () => {
  const data = response({
    work: work({
      columns: { activeBacklog: [], inProgress: [task('a')], inReview: [], blocked: [] },
    }),
  })
  const generated = Date.parse(data.generatedAt)

  it('shows a status set here until the server has caught up', () => {
    const overrides = new Map([
      ['a', { status: 'Done', statusKey: 'done' as const, at: generated + 1000 }],
    ])
    const next = applyOverrides(data, overrides).work as MyWork
    expect(next.columns.inProgress[0]).toMatchObject({ status: 'Done', statusKey: 'done' })
  })

  it('lets newer server data win', () => {
    const overrides = new Map([
      ['a', { status: 'Done', statusKey: 'done' as const, at: generated - 1000 }],
    ])
    const next = applyOverrides(data, overrides).work as MyWork
    expect(next.columns.inProgress[0].statusKey).toBe('inProgress')
  })
})
