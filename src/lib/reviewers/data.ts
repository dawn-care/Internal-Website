import { TASKS_MOCK } from '../../config/tasks'
import { fetchReviewerMetrics } from './client'
import { mockReviewerMetrics } from './mock'
import type { ReviewerMetrics } from './types'

/*
 * Public data, like src/lib/drive: fetch once, cache, and serve mock data instead of the
 * network when running locally with VITE_TASKS_MOCK=true.
 */

let request: Promise<ReviewerMetrics | null> | undefined

/** Fetches metrics/reviewers.json once and caches it. */
export function loadReviewerMetrics(): Promise<ReviewerMetrics | null> {
  if (!request) {
    request = TASKS_MOCK ? Promise.resolve(mockReviewerMetrics()) : fetchReviewerMetrics()
    // Don't cache failures, so a retry actually retries.
    request.catch(() => {
      request = undefined
    })
  }
  return request
}

/** Drops the cached result; the next load hits the network again. */
export function clearReviewerMetricsCache(): void {
  request = undefined
}
