/**
 * The shame log: metrics/shame.json on the `metrics` branch of dawn-care/DAWN, written by
 * that repo's Discord shame bot (discord-shame.yml; format in its
 * .github/scripts/shame/README.md). It holds one fact per shame and computes nothing; the
 * counting happens here, in the browser (src/lib/shame/selectors.ts). The repo is public,
 * so the site fetches it directly, like the PR metrics.
 */
export const SHAME_REPO = 'dawn-care/DAWN'

const PUBLISHED_URL = `https://raw.githubusercontent.com/${SHAME_REPO}/metrics/metrics/shame.json`

/**
 * Optional override for local testing, e.g. VITE_SHAME_URL=/shame.local.json with a copy of
 * the real file saved in public/ (gitignored). Beats mock data in VITE_TASKS_MOCK mode.
 */
export const SHAME_URL_OVERRIDE: string | undefined = import.meta.env.VITE_SHAME_URL || undefined

export const SHAME_URL = SHAME_URL_OVERRIDE ?? PUBLISHED_URL

/** How many shames the "Recent shames" card lists. */
export const RECENT_SHAMES = 15

/** What caught each automatic shame, in words. `manual` is a /shame in Discord. */
export const SHAME_TYPE_LABELS: Record<string, string> = {
  behemoth: 'PR over 1000 lines',
  late_night: 'Working 1–5am',
  slow_review: 'Review overdue',
  no_reviewer: 'No reviewer requested',
  idle_author: 'No follow-up after a review',
  manual: '/shame in Discord',
}
