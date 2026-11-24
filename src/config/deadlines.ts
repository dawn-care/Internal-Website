/*
 * The team's deadline-based iterations (Development Methodology: "meaningful and tangible
 * deadlines … a hard date"). The ONE list of deadlines: the PR metrics and the dashboard's
 * Deadline card both read it. A new deadline is one new entry. Shared with /api, so keep this
 * file free of imports and browser-only code.
 */

export interface Deadline {
  name: string
  /** Inclusive calendar dates (America/New_York), "YYYY-MM-DD". */
  start: string
  end: string
}

export const DEADLINES: readonly Deadline[] = [
  { name: 'Deadline 1', start: '2026-09-27', end: '2026-10-20' },
  { name: 'Deadline 2', start: '2026-10-21', end: '2026-12-16' },
]

/** "A backlog refinement meeting will be held within the following two days." */
export const REFINEMENT_WINDOW_DAYS = 2
