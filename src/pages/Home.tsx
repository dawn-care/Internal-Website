import Hero from '../components/home/Hero'
import QuickLinks from '../components/home/QuickLinks'
import RecentlyPublished from '../components/home/RecentlyPublished'
import TeamStrip from '../components/home/TeamStrip'
import { useArtifacts } from '../lib/artifacts'
import { ABOUT, CURRENT_STATE } from '../../CONTENT'
import PageTitle from '../components/PageTitle'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * A signed-in visitor who *arrives* on / (typing the URL, a bookmark, a reload) goes to the
 * Dashboard. Only the entry page redirects, so the Home nav link still reaches Home.
 */
export default function Home() {
  const { user, loading, preview } = useAuth()
  const location = useLocation()
  // React Router gives the page a visit starts on the key "default".
  const isEntry = location.key === 'default'
  // Hold the page until we know, so signed-in visitors don't see Home flash first.
  if (isEntry && loading) return <PageTitle />
  if (isEntry && user && !preview) return <Navigate to="/dashboard" replace />
  return <HomeContent />
}

function HomeContent() {
  const artifacts = useArtifacts()

  return (
    <>
      <PageTitle />
      <Hero />
      <div className="mx-auto max-w-5xl space-y-20 px-6 py-16 sm:py-20">
        <section id="about" aria-labelledby="about-title">
          <h2 id="about-title" className="text-2xl font-semibold">
            About D.A.W.N.
          </h2>
          {/* TODO: replace with the real project overview. */}
          {ABOUT.split('\n').map((line, i) => (
            <p key={i} className="mt-4 max-w-prose text-ink-muted">
              {line}
            </p>
          ))}
          {CURRENT_STATE && <p className="mt-4 max-w-prose text-ink-muted">{CURRENT_STATE}</p>}
        </section>
        <RecentlyPublished artifacts={artifacts} />
        <QuickLinks />
        <TeamStrip />
      </div>
    </>
  )
}
