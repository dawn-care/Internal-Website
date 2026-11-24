import { deadlinePosition } from '../../src/lib/deadlines.js'
import { businessDaysInclusive } from '../../src/lib/businessTime.js'
import { isUpcoming, meetingStart } from '../../src/lib/meetingTime.js'
import { DEADLINE_STATUSES, type StatusKey } from './config.js'
import { addDays, todayKey } from './dates.js'
import { ConfigError } from './env.js'
import { CalendarError, listMeetings, type Meeting } from './google/calendar.js'
import { GitHubApiError, ProjectSetupError, toClientError } from './github/errors.js'
import {
  getProjectMeta,
  listItems,
  toClientMeta,
  type ItemList,
  type ProjectMeta,
} from './github/project.js'
import {
  listMyPrs,
  listReleaseStatus,
  listReviewQueue,
  type MyPr,
  type ReleaseStatus,
  type ReviewQueuePr,
} from './github/pulls.js'
import type { StatusOption, Task } from './github/types.js'
import type { SessionUser } from './session.js'

/*
 * GET /api/dashboard: every widget's data in one response. Each widget is computed on its
 * own: if one source fails, that widget becomes { error } and the others still return.
 * Responses are cached per user (by login) for 60 seconds, never shared across users.
 * The widgets follow the Development Methodology's deadline-based iterations.
 */

export interface WidgetError {
  error: { code: string; message: string }
}

/** A widget is its data, or { error } when its source failed. */
export type Widget<T> = T | WidgetError

/** The board columns a deadline needs empty, plus Blocked (always worth seeing). */
export type BoardColumn = 'activeBacklog' | 'inProgress' | 'inReview' | 'blocked'

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  ...(DEADLINE_STATUSES as BoardColumn[]),
  'blocked',
]

export interface DeadlineSummary {
  name: string
  /** Inclusive, "YYYY-MM-DD". */
  start: string
  end: string
  /** True when today is inside it; false when it hasn't started yet. */
  active: boolean
  /** Business days left, today included (0 once it's over). */
  daysLeft: number
}

/**
 * The next (or current) deadline and how close the board is to it. Development Methodology:
 * by the deadline, Active Backlog, In Progress and In Review are empty and canary is merged
 * into main; backlog refinement follows within two days.
 */
export interface DeadlineWidget {
  /** Null when no deadline is configured from today on (src/config/deadlines.ts). */
  deadline: DeadlineSummary | null
  /** The deadline that just ended, while its backlog refinement is due. */
  refinement: { after: string; by: string } | null
  /** Team-wide counts per column; null when the board couldn't be read (see boardError). */
  board: {
    counts: Record<BoardColumn, number>
    /** The board's own column names ("Active Backlog (DEADLINE 12-16-26)"), when present. The UI shows its own labels and only reads these to spot a deadline date that disagrees with src/config/deadlines.ts. */
    names: Partial<Record<BoardColumn, string>>
    projectUrl: string
  } | null
  boardError: WidgetError['error'] | null
  /** canary → main for this deadline; null when it couldn't be read (see releaseError). */
  release: ReleaseStatus | null
  releaseError: WidgetError['error'] | null
}

/** My open tasks by board column. Up to 5 per column, most urgent first. */
export interface MyWork {
  columns: Record<BoardColumn, Task[]>
  counts: Record<BoardColumn, number> & {
    /** Estimated done date before today, not Done (any column). */
    overdue: number
    /** Everything assigned to me that isn't Done (Product Backlog included). */
    open: number
  }
  /** Project items GitHub hid from this user. */
  hiddenCount: number
  /** The project's status options (with colors) for badges and "Mark done"; [] if unknown. */
  statuses: StatusOption[]
}

export interface MeetingsWidget {
  /** False when the calendar isn't set up on this deployment. */
  connected: boolean
  /** The next 5 meetings (now through +14 days), not yet ended. Agendas are joined on the client. */
  meetings: Meeting[]
}

/** Mirrored for the browser with the dashboard UI. */
export interface DashboardResponse {
  me: SessionUser
  deadline: Widget<DeadlineWidget>
  work: Widget<MyWork>
  reviewQueue: Widget<ReviewQueuePr[]>
  myPrs: Widget<MyPr[]>
  meetings: Widget<MeetingsWidget>
  generatedAt: string
}

/** Where each widget's data comes from. Swappable in tests. */
export interface DashboardSources {
  projectMeta(token: string): Promise<ProjectMeta>
  items(token: string): Promise<ItemList>
  reviewQueue(token: string, org: string, login: string, now: Date): Promise<ReviewQueuePr[]>
  myPrs(token: string, org: string): Promise<MyPr[]>
  release(token: string, org: string, sinceKey: string): Promise<ReleaseStatus>
  meetings(fromKey: string, throughKey: string): Promise<Meeting[] | null>
}

