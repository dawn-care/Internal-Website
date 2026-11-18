import { Navigate, useSearchParams } from 'react-router-dom'
import PrBalanceMetric from '../components/metrics/PrBalanceMetric'
import PrBreadthMetric from '../components/metrics/PrBreadthMetric'
import PrCoverageMetric from '../components/metrics/PrCoverageMetric'
import PrIterationPicker from '../components/metrics/PrIterationPicker'
import PrSizeMetric from '../components/metrics/PrSizeMetric'
import PrSpeedMetric from '../components/metrics/PrSpeedMetric'
import PrSummaryMetric from '../components/metrics/PrSummaryMetric'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import { useAuth } from '../lib/auth'

const SIGN_IN = `/tasks?returnTo=${encodeURIComponent('/metrics')}`

/**
 * The team's five PR metrics per deadline iteration (signed-in only). Unlike /dashboard,
 * the cards fetch public data directly — one shared fetch, see src/lib/prMetrics.
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
  // ?iteration=<name> keeps the pick shareable; absent = the entire project.
  const [params, setParams] = useSearchParams()
  const iteration = params.get('iteration')
  const pick = (name: string | null) =>
    setParams(name ? { iteration: name } : {}, { replace: true })

  return (
    <div>
      <h1 className="text-4xl font-semibold">Metrics</h1>
      <div aria-hidden="true" className="mt-6 horizon-line w-24" />
      <div className="mt-8">
        <PrIterationPicker value={iteration} onChange={pick} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6">
        <PrSummaryMetric iteration={iteration} />
        <PrSizeMetric iteration={iteration} />
        <PrSpeedMetric iteration={iteration} />
        <PrBalanceMetric iteration={iteration} />
        <PrCoverageMetric iteration={iteration} />
        <PrBreadthMetric iteration={iteration} />
      </div>
    </div>
  )
}
