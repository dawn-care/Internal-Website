import { businessDaysInclusive, isPastSla } from '../businessTime'
import { MOCK_USER } from '../auth/mock'
import { deadlinePosition } from '../deadlines'
import { isUpcoming } from '../meetings'
import { mockMeetings } from '../meetingsMock'
import { addDaysToDateKey, zonedDateKey } from '../teamTime'
import { TasksError } from '../tasks/api'
import { isOverdue, selectMine } from '../tasks/selectors'
import type { StatusOption, Task } from '../tasks/types'
import { loadTasks, peekTasks } from '../tasks/useTasks'
import {
  BOARD_COLUMNS,
  type BoardColumn,
  type DashboardPr,
  type DashboardResponse,
  type DeadlineWidget,
  type MyPr,
  type MyWork,
  type ReviewQueuePr,
} from './types'

/*
 * Fake /api/dashboard for sample mode (VITE_TASKS_MOCK=true, or a preview deployment). Tasks
 * come from the shared sample tasks cache, so "Mark done" here shows up on /tasks too. PRs
 * cover every Development Methodology check: an overdue review, a UI change without a photo
 * or video, failing CI, an oversized PR, a PR with no ticket, a draft that targets main
 * directly, changes requested, and a canary → main release waiting on its second approval.
 */

const HOUR_MS = 3_600_000
const LIMIT = 5

function pr(fields: Partial<DashboardPr> & Pick<DashboardPr, 'id' | 'title' | 'number'>) {
  const repo = fields.repo ?? 'dawn-team/dawn-app'
  return {
    repo,
    url: `https://github.com/${repo}/pull/${fields.number}`,
    author: 'river-b',
    authorAvatarUrl: null,
    isDraft: false,
    createdAt: new Date(Date.now() - 30 * HOUR_MS).toISOString(),
    baseRefName: 'canary',
    headRefName: 'feature/sample',
    requestedReviewers: [],
    reviews: [],
    reviewerCount: 1,
    approvals: 0,
    requiredApprovals: 1,
    isRelease: false,
    ciState: 'SUCCESS',
    targetsCorrectBase: true,
    ticket: { number: 52, linked: true, labels: ['Carepartner', 'Frontend'] },
    missingFocusLabel: false,
    size: { lines: 214, files: 6, over: false },
    needsMedia: true,
    hasMedia: true,
    ...fields,
  } satisfies DashboardPr
}

function reviewQueue(now: Date): ReviewQueuePr[] {
  const queued = (fields: Parameters<typeof pr>[0], waitingHours: number): ReviewQueuePr => {
    const waitingSince = new Date(now.getTime() - waitingHours * HOUR_MS).toISOString()
    return { ...pr(fields), waitingSince, isPastSla: isPastSla(new Date(waitingSince), now) }
  }
  return [
    // Four calendar days: past the one-business-day SLA whatever today is.
    queued(
      {
        id: 'PR_mock_review1',
        title: 'Morning routine: large-type clock face',
        number: 58,
        author: 'priya-n',
        headRefName: '52-large-clock',
        requestedReviewers: [MOCK_USER.login],
      },
      96,
    ),
    queued(
      {
        id: 'PR_mock_review2',
        title: 'Read the day’s schedule aloud',
        number: 61,
        author: 'sam-k',
        headRefName: '61-tts-schedule',
        ticket: { number: 61, linked: false, labels: null },
        needsMedia: false,
        size: { lines: 1240, files: 19, over: true },
        ciState: 'PENDING',
      },
      3,
    ),
  ]
}

function myPrs(): MyPr[] {
  return [
    {
      ...pr({
        id: 'PR_mock_mine1',
        title: 'Weather card: high-contrast icons',
        number: 63,
        author: MOCK_USER.login,
        headRefName: '63-weather-contrast',
        ticket: { number: 63, linked: true, labels: ['Carepartner', 'UI/UX'] },
        hasMedia: false,
        approvals: 1,
        ciState: 'FAILURE',
      }),
      changesRequested: 0,
    },
    {
      ...pr({
        id: 'PR_mock_mine2',
        title: 'Spike: caregiver photo carousel',
        number: 64,
        author: MOCK_USER.login,
        isDraft: true,
        headRefName: 'spike/photo-carousel',
        baseRefName: 'main',
        targetsCorrectBase: false,
        ticket: null,
        ciState: null,
      }),
      changesRequested: 1,
    },
    {
      ...pr({
        id: 'PR_mock_mine3',
        title: 'Weather service: cache forecasts for an hour',
        number: 66,
        author: MOCK_USER.login,
        headRefName: '66-weather-cache',
        ticket: { number: 66, linked: true, labels: ['documentation'] },
        missingFocusLabel: true,
        needsMedia: false,
        hasMedia: false,
        approvals: 1,
      }),
      changesRequested: 0,
    },
  ]
}

