import { SHAME_URL_OVERRIDE } from '../../config/shame'
import { TASKS_MOCK } from '../../config/tasks'
import { fetchShames } from './client'
import { mockShames } from './mock'
import type { ShameFile } from './types'

/* Fetch once, cache, and use mock data with VITE_TASKS_MOCK=true (like src/lib/prMetrics). */

let request: Promise<ShameFile | null> | undefined

export function loadShames(): Promise<ShameFile | null> {
  if (!request) {
    // A URL override wins over mock data, so mock mode can preview a real file locally.
    request = TASKS_MOCK && !SHAME_URL_OVERRIDE ? Promise.resolve(mockShames()) : fetchShames()
    // Don't cache failures, so a retry actually retries.
    request.catch(() => {
      request = undefined
    })
  }
  return request
}

/** Drops the cached result; the next load hits the network again. */
export function clearShamesCache(): void {
  request = undefined
}
