import { Navigate } from 'react-router-dom'
import ReviewsMetric from '../components/metrics/ReviewsMetric'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import { useAuth } from '../lib/auth'

const SIGN_IN = `/tasks?returnTo=${encodeURIComponent('/metrics')}`

/**
 * Small, independent team metrics, one widget per card (signed-in only). Unlike
 * /dashboard, each widget fetches its own public data directly — see src/lib/reviewers.
 */
export default function Metrics() {
  const { user, loading } = useAuth()
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <PageTitle title="Metrics" />
      {loading ? (
        <LoadingState>
          <Skeleton className="h-10 w-56" />
        </LoadingState>
      ) : user ? (
        <SignedInMetrics />
      ) : (
        <Navigate to={SIGN_IN} replace />
      )}
    </div>
  )
}

function SignedInMetrics() {
  return (
    <div>
      <h1 className="text-4xl font-semibold">Metrics</h1>
      <p className="mt-3 max-w-prose text-ink-muted">How the team&apos;s doing, at a glance.</p>
      <div aria-hidden="true" className="mt-6 horizon-line w-24" />
      <div className="mt-8 grid gap-6">
        <ReviewsMetric />
      </div>
    </div>
  )
}
