/**
 * The shame log: metrics/shame.json on the `metrics` branch of dawn-care/Internal-Tools,
 * written by that repo's Discord shame bot (shame-bot.yml; format in its
 * shame-bot/README.md). It holds one fact per shame and computes nothing; the
 * counting happens here, in the browser (src/lib/shame/selectors.ts). The repo is public,
 * so the site fetches it directly, like the PR metrics.
 */
export const SHAME_REPO = 'dawn-care/Internal-Tools'

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
  behemoth: 'MASSIVE BEHEMOTH PRS 🧌',
  late_night: 'NOT SLEEPING 🫩',
  slow_review: 'Late review (after 24h) (shame)',
  idle_author: 'No follow-up after a review (shame)',
  manual: 'Manual shaming',
}
