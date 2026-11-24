import type { PrMetricsRules } from '../lib/prMetrics/types'
import { DEADLINES } from './deadlines'
import { PR_SIZE } from './process'
import { members } from './team'

/**
 * The five team PR metrics are computed here, in the browser, from raw PR facts:
 * metrics/pull-requests.json on the `metrics` branch of the separate dawn-care/DAWN repo,
 * collected nightly by that repo's pr-metrics.yml workflow (which computes nothing). The repo
 * is public, so the site fetches it directly, like src/lib/drive.
 */
export const PR_METRICS_REPO = 'dawn-care/DAWN'

const PUBLISHED_URL = `https://raw.githubusercontent.com/${PR_METRICS_REPO}/metrics/metrics/pull-requests.json`

/**
 * Optional override for local testing, e.g. VITE_PR_METRICS_URL=/pull-requests.local.json
 * with a file from DAWN's .github/scripts/pr-metrics/main.mjs saved in public/ (gitignored).
 * When set, it's used even in VITE_TASKS_MOCK mode instead of the made-up sample data.
 */
export const PR_METRICS_URL_OVERRIDE: string | undefined =
  import.meta.env.VITE_PR_METRICS_URL || undefined

export const PR_METRICS_URL = PR_METRICS_URL_OVERRIDE ?? PUBLISHED_URL

/**
 * Every rule the PR metrics use. Iterations are the team's deadlines (src/config/deadlines.ts,
 * shared with the dashboard); size limits and exclusions come from src/config/process.ts.
 * Definitions: the "Metrics and measurements" section of the Development Methodology doc.
 */
export const PR_METRICS_RULES: PrMetricsRules = {
  iterations: DEADLINES.map(({ name, start, end }) => ({ name, start, end })),
  /** Only PRs authored by these logins count (src/config/team.ts). */
  team: members.flatMap((m) => (m.login ? [m.login] : [])),
  /** Focus-area experts per label. */
  focusOwners: {
    Caregiver: ['AJBruno23'],
    Carepartner: ['saltyypanda'],
    'Staff Member': ['ha4716'],
    Frontend: ['saltyypanda', 'ha4716'],
    'UI/UX': ['AJBruno23', 'ha4716'],
    Server: ['jmd9268'],
    Cloud: ['ashton-michelstein'],
    Security: ['dgh4572'],
  },
  /** The six focus areas Breadth of Knowledge counts. */
  breadthLabels: ['Caregiver', 'Carepartner', 'Staff Member', 'Frontend', 'UI/UX', 'Server'],
  /** Files left out of PR Size: docs, tests, lockfiles, generated docs and images. */
  sizeExclude: [...PR_SIZE.exclude],
  targets: {
    size: { maxLines: PR_SIZE.maxLines, maxFiles: PR_SIZE.maxFiles, share: 0.9 },
    speed: { firstReviewHours: 24, mergeHours: 48, share: 0.9 },
    balance: { minFactor: 0.4, maxFactor: 1.6 },
    coverage: { share: 0.95 },
    breadth: { minLabels: 5 },
  },
}
