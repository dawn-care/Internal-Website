import { Navigate } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import RecentShames from '../components/shame/RecentShames'
import ShameByCategory from '../components/shame/ShameByCategory'
import ShameByPerson from '../components/shame/ShameByPerson'
import ShameOverTime from '../components/shame/ShameOverTime'
import Skeleton from '../components/Skeleton'
import { useAuth } from '../lib/auth'

const SIGN_IN = `/tasks?returnTo=${encodeURIComponent('/shame')}`

/**
 * The shame board (signed-in only, like /metrics): who gets shamed for what, from the
 * DAWN shame bot's log. The cards share one public fetch, see src/lib/shame.
 */
export default function Shame() {
  const { user, loading } = useAuth()
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <PageTitle title="Shame" />
      {loading ? (
        <LoadingState>
          <Skeleton className="h-10 w-56" />
        </LoadingState>
      ) : user ? (
        <div>
          <h1 className="text-4xl font-semibold">Shame</h1>
          <div aria-hidden="true" className="mt-6 horizon-line w-24" />
          <p className="mt-6 max-w-2xl text-ink-muted">
            EVERYONE HERE sHOULD BE ASHAMED 🙂‍↔️🙂‍↔️🙂‍↔️🙂‍↔️🙂‍↔️
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6">
            <ShameByCategory />
            <ShameByPerson />
            <ShameOverTime />
            <RecentShames />
          </div>
        </div>
      ) : (
        <Navigate to={SIGN_IN} replace />
      )}
    </div>
  )
}
