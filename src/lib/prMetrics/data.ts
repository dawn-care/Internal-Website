import { PR_METRICS_URL_OVERRIDE } from '../../config/prMetrics'
import { TASKS_MOCK } from '../../config/tasks'
import { fetchPrMetrics } from './client'
import { mockPrMetrics } from './mock'
import type { PrMetricsFile } from './types'

/*
 * Public data, like src/lib/drive: fetch once, cache, and serve mock data instead of the
 * network when running locally with VITE_TASKS_MOCK=true. All six PR widgets share it.
 */

let request: Promise<PrMetricsFile | null> | undefined

/** Fetches metrics/pr-metrics.json once and caches it. */
export function loadPrMetrics(): Promise<PrMetricsFile | null> {
  if (!request) {
    // A URL override wins over mock data, so mock mode can preview a real file locally.
    request =
      TASKS_MOCK && !PR_METRICS_URL_OVERRIDE ? Promise.resolve(mockPrMetrics()) : fetchPrMetrics()
    // Don't cache failures, so a retry actually retries.
    request.catch(() => {
      request = undefined
    })
  }
  return request
}

/** Drops the cached result; the next load hits the network again. */
export function clearPrMetricsCache(): void {
  request = undefined
}
