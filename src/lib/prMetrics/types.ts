// ---- Raw input: metrics/pull-requests.json from dawn-care/DAWN ----

/**
 * metrics/pull-requests.json on the `metrics` branch of dawn-care/DAWN (schemaVersion 1):
 * raw facts about every merged PR, collected nightly by DAWN's pr-metrics.yml. Nothing in it
 * is filtered or computed; ./compute.ts applies PR_METRICS_RULES (src/config/prMetrics.ts).
 */
export interface PullRequestsFile {
  schemaVersion: 1
  /** ISO 8601 timestamp of the workflow run that produced this file. */
  generatedAt: string
  /** "dawn-care/DAWN" */
  repo: string
  pullRequests: RawPullRequest[]
}

export interface RawPullRequest {
  number: number
  title: string
  url: string
  /** null for a deleted account. */
  author: string | null
  /** GitHub's account type: "User", "Bot", … */
  authorType: string | null
  base: string
  head: string
  createdAt: string
  /** The last ready-for-review event; null if the PR was never a draft. */
  readyAt: string | null
  mergedAt: string
  /** The PR's own labels. */
  labels: string[]
  /** Linked issues, with their labels. */
  closingIssues: { number: number; labels: string[] }[]
  /** With no linked issue, the issue the branch name starts with ("481-…"), else null. */
  branchIssue: { number: number; labels: string[] } | null
  /** Every submitted review, any state, bots and self-reviews included. */
  reviews: {
    author: string | null
    authorType: string | null
    state: string
    submittedAt: string | null
  }[]
  /** Every changed file, tests and lockfiles included. */
  files: { path: string; additions: number; deletions: number }[]
}

// ---- Rules: src/config/prMetrics.ts ----

export interface PrMetricsRules {
  iterations: { name: string; start: string; end: string }[]
  /** Team logins in display order; only PRs they authored count. */
  team: string[]
  /** Label → logins of its focus-area experts. */
  focusOwners: Record<string, string[]>
  /** The labels Breadth of Knowledge counts, in display order. */
  breadthLabels: string[]
  /** Changed files matching any of these don't count toward PR Size. */
  sizeExclude: RegExp[]
  targets: PrMetricsTargets
}

// ---- Computed: what the widgets read ----

/**
 * The PR metrics, computed in the browser by ./compute.ts from the raw file and the rules.
 * Scope: merged PRs authored by a team member, except canary → main release merges, each in
 * the deadline iteration containing its merge date (America/New_York). Bots and self-reviews
 * never count as reviews. Hours are business hours (Mon–Fri, America/New_York, all 24 hours,
 * no holidays). People are keyed by GitHub login. ./mock.ts is a complete example.
 */
export interface PrMetricsFile {
  /** When DAWN's workflow collected the raw data. */
  generatedAt: string
  /** "dawn-care/DAWN" */
  repo: string
  targets: PrMetricsTargets
  /** The labels Breadth of Knowledge counts, in display order. */
  breadthLabels: string[]
  /** Label → logins of its focus-area experts. */
  focusOwners: Record<string, string[]>
  /** Team logins, in display order. Everyone appears in every per-person map. */
  team: string[]
  /** One entry per configured iteration that has started, oldest first. */
  iterations: IterationMetrics[]
}

export interface PrMetricsTargets {
  size: { maxLines: number; maxFiles: number; share: number }
  speed: { firstReviewHours: number; mergeHours: number; share: number }
  balance: { minFactor: number; maxFactor: number }
  coverage: { share: number }
  breadth: { minLabels: number }
}

export interface IterationMetrics {
  name: string
  /** Inclusive calendar dates, "YYYY-MM-DD". */
  start: string
  end: string
  /** True on the one iteration containing the run's date. */
  current: boolean
  /** PRs in scope merged in this iteration. */
  prCount: number
  size: SizeMetrics
  speed: SpeedMetrics
  balance: BalanceMetrics
  coverage: CoverageMetrics
  breadth: BreadthMetrics
}

export interface WithinTotal {
  within: number
  total: number
}

export interface SizeMetrics {
  total: number
  /** lines <= maxLines AND files <= maxFiles. */
  within: number
  overLinesOnly: number
  overFilesOnly: number
  overBoth: number
  byAuthor: Record<string, WithinTotal>
}

export interface SpeedMetrics {
  total: number
  /** PRs whose first non-author review came within firstReviewHours. */
  reviewedWithin: number
  /** PRs merged within mergeHours of becoming reviewable. */
  mergedWithin: number
}

export type BalanceFlag =
  'over-authoring' | 'under-authoring' | 'over-reviewing' | 'under-reviewing'

export interface BalancePerson {
  authored: number
  /** Distinct PRs reviewed (any state, once per PR). */
  reviewed: number
  flags: BalanceFlag[]
}

export interface BalanceMetrics {
  /** prCount ÷ team size. */
  evenShare: number
  /** minFactor × evenShare and maxFactor × evenShare (not rounded); in range is min <= n <= max. */
  min: number
  max: number
  people: Record<string, BalancePerson>
}

export interface CoverageMiss {
  number: number
  title: string
  url: string
  labels: string[]
  author: string
  reviewers: string[]
}

export interface CoverageMetrics {
  /**
   * PRs with at least one focus-area label. Each PR counts once: covered when its author or
   * any reviewer is a focus-area expert (focusOwners) for at least one of its labels.
   */
  labeled: number
  covered: number
  /** PRs with no focus-area label: not counted in coverage or breadth. */
  unlabeled: number
  misses: CoverageMiss[]
}

export interface BreadthPerson {
  /** Breadth label → PRs with that label the person authored or reviewed. */
  counts: Record<string, number>
  /** Breadth labels with a count above 0. */
  labelsCovered: number
}

export interface BreadthMetrics {
  people: Record<string, BreadthPerson>
}
