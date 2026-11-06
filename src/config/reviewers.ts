/**
 * Where per-person PR review counts come from: metrics/reviewers.json on the `metrics`
 * branch of the separate dawn-care/DAWN repo, produced nightly by
 * .github/workflows/pr-metrics.yml there (dawn-care/DAWN#475). The repo is public and the
 * metrics branch holds plain data, so the site fetches it directly, like src/lib/drive.
 */
export const REVIEWS_REPO = 'dawn-care/DAWN'

export const REVIEWER_METRICS_URL = `https://raw.githubusercontent.com/${REVIEWS_REPO}/metrics/metrics/reviewers.json`
