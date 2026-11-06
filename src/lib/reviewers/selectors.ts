import type { ReviewerCount, ReviewerMetrics } from './types'

/**
 * Every login from either window, merged and sorted by trailing-window count first (the
 * current review load is the more actionable number for spotting imbalance), then
 * all-time count, then login.
 */
export function rankReviewers(metrics: ReviewerMetrics): ReviewerCount[] {
  const logins = new Set([...Object.keys(metrics.allTime), ...Object.keys(metrics.trailingWindow)])
  const rows: ReviewerCount[] = [...logins].map((login) => ({
    login,
    allTime: metrics.allTime[login] ?? 0,
    trailingWindow: metrics.trailingWindow[login] ?? 0,
  }))
  return rows.sort(
    (a, b) =>
      b.trailingWindow - a.trailingWindow || b.allTime - a.allTime || a.login.localeCompare(b.login),
  )
}
