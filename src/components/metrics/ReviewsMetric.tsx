import { GitPullRequest } from 'lucide-react'
import { REVIEWS_REPO } from '../../config/reviewers'
import {
  formatGeneratedAt,
  rankReviewers,
  reviewerPullsUrl,
  useReviewerMetrics,
  type ReviewerMetrics,
  type ReviewerMetricsQuery,
} from '../../lib/reviewers'
import { WidgetCard } from '../dashboard/Widget'
import EmptyState from '../EmptyState'
import ErrorState from '../ErrorState'
import ExternalLinkLabel from '../ExternalLinkLabel'
import LoadingState from '../LoadingState'
import Skeleton from '../Skeleton'

/** Per-person PR review counts on DAWN, from dawn-care/DAWN's metrics branch. */
export default function ReviewsMetric() {
  const query = useReviewerMetrics()
  return (
    <WidgetCard id="reviews" title="Reviews" icon={GitPullRequest}>
      <ReviewsBody query={query} />
    </WidgetCard>
  )
}

function ReviewsBody({ query }: { query: ReviewerMetricsQuery }) {
  if (query.loading) {
    return (
      <LoadingState>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-full" />
      </LoadingState>
    )
  }
  if (query.error) {
    return <ErrorState message={query.error.message} onRetry={query.refetch} />
  }
  if (!query.data) {
    return (
      <EmptyState>
        Review metrics haven&apos;t been generated yet. They&apos;re published nightly once the
        pr-metrics workflow next runs in {REVIEWS_REPO}.
      </EmptyState>
    )
  }
  return <ReviewersTable metrics={query.data} />
}

function ReviewersTable({ metrics }: { metrics: ReviewerMetrics }) {
  const rows = rankReviewers(metrics)
  return (
    <div>
      <p className="text-sm text-ink-muted">
        Trailing {metrics.windowDays} days as of {formatGeneratedAt(metrics.generatedAt)}
      </p>
      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState>No reviews recorded in this window yet.</EmptyState>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold tracking-wider text-ink-muted uppercase">
                <th scope="col" className="py-2 pr-4">
                  Reviewer
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  All time
                </th>
                <th scope="col" className="py-2 text-right">
                  Last {metrics.windowDays} days
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.login}>
                  <th scope="row" className="py-3 pr-4 font-medium text-ink">
                    <a
                      href={reviewerPullsUrl(row.login)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-sm text-link underline-offset-4 hover:underline"
                    >
                      @{row.login}
                      <ExternalLinkLabel />
                    </a>
                  </th>
                  <td className="py-3 pr-4 text-right tabular-nums">{row.allTime}</td>
                  <td className="py-3 text-right tabular-nums">{row.trailingWindow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
