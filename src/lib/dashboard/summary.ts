import { isDone, isOverdue } from '../tasks/selectors'
import { meetingDateKey, meetingEnd, type Meeting } from '../meetings'
import { addDaysToDateKey, zonedDateKey } from '../teamTime'
import {
  BOARD_COLUMNS,
  isWidgetError,
  type DashboardPr,
  type DashboardResponse,
  type MyWork,
} from './types'

/*
 * The header's "Waiting on you" line. Each count is null when its widget has no data (it
 * failed to load), so the header never claims "all caught up" about something it couldn't see.
 */

export interface WaitingCounts {
  reviews: number | null
  overdue: number | null
  blocked: number | null
  failingCi: number | null
  /** My PRs that break a process rule (see prProblems). */
  prFixes: number | null
}

/**
 * A column's full count, minus the listed tasks checked off here since it loaded. The lists
 * are capped at 5, so the server's count is the truth for the rest.
 */
export function workCounts(work: MyWork, now = new Date()) {
  const counts = { ...work.counts }
  for (const column of BOARD_COLUMNS) {
    const checked = work.columns[column].filter(isDone)
    counts[column] = Math.max(0, counts[column] - checked.length)
    counts.overdue = Math.max(
      0,
      counts.overdue - checked.filter((t) => isOverdue({ ...t, statusKey: null }, now)).length,
    )
    counts.open = Math.max(0, counts.open - checked.length)
  }
  return counts
}

export function waitingCounts(data: DashboardResponse, now = new Date()): WaitingCounts {
  const work = isWidgetError(data.work) ? null : workCounts(data.work, now)
  return {
    reviews: isWidgetError(data.reviewQueue) ? null : data.reviewQueue.length,
    overdue: work?.overdue ?? null,
    blocked: work?.blocked ?? null,
    failingCi: isWidgetError(data.myPrs)
      ? null
      : data.myPrs.filter((pr) => pr.ciState === 'FAILURE').length,
    prFixes: isWidgetError(data.myPrs)
      ? null
      : data.myPrs.filter((pr) => !pr.isDraft && prProblems(pr).length > 0).length,
  }
}

/** Every count is known and zero. */
export function isAllCaughtUp(counts: WaitingCounts): boolean {
  return Object.values(counts).every((n) => n === 0)
}

/**
 * What a PR still needs under the Development Methodology, as short labels ("No photo or
 * video"). Approvals and CI aren't here: they're shown as their own status.
 */
export function prProblems(
  pr: Pick<
    DashboardPr,
    | 'isRelease'
    | 'targetsCorrectBase'
    | 'ticket'
    | 'missingFocusLabel'
    | 'size'
    | 'needsMedia'
    | 'hasMedia'
  >,
): string[] {
  const problems: string[] = []
  if (!pr.targetsCorrectBase) problems.push('Wrong base branch')
  if (!pr.isRelease && !pr.ticket) problems.push('No ticket')
  if (pr.missingFocusLabel) problems.push('Ticket has no focus-area label')
  if (!pr.isRelease && pr.size.over) problems.push('Over 750 lines or 15 files')
  if (pr.needsMedia && !pr.hasMedia) problems.push('No photo or video')
  return problems
}

/** How many days ahead the dashboard nudges about a sponsor meeting's Agenda and 4Up. */
export const PREP_DAYS_AHEAD = 1

/**
 * The next sponsor (official) meeting, today or tomorrow, that's still missing its Agenda or
 * 4Up: Monday's team meeting is for making both before Tuesday's sponsor meeting. `agenda` /
 * `fourUp` are null when that feed loaded without one, undefined when it didn't load (then it
 * says nothing about it). Meetings already over are skipped.
 */
export function meetingPrep<T extends Meeting & { agenda?: unknown; fourUp?: unknown }>(
  meetings: readonly T[],
  now = new Date(),
): { meeting: T; missing: ('Agenda' | '4Up')[] } | null {
  const last = addDaysToDateKey(zonedDateKey(now), PREP_DAYS_AHEAD)
  for (const meeting of meetings) {
    if (meeting.kind !== 'official' || meetingEnd(meeting).getTime() <= now.getTime()) continue
    if (meetingDateKey(meeting) > last) return null
    const missing: ('Agenda' | '4Up')[] = []
    if (meeting.agenda === null) missing.push('Agenda')
    if (meeting.fourUp === null) missing.push('4Up')
    return missing.length > 0 ? { meeting, missing } : null
  }
  return null
}
