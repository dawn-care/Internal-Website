import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { zonedInstant } from '../../src/lib/teamTime.js'
import {
  clearDashboardCache,
  getDashboard,
  groupMyWork,
  isWidgetError,
  type DashboardContext,
  type DashboardSources,
  type DeadlineWidget,
} from './dashboard.js'
import type { Meeting } from './google/calendar.js'
import { GitHubApiError } from './github/errors.js'
import type { ProjectMeta } from './github/project.js'
import type { MyPr, ReleaseStatus, ReviewQueuePr } from './github/pulls.js'
import type { Task } from './github/types.js'

// Wednesday 2026-09-30, 10am Eastern: inside Deadline 1 (Sep 27 – Oct 20, src/config/deadlines.ts).
const NOW = zonedInstant('2026-09-30', 10)
const TODAY = '2026-09-30'

function task(overrides: Partial<Task>): Task {
  return {
    itemId: overrides.title ?? 't',
    contentId: 'c',
    kind: 'issue',
    title: 't',
    assignees: [{ login: 'ada', avatarUrl: '' }],
    status: 'In progress',
    statusKey: 'inProgress',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

const META = {
  projectUrl: 'https://github.com/orgs/dawn/projects/1',
  repositories: [],
  status: {
    id: 'F_status',
    options: [
      { id: 'S_ab', name: 'Active Backlog (Oct 20)', color: 'BLUE' },
      { id: 'S_ip', name: 'In progress', color: 'YELLOW' },
      { id: 'S_ir', name: 'In review', color: 'PURPLE' },
      { id: 'S_done', name: 'Done', color: 'ORANGE' },
      { id: 'S_blk', name: 'Blocked', color: 'RED' },
    ],
  },
} as unknown as ProjectMeta

const RELEASE: ReleaseStatus = { open: [], merged: [] }

function meeting(id: string, start: string, end: string): Meeting {
  return {
    id,
    title: id,
    start,
    end,
    allDay: false,
    kind: 'adhoc',
    recurring: false,
    htmlLink: 'https://calendar.google.com/',
  }
}

function sources(overrides: Partial<DashboardSources> = {}): DashboardSources {
  return {
    projectMeta: vi.fn(async () => META),
    items: vi.fn(async () => ({
      tasks: [
        task({ title: 'late', doneBy: '2026-09-29' }),
        task({ title: 'review', statusKey: 'inReview', status: 'In review' }),
        task({ title: 'next', statusKey: 'activeBacklog', status: 'Active Backlog (Oct 20)' }),
        task({ title: 'done', statusKey: 'done', status: 'Done' }),
        task({
          title: 'not mine',
          statusKey: 'blocked',
          status: 'Blocked',
          assignees: [{ login: 'grace', avatarUrl: '' }],
        }),
        task({ title: 'later', statusKey: 'productBacklog', status: 'Product Backlog' }),
      ],
      hiddenCount: 1,
    })),
    reviewQueue: vi.fn(async () => [] as ReviewQueuePr[]),
    myPrs: vi.fn(async () => [] as MyPr[]),
    release: vi.fn(async () => RELEASE),
    meetings: vi.fn(async () => [] as Meeting[]),
    ...overrides,
  }
}

const ctx = (login = 'ada', now = NOW): DashboardContext => ({
  token: `token-${login}`,
  user: { login, name: login, avatarUrl: '' },
  org: 'dawn',
  now,
})

beforeEach(() => {
  clearDashboardCache()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getDashboard', () => {
  it('returns every widget', async () => {
    const res = await getDashboard(ctx(), sources())
    expect(res.me.login).toBe('ada')
    expect(res.generatedAt).toBe(NOW.toISOString())
    expect(res.deadline).toEqual({
      deadline: {
        name: 'Deadline 1',
        start: '2026-09-27',
        end: '2026-10-20',
        active: true,
        // Wed 9/30 – Fri 10/2 (3) + three full weeks (15) + Mon 10/19 – Tue 10/20 (2), minus
        // the weekends: 3 + 5 + 5 + 2.
        daysLeft: 15,
      },
      refinement: null,
      board: {
        // Team-wide: Grace's blocked task counts, Done and Product Backlog don't.
        counts: { activeBacklog: 1, inProgress: 1, inReview: 1, blocked: 1 },
        names: {
          activeBacklog: 'Active Backlog (Oct 20)',
          inProgress: 'In progress',
          inReview: 'In review',
          blocked: 'Blocked',
        },
        projectUrl: 'https://github.com/orgs/dawn/projects/1',
      },
      boardError: null,
      release: RELEASE,
      releaseError: null,
    } satisfies DeadlineWidget)
    expect(res.work).toMatchObject({
      counts: { activeBacklog: 1, inProgress: 1, inReview: 1, blocked: 0, overdue: 1, open: 4 },
      hiddenCount: 1,
    })
    expect(res.reviewQueue).toEqual([])
    expect(res.myPrs).toEqual([])
    expect(res.meetings).toEqual({ connected: true, meetings: [] })
  })

  it('checks the release from the deadline’s start', async () => {
    const release = vi.fn(async () => RELEASE)
    await getDashboard(ctx(), sources({ release }))
    expect(release).toHaveBeenCalledWith('token-ada', 'dawn', '2026-09-27')
  })

  it('reminds about backlog refinement for two days after a deadline', async () => {
    // Deadline 1 ended Tue Oct 20; Deadline 2 started Wed Oct 21.
    const res = await getDashboard(ctx('ada', zonedInstant('2026-10-22', 9)), sources())
    expect(res.deadline).toMatchObject({
      deadline: { name: 'Deadline 2', active: true },
      refinement: { after: 'Deadline 1', by: '2026-10-22' },
    })
    clearDashboardCache()
    const later = await getDashboard(ctx('ada', zonedInstant('2026-10-23', 9)), sources())
    expect(later.deadline).toMatchObject({ refinement: null })
  })

  it('has no deadline after the last one, and no refinement once its window passes', async () => {
    const res = await getDashboard(ctx('ada', zonedInstant('2027-01-15', 9)), sources())
    expect(res.deadline).toMatchObject({ deadline: null, refinement: null })
  })

  it('includes the status options (with colors), or [] when meta fails', async () => {
    const res = await getDashboard(ctx(), sources())
    expect(res.work).toMatchObject({
      statuses: expect.arrayContaining([
        { id: 'S_ip', name: 'In progress', key: 'inProgress', color: 'YELLOW' },
        { id: 'S_ab', name: 'Active Backlog (Oct 20)', key: 'activeBacklog', color: 'BLUE' },
      ]),
    })

    clearDashboardCache()
    const failed = await getDashboard(
      ctx(),
      sources({
        projectMeta: vi.fn(async () => {
          throw new Error('meta down')
        }),
      }),
    )
    expect(failed.work).toMatchObject({ statuses: [], counts: { open: 4 } })
  })

  it('isolates widgets: a failing source only fails its own widget', async () => {
    const res = await getDashboard(
      ctx(),
      sources({
        reviewQueue: vi.fn(async () => {
          throw new GitHubApiError('rate-limited', 403, 'secret detail')
        }),
        meetings: vi.fn(async () => {
          throw new Error('boom: internal detail')
        }),
      }),
    )
    expect(res.reviewQueue).toEqual({
      error: { code: 'rate-limited', message: expect.stringMatching(/rate limit/) },
    })
    expect(res.meetings).toEqual({ error: { code: 'internal', message: expect.any(String) } })
    expect(JSON.stringify(res)).not.toMatch(/secret detail|internal detail/)
    // Everything else still returned.
    expect(isWidgetError(res.deadline)).toBe(false)
    expect(isWidgetError(res.work)).toBe(false)
    expect(res.myPrs).toEqual([])
  })

  it('keeps the deadline when only the board or the release check fails', async () => {
    const res = await getDashboard(
      ctx(),
      sources({
        items: vi.fn(async () => {
          throw new GitHubApiError('upstream', 502)
        }),
        release: vi.fn(async () => {
          throw new GitHubApiError('rate-limited', 403)
        }),
      }),
    )
    expect(res.deadline).toMatchObject({
      deadline: { name: 'Deadline 1' },
      board: null,
      boardError: { code: 'github-unavailable' },
      release: null,
      releaseError: { code: 'rate-limited' },
    })
    expect(res.work).toMatchObject({ error: { code: 'github-unavailable' } })
  })

  it('does not cache a deadline whose board or release check failed', async () => {
    const release = vi
      .fn<DashboardSources['release']>()
      .mockRejectedValueOnce(new GitHubApiError('upstream', 502))
      .mockResolvedValue(RELEASE)
    const src = sources({ release })
    expect((await getDashboard(ctx(), src)).deadline).toMatchObject({ release: null })
    expect((await getDashboard(ctx(), src)).deadline).toMatchObject({ release: RELEASE })
  })

  it('rethrows a dead GitHub session instead of hiding it in a widget', async () => {
    const expired = new GitHubApiError('session-expired', 401)
    await expect(
      getDashboard(ctx(), sources({ myPrs: vi.fn(async () => Promise.reject(expired)) })),
    ).rejects.toBe(expired)
  })

  it('says the calendar is not connected', async () => {
    const res = await getDashboard(ctx(), sources({ meetings: vi.fn(async () => null) }))
    expect(res.meetings).toEqual({ connected: false, meetings: [] })
  })

  it('shows the next 5 meetings that have not ended, within 14 days', async () => {
    const list = [
      meeting('ended', '2026-09-30T08:00:00-04:00', '2026-09-30T09:00:00-04:00'),
      meeting('in-progress', '2026-09-30T09:30:00-04:00', '2026-09-30T10:30:00-04:00'),
      ...[1, 2, 3, 4, 5].map((d) =>
        meeting(`m${d}`, `2026-10-0${d}T17:00:00-04:00`, `2026-10-0${d}T18:00:00-04:00`),
      ),
    ]
    const meetingsSource = vi.fn(async () => list)
    const res = await getDashboard(ctx(), sources({ meetings: meetingsSource }))
    expect(meetingsSource).toHaveBeenCalledWith('2026-09-30', '2026-10-14')
    expect(res.meetings).toMatchObject({
      meetings: ['in-progress', 'm1', 'm2', 'm3', 'm4'].map((id) => ({ id })),
    })
  })
})

describe('per-user cache', () => {
  it('keeps each user’s dashboard separate and reuses it for 60 seconds', async () => {
    const reviewQueue = vi.fn(async (_token: string, _org: string, login: string) => [
      { id: `pr-for-${login}` } as ReviewQueuePr,
    ])
    const src = sources({ reviewQueue })

    const ada = await getDashboard(ctx('ada'), src)
    const grace = await getDashboard(ctx('grace'), src)
    expect(ada.me.login).toBe('ada')
    expect(grace.me.login).toBe('grace')
    expect(ada.reviewQueue).toEqual([{ id: 'pr-for-ada' }])
    expect(grace.reviewQueue).toEqual([{ id: 'pr-for-grace' }])
    expect(reviewQueue).toHaveBeenCalledTimes(2)
    // Each user's token was used for their own data only.
    expect(reviewQueue.mock.calls.map(([token]) => token)).toEqual(['token-ada', 'token-grace'])

    // Within 60s: cached per user (login is case-insensitive).
    const again = await getDashboard(ctx('ADA', new Date(NOW.getTime() + 59_000)), src)
    expect(again.reviewQueue).toEqual([{ id: 'pr-for-ada' }])
    expect(reviewQueue).toHaveBeenCalledTimes(2)

    // After 60s: refetched.
    await getDashboard(ctx('ada', new Date(NOW.getTime() + 61_000)), src)
    expect(reviewQueue).toHaveBeenCalledTimes(3)
  })

  it('does not cache a response with a failed widget', async () => {
    const myPrs = vi
      .fn<DashboardSources['myPrs']>()
      .mockRejectedValueOnce(new GitHubApiError('upstream', 502))
      .mockResolvedValue([])
    const src = sources({ myPrs })
    expect(isWidgetError((await getDashboard(ctx(), src)).myPrs)).toBe(true)
    expect((await getDashboard(ctx(), src)).myPrs).toEqual([])
  })
})

describe('groupMyWork', () => {
  it('groups my open tasks by board column, up to 5 each, most urgent first', () => {
    const tasks = [
      ...Array.from({ length: 7 }, (_, i) =>
        task({
          title: `late ${i}`,
          doneBy: `2026-09-2${i}`,
          statusKey: 'blocked',
          status: 'Blocked',
        }),
      ),
      task({ title: 'due today', doneBy: TODAY }),
      task({ title: 'no date P0', priority: 'P0' }),
      task({ title: 'in review', statusKey: 'inReview', status: 'In review' }),
      task({ title: 'up next', statusKey: 'activeBacklog', status: 'Active Backlog' }),
      task({ title: 'someday', statusKey: 'productBacklog', status: 'Product Backlog' }),
      task({ title: 'done late', doneBy: '2026-09-01', statusKey: 'done', status: 'Done' }),
      task({
        title: 'Ada caps',
        doneBy: '2026-09-29',
        assignees: [{ login: 'ADA', avatarUrl: '' }],
      }),
    ]
    const work = groupMyWork({ tasks, hiddenCount: 0 }, 'ada', TODAY)
    expect(work.counts).toEqual({
      activeBacklog: 1,
      inProgress: 3,
      inReview: 1,
      blocked: 7,
      // The 7 blocked ones and "Ada caps"; Done never counts.
      overdue: 8,
      // Everything not Done, Product Backlog included.
      open: 13,
    })
    expect(work.columns.blocked.map((t) => t.title)).toEqual([
      'late 0',
      'late 1',
      'late 2',
      'late 3',
      'late 4',
    ])
    expect(work.columns.inProgress.map((t) => t.title)).toEqual([
      'Ada caps',
      'due today',
      'no date P0',
    ])
    expect(work.columns.activeBacklog.map((t) => t.title)).toEqual(['up next'])
  })
})
