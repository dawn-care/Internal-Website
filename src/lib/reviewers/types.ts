/**
 * metrics/reviewers.json on the `metrics` branch of dawn-care/DAWN. Counts are distinct
 * merged PRs reviewed, deduped per PR, with bots and self-reviews already excluded.
 */
export interface ReviewerMetrics {
  /** ISO 8601 timestamp of the workflow run that produced this file. */
  generatedAt: string
  windowDays: number
  allTime: Record<string, number>
  trailingWindow: Record<string, number>
}

/** One reviewer's counts, merged from both windows. */
export interface ReviewerCount {
  login: string
  allTime: number
  trailingWindow: number
}
