import type { AuthUser } from '../auth'
import type { Meeting } from '../meetings'
import type { StatusOption, Task } from '../tasks/types'

/**
 * The /api/dashboard response, as the browser sees it. Mirrors api/_lib/dashboard.ts and
 * api/_lib/github/pulls.ts: keep them in sync.
 */

export interface WidgetError {
  error: { code: string; message: string }
}

/** A widget is its data, or { error } when its source failed on the server. */
export type Widget<T> = T | WidgetError

/** The board columns a deadline needs empty, plus Blocked. */
export type BoardColumn = 'activeBacklog' | 'inProgress' | 'inReview' | 'blocked'

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  'activeBacklog',
  'inProgress',
  'inReview',
  'blocked',
]

export interface DeadlineSummary {
  name: string
  /** Inclusive, "YYYY-MM-DD". */
  start: string
  end: string
  /** True when today is inside it; false when it hasn't started yet. */
  active: boolean
  /** Business days left, today included. */
  daysLeft: number
}

export interface DeadlineWidget {
  /** Null when no deadline is configured from today on. */
  deadline: DeadlineSummary | null
  /** The deadline that just ended, while its backlog refinement is due. */
  refinement: { after: string; by: string } | null
  board: {
    counts: Record<BoardColumn, number>
    /** The board's own column names ("Active Backlog (DEADLINE 12-16-26)"): only checked against the configured deadline date, never shown. */
    names: Partial<Record<BoardColumn, string>>
    projectUrl: string
  } | null
  boardError: WidgetError['error'] | null
  release: ReleaseStatus | null
  releaseError: WidgetError['error'] | null
}

/** My open tasks by board column, up to 5 per column. */
export interface MyWork {
  columns: Record<BoardColumn, Task[]>
  counts: Record<BoardColumn, number> & { overdue: number; open: number }
  hiddenCount: number
  /** Status options with colors; [] when the project meta couldn't be read. */
  statuses: StatusOption[]
}

export interface MeetingsWidget {
  connected: boolean
  /** The next 5 meetings, not yet ended. */
  meetings: Meeting[]
}

export type CiState = 'SUCCESS' | 'FAILURE' | 'PENDING'

export interface PrReview {
  author: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  submittedAt: string | null
}

export interface DashboardPr {
  id: string
  title: string
  url: string
  /** "owner/name". */
  repo: string
  number: number
  author: string | null
  authorAvatarUrl: string | null
  isDraft: boolean
  createdAt: string
  baseRefName: string
  headRefName: string
  requestedReviewers: string[]
  reviews: PrReview[]
  /** Distinct reviewers, requested or already reviewed (never the author). */
  reviewerCount: number
  /** Latest reviews that approve (never the author's). */
  approvals: number
  /** 1 for feature → canary, 2 for canary → main. */
  requiredApprovals: number
  /** canary → main. */
  isRelease: boolean
  /** Null when the head commit has no checks. */
  ciState: CiState | null
  /** Feature → canary, canary → main. */
  targetsCorrectBase: boolean
  /** "Closes #121", else the branch's issue number (labels unknown); null if neither. */
  ticket: { number: number; linked: boolean; labels: string[] | null } | null
  /** The ticket's labels are known and include no focus-area label. */
  missingFocusLabel: boolean
  /** Counted like the PR Size metric. */
  size: { lines: number; files: number; over: boolean }
  /** It changes the UI, so it needs a photo or video. */
  needsMedia: boolean
  hasMedia: boolean
}

export interface ReviewQueuePr extends DashboardPr {
  /** When my review was requested. */
  waitingSince: string
  isPastSla: boolean
}

export interface MyPr extends DashboardPr {
  changesRequested: number
}

/** A canary → main merge, open or merged. */
export interface ReleasePr {
  title: string
  url: string
  repo: string
  number: number
  isDraft: boolean
  approvals: number
  requiredApprovals: number
  ciState: CiState | null
  /** Null while open. */
  mergedAt: string | null
}

export interface ReleaseStatus {
  open: ReleasePr[]
  /** Merged since the deadline started, newest first. */
  merged: ReleasePr[]
}

export interface DashboardResponse {
  me: AuthUser
  deadline: Widget<DeadlineWidget>
  work: Widget<MyWork>
  reviewQueue: Widget<ReviewQueuePr[]>
  myPrs: Widget<MyPr[]>
  meetings: Widget<MeetingsWidget>
  /** ISO instant the server built this response. */
  generatedAt: string
}

export function isWidgetError(value: unknown): value is WidgetError {
  return typeof value === 'object' && value !== null && 'error' in value
}
