import { Navigate } from 'react-router-dom'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import DeadlineCard from '../components/dashboard/DeadlineCard'
import MeetingsWidget from '../components/dashboard/MeetingsWidget'
import MyMetricsWidget from '../components/dashboard/MyMetricsWidget'
import MyPrsWidget from '../components/dashboard/MyPrsWidget'
import MyWorkWidget from '../components/dashboard/MyWorkWidget'
import ReviewQueueWidget from '../components/dashboard/ReviewQueueWidget'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import PreviewBanner from '../components/tasks/PreviewBanner'
import { useAuth, type AuthUser } from '../lib/auth'
import { useDashboard } from '../lib/dashboard'
import { useNow } from '../lib/useNow'

/** Where signed-out visitors go: the Tasks sign-in panel, returning here afterwards. */
const SIGN_IN = `/tasks?returnTo=${encodeURIComponent('/dashboard')}`

/** The developer dashboard (signed-in only). */
export default function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Page>
        <LoadingState>
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="mt-6 h-6 w-64" />
        </LoadingState>
      </Page>
    )
  }
  if (!user) return <Navigate to={SIGN_IN} replace />
  return (
    <Page>
      <SignedInDashboard user={user} />
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <PageTitle title="Dashboard" />
      {children}
    </div>
  )
}

function SignedInDashboard({ user }: { user: AuthUser }) {
  const query = useDashboard()
  const now = useNow()

  return (
    <div className="space-y-8">
      <PreviewBanner />
      <DashboardHeader user={user} query={query} now={now} />
      {query.error ? (
        <div className="shadow-card rounded-2xl bg-surface p-6">
          <ErrorState message={query.error.message} onRetry={query.refetch} />
        </div>
      ) : (
        // Two columns on large screens. The DOM order is the phone order: deadline, my work,
        // meetings, reviews, my PRs, my PR metrics.
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="grid gap-6">
            <DeadlineCard query={query} now={now} />
            <MyWorkWidget query={query} now={now} />
          </div>
          <div className="grid gap-6">
            <MeetingsWidget query={query} now={now} />
            <ReviewQueueWidget query={query} now={now} />
            <MyPrsWidget query={query} />
            <MyMetricsWidget login={user.login} />
          </div>
        </div>
      )}
    </div>
  )
}
