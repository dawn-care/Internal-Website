import { TASKS_MOCK } from '../../config/tasks'
import { ARTIFACTS_URL, ARTIFACTS_URL_OVERRIDE, fetchArtifacts } from './client'
import { mockArtifacts } from './mock'
import type { ArtifactsResponse } from './types'

/*
 * Public data, like src/lib/drive: fetch once, cache, and serve mock data instead of the
 * network when running locally with VITE_TASKS_MOCK=true. The list, a document page and
 * the Home page's "Recently published" all share this one request.
 */

let request: Promise<ArtifactsResponse> | undefined

export function loadArtifacts(): Promise<ArtifactsResponse> {
  if (!request) {
    request =
      TASKS_MOCK && !ARTIFACTS_URL_OVERRIDE
        ? Promise.resolve(mockArtifacts())
        : fetchArtifacts(ARTIFACTS_URL_OVERRIDE ?? ARTIFACTS_URL)
    // Don't cache failures, so a retry actually retries.
    request.catch(() => {
      request = undefined
    })
  }
  return request
}

/** Drops the cached result; the next load hits the network again. */
export function clearArtifactsCache(): void {
  request = undefined
}
