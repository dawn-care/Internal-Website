import { REVIEWER_METRICS_URL, REVIEWS_REPO } from '../../config/reviewers'
import type { ReviewerMetrics } from './types'

export class ReviewerMetricsError extends Error {
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ReviewerMetricsError'
    this.status = status
  }
}

/**
 * Fetches metrics/reviewers.json from the metrics branch of dawn-care/DAWN (public, no
 * auth needed). Null means the nightly workflow hasn't generated the file yet — a 404,
 * not an error.
 */
export async function fetchReviewerMetrics(
  url = REVIEWER_METRICS_URL,
): Promise<ReviewerMetrics | null> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new ReviewerMetricsError("Couldn't reach GitHub. Check your connection.", 0)
  }
  if (res.status === 404) return null
  if (!res.ok) {
    throw new ReviewerMetricsError(`Request failed (${res.status}): ${res.statusText}`, res.status)
  }
  return (await res.json()) as ReviewerMetrics
}

/** Where a reviewer's name links: their merged-PR review history on GitHub. */
export function reviewerPullsUrl(login: string): string {
  const query = `is:pr is:merged reviewed-by:${login}`
  return `https://github.com/${REVIEWS_REPO}/pulls?q=${encodeURIComponent(query)}`
}
