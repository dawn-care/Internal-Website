import { PR_METRICS_RULES, PR_METRICS_URL } from '../../config/prMetrics'
import { computePrMetrics } from './compute'
import type { PrMetricsFile, PullRequestsFile } from './types'

export class PrMetricsError extends Error {
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PrMetricsError'
    this.status = status
  }
}

/** The raw-file schema this site understands. A newer file is reported, not misread. */
export const SUPPORTED_SCHEMA_VERSION = 1

/**
 * Fetches metrics/pull-requests.json from the metrics branch of dawn-care/DAWN (public, no
 * auth needed). Null means the nightly workflow hasn't generated the file yet — a 404,
 * not an error.
 */
export async function fetchPullRequests(url = PR_METRICS_URL): Promise<PullRequestsFile | null> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new PrMetricsError("Couldn't reach GitHub. Check your connection.", 0)
  }
  if (res.status === 404) return null
  if (!res.ok) {
    throw new PrMetricsError(`Request failed (${res.status}): ${res.statusText}`, res.status)
  }
  const file = (await res.json()) as PullRequestsFile
  if (file.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new PrMetricsError(
      `PR data uses schema version ${String(file.schemaVersion)}; this site reads version ${SUPPORTED_SCHEMA_VERSION}.`,
      res.status,
    )
  }
  return file
}

/** The raw PR data, fetched and computed into the five metrics with PR_METRICS_RULES. */
export async function fetchPrMetrics(url = PR_METRICS_URL): Promise<PrMetricsFile | null> {
  const raw = await fetchPullRequests(url)
  return raw ? computePrMetrics(raw, PR_METRICS_RULES, new Date()) : null
}