export const defaultSources: DashboardSources = {
  projectMeta: getProjectMeta,
  items: listItems,
  reviewQueue: listReviewQueue,
  myPrs: listMyPrs,
  release: listReleaseStatus,
  meetings: listMeetings,
}

export interface DashboardContext {
  token: string
  user: SessionUser
  org: string
  now: Date
}

export const WIDGET_LIMIT = 5
export const MEETINGS_LIMIT = 5
export const MEETINGS_WINDOW_DAYS = 14
const CACHE_MS = 60_000
const MAX_CACHED_USERS = 100

// ─── Widgets ─────────────────────────────────────────────────────────────────

/** A contained failure inside a widget (the rest of it still shows). */
function partError(err: unknown): WidgetError['error'] {
  if (err instanceof GitHubApiError && err.kind === 'session-expired') throw err
  return toWidgetError(err).error
}

const emptyCounts = (): Record<BoardColumn, number> => ({
  activeBacklog: 0,
  inProgress: 0,
  inReview: 0,
  blocked: 0,
})

function isColumn(key: StatusKey | null): key is BoardColumn {
  return key !== null && (BOARD_COLUMNS as readonly string[]).includes(key)
}

export async function deadlineWidget(
  ctx: DashboardContext,
  sources: DashboardSources,
  meta: Promise<ProjectMeta>,
  items: Promise<ItemList>,
): Promise<DeadlineWidget> {
  const today = todayKey(ctx.now)
  const position = deadlinePosition(today)
  const deadline: DeadlineSummary | null = position.deadline && {
    ...position.deadline,
    active: position.active,
    daysLeft:
      position.deadline.end < today ? 0 : businessDaysInclusive(today, position.deadline.end),
  }

  const boardPromise = Promise.all([meta, items]).then(([m, list]) => {
    const counts = emptyCounts()
    for (const task of list.tasks) if (isColumn(task.statusKey)) counts[task.statusKey] += 1
    const names: Partial<Record<BoardColumn, string>> = {}
    for (const option of toClientMeta(m).statuses) {
      if (isColumn(option.key) && !names[option.key]) names[option.key] = option.name
    }
    return { counts, names, projectUrl: m.projectUrl }
  })
  // The release is checked from the current deadline's start (or, between deadlines, the
  // last one's, so its merge still shows).
  const since = position.active
    ? position.deadline!.start
    : (position.justEnded?.start ?? addDays(today, -14))
  const releasePromise = sources.release(ctx.token, ctx.org, since)

  const [board, release] = await Promise.allSettled([boardPromise, releasePromise])
  return {
    deadline,
    refinement: position.justEnded
      ? { after: position.justEnded.name, by: position.justEnded.refinementBy }
      : null,
    board: board.status === 'fulfilled' ? board.value : null,
    boardError: board.status === 'rejected' ? partError(board.reason) : null,
    release: release.status === 'fulfilled' ? release.value : null,
    releaseError: release.status === 'rejected' ? partError(release.reason) : null,
  }
}

const PRIORITY_LAST = '￿'

/** Soonest Done-by first (none last), then priority (P0 first), then title. */
function byUrgency(a: Task, b: Task): number {
  return (
    (a.doneBy ?? PRIORITY_LAST).localeCompare(b.doneBy ?? PRIORITY_LAST) ||
    (a.priority ?? PRIORITY_LAST).localeCompare(b.priority ?? PRIORITY_LAST) ||
    a.title.localeCompare(b.title)
  )
}

export function groupMyWork(
  list: ItemList,
  login: string,
  today: string,
  statuses: StatusOption[] = [],
): MyWork {
  const mine = list.tasks.filter(
    (t) =>
      t.statusKey !== 'done' &&
      t.assignees.some((a) => a.login.toLowerCase() === login.toLowerCase()),
  )
  const columns = {} as Record<BoardColumn, Task[]>
  const counts = { ...emptyCounts(), overdue: 0, open: mine.length }
  for (const column of BOARD_COLUMNS) {
    const tasks = mine.filter((t) => t.statusKey === column)
    columns[column] = [...tasks].sort(byUrgency).slice(0, WIDGET_LIMIT)
    counts[column] = tasks.length
  }
  counts.overdue = mine.filter((t) => t.doneBy !== undefined && t.doneBy < today).length
  return { columns, counts, hiddenCount: list.hiddenCount, statuses }
}

async function workWidget(
  ctx: DashboardContext,
  meta: Promise<ProjectMeta>,
  items: Promise<ItemList>,
): Promise<MyWork> {
  // Statuses only color the badges and power "Mark done": a meta failure doesn't sink the list.
  const statuses = await meta.then((m) => toClientMeta(m).statuses).catch(() => [])
  return groupMyWork(await items, ctx.user.login, todayKey(ctx.now), statuses)
}