function myWork(tasks: Task[], statuses: StatusOption[], now: Date): MyWork {
  const mine = selectMine(tasks, MOCK_USER.login).filter((t) => t.statusKey !== 'done')
  const byDate = (a: Task, b: Task) => (a.doneBy ?? '~').localeCompare(b.doneBy ?? '~')
  const columns = {} as Record<BoardColumn, Task[]>
  const counts = { ...emptyCounts(), overdue: 0, open: mine.length }
  for (const column of BOARD_COLUMNS) {
    const list = mine.filter((t) => t.statusKey === column)
    columns[column] = [...list].sort(byDate).slice(0, LIMIT)
    counts[column] = list.length
  }
  counts.overdue = mine.filter((t) => isOverdue(t, now)).length
  return { columns, counts, hiddenCount: 0, statuses }
}

const emptyCounts = (): Record<BoardColumn, number> => ({
  activeBacklog: 0,
  inProgress: 0,
  inReview: 0,
  blocked: 0,
})

/**
 * The real deadline from src/config/deadlines.ts when one is current or upcoming; otherwise a
 * sample one ending in two weeks, so the card always has something to show.
 */
function deadline(tasks: Task[], statuses: StatusOption[], now: Date): DeadlineWidget {
  const today = zonedDateKey(now)
  const position = deadlinePosition(today)
  const real = position.deadline
  const start = real?.start ?? addDaysToDateKey(today, -10)
  const end = real?.end ?? addDaysToDateKey(today, 13)
  const counts = emptyCounts()
  for (const t of tasks) {
    const key = t.statusKey
    if (key && (BOARD_COLUMNS as readonly string[]).includes(key)) counts[key as BoardColumn] += 1
  }
  const names: Partial<Record<BoardColumn, string>> = {}
  for (const s of statuses) {
    if (
      s.key &&
      (BOARD_COLUMNS as readonly string[]).includes(s.key) &&
      !names[s.key as BoardColumn]
    ) {
      names[s.key as BoardColumn] = s.name
    }
  }
  return {
    deadline: {
      name: real?.name ?? 'Sample deadline',
      start,
      end,
      active: real ? position.active : true,
      daysLeft: businessDaysInclusive(today, end),
    },
    refinement: position.justEnded
      ? { after: position.justEnded.name, by: position.justEnded.refinementBy }
      : null,
    board: { counts, names, projectUrl: 'https://github.com/orgs/dawn-team/projects/1' },
    boardError: null,
    release: {
      open: [
        {
          title: 'Release: canary → main',
          url: 'https://github.com/dawn-team/dawn-app/pull/65',
          repo: 'dawn-team/dawn-app',
          number: 65,
          isDraft: false,
          approvals: 1,
          requiredApprovals: 2,
          ciState: 'SUCCESS',
          mergedAt: null,
        },
      ],
      merged: [],
    },
    releaseError: null,
  }
}

export async function mockDashboard(now = new Date()): Promise<DashboardResponse> {
  await loadTasks()
  await new Promise((resolve) => setTimeout(resolve, 300))
  const data = peekTasks()
  if (!data) throw new TasksError('unknown', "The sample tasks didn't load.")
  const { meta, tasks } = data

  const today = zonedDateKey(now)
  const calendar = mockMeetings(today, addDaysToDateKey(today, 14), now)
  return {
    me: MOCK_USER,
    deadline: deadline(tasks, meta.statuses, now),
    work: myWork(tasks, meta.statuses, now),
    reviewQueue: reviewQueue(now),
    myPrs: myPrs(),
    meetings: {
      connected: true,
      meetings: calendar.meetings.filter((m) => isUpcoming(m, now)).slice(0, LIMIT),
    },
    generatedAt: now.toISOString(),
  }
}