async function meetingsWidget(
  ctx: DashboardContext,
  sources: DashboardSources,
): Promise<MeetingsWidget> {
  const today = todayKey(ctx.now)
  // Whole days, so every user's dashboard shares the calendar's per-range cache.
  const all = await sources.meetings(today, addDays(today, MEETINGS_WINDOW_DAYS))
  if (all === null) return { connected: false, meetings: [] }
  const until = ctx.now.getTime() + MEETINGS_WINDOW_DAYS * 86_400_000
  const meetings = all
    .filter((m) => isUpcoming(m, ctx.now) && meetingStart(m).getTime() <= until)
    .slice(0, MEETINGS_LIMIT)
  return { connected: true, meetings }
}

// ─── Assembly ────────────────────────────────────────────────────────────────

/** A failure as a widget's { error }: safe, client-facing codes and messages only. */
export function toWidgetError(err: unknown): WidgetError {
  if (err instanceof GitHubApiError) {
    console.error(`[dashboard] github ${err.kind} (${err.status}) ${err.detail}`)
    const { code, message } = toClientError(err)
    return { error: { code, message } }
  }
  if (err instanceof CalendarError) {
    console.error(`[dashboard] calendar ${err.code} (${err.status}) ${err.detail}`)
    return { error: { code: err.code, message: err.message } }
  }
  if (err instanceof ProjectSetupError) {
    return { error: { code: 'project-misconfigured', message: err.message } }
  }
  if (err instanceof ConfigError) {
    console.error(err.message)
    return { error: { code: 'server-misconfigured', message: err.message } }
  }
  console.error('[dashboard]', err)
  return { error: { code: 'internal', message: "This couldn't be loaded right now." } }
}

export function isWidgetError(value: unknown): value is WidgetError {
  return typeof value === 'object' && value !== null && 'error' in value
}

/**
 * Builds every widget independently. A dead GitHub session is the one failure that isn't
 * contained: it's rethrown so the route answers 401 and clears the cookie.
 */
export async function buildDashboard(
  ctx: DashboardContext,
  sources: DashboardSources = defaultSources,
): Promise<DashboardResponse> {
  // Shared by the deadline and work widgets; each is fetched once.
  const meta = sources.projectMeta(ctx.token)
  const items = sources.items(ctx.token)
  meta.catch(() => {})
  items.catch(() => {})

  const settled = await Promise.allSettled([
    deadlineWidget(ctx, sources, meta, items),
    workWidget(ctx, meta, items),
    sources.reviewQueue(ctx.token, ctx.org, ctx.user.login, ctx.now),
    sources.myPrs(ctx.token, ctx.org),
    meetingsWidget(ctx, sources),
  ] as const)

  for (const result of settled) {
    if (
      result.status === 'rejected' &&
      result.reason instanceof GitHubApiError &&
      result.reason.kind === 'session-expired'
    ) {
      throw result.reason
    }
  }
  const value = <T>(result: PromiseSettledResult<T>): Widget<T> =>
    result.status === 'fulfilled' ? result.value : toWidgetError(result.reason)
  const [deadline, work, reviewQueue, myPrs, meetings] = settled

  return {
    me: ctx.user,
    deadline: value(deadline),
    work: value(work),
    reviewQueue: value(reviewQueue),
    myPrs: value(myPrs),
    meetings: value(meetings),
    generatedAt: ctx.now.toISOString(),
  }
}

const cache = new Map<string, { expires: number; response: DashboardResponse }>()

/** For tests. */
export function clearDashboardCache(): void {
  cache.clear()
}

/**
 * The dashboard for ctx.user, from the per-user cache when it's under 60 seconds old. Only
 * complete responses (no widget errors) are cached, so a retry after a failure refetches.
 */
export async function getDashboard(
  ctx: DashboardContext,
  sources: DashboardSources = defaultSources,
): Promise<DashboardResponse> {
  const key = ctx.user.login.toLowerCase()
  const hit = cache.get(key)
  if (hit && hit.expires > ctx.now.getTime()) return hit.response

  const response = await buildDashboard(ctx, sources)
  const widgets = [
    response.deadline,
    response.work,
    response.reviewQueue,
    response.myPrs,
    response.meetings,
  ]
  const partial =
    !isWidgetError(response.deadline) &&
    (response.deadline.boardError !== null || response.deadline.releaseError !== null)
  if (!widgets.some(isWidgetError) && !partial) {
    cache.delete(key)
    cache.set(key, { expires: ctx.now.getTime() + CACHE_MS, response })
    if (cache.size > MAX_CACHED_USERS) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
  }
  return response
}
