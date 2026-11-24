import { RotateCw } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { AuthUser } from '../../lib/auth'
import {
  firstName,
  greeting,
  isAllCaughtUp,
  updatedAgo,
  waitingCounts,
  type DashboardQuery,
} from '../../lib/dashboard'
import Skeleton from '../Skeleton'
import SunArc from '../SunArc'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Jump to a widget and move focus to it, so keyboard and screen reader users land there too. */
function focusWidget(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  e.preventDefault()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
  history.replaceState(null, '', `#${id}`)
}

interface DashboardHeaderProps {
  user: AuthUser
  query: DashboardQuery
  now: Date
}

export default function DashboardHeader({ user, query, now }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-4xl font-semibold">
          {greeting(now)}, {firstName(user)}
        </h1>
        <div aria-hidden="true" className="mt-5 horizon-line w-24" />
        <div className="mt-5 min-h-8">
          <WaitingOnYou query={query} />
        </div>
      </div>
      <RefreshControl query={query} now={now} />
    </header>
  )
}

function WaitingOnYou({ query }: { query: DashboardQuery }) {
  if (query.loading) return <Skeleton className="h-6 w-80 max-w-full" />
  if (!query.data) return null

  const counts = waitingCounts(query.data)
  if (isAllCaughtUp(counts)) {
    return (
      <p className="flex items-center gap-2 text-lg text-ink-muted">
        <SunArc className="h-4 w-8" />
        You&apos;re all caught up.
      </p>
    )
  }

  const items = [
    { n: counts.reviews, text: (n: number) => `${plural(n, 'review')} waiting`, id: 'reviews' },
    { n: counts.overdue, text: (n: number) => `${plural(n, 'overdue task')}`, id: 'my-work' },
    { n: counts.blocked, text: (n: number) => `${plural(n, 'blocked task')}`, id: 'my-work' },
    {
      n: counts.prFixes,
      text: (n: number) => `${plural(n, 'PR')} to fix up`,
      id: 'my-prs',
    },
    {
      n: counts.failingCi,
      text: (n: number) => `${plural(n, 'PR')} with failing CI`,
      id: 'my-prs',
    },
  ].filter((item): item is typeof item & { n: number } => item.n !== null && item.n > 0)
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="font-medium" id="waiting-on-you">
        Waiting on you:
      </p>
      <ul aria-labelledby="waiting-on-you" className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.text(item.n)}>
            <a
              href={`#${item.id}`}
              onClick={(e) => focusWidget(e, item.id)}
              className="shadow-card inline-flex rounded-full bg-surface px-3 py-1 text-sm font-medium text-link underline decoration-link/30 underline-offset-4 hover:decoration-link"
            >
              {item.text(item.n)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RefreshControl({ query, now }: { query: DashboardQuery; now: Date }) {
  const refreshing = query.fetching && !query.loading
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        {query.fetchedAt > 0 && <span>Updated {updatedAgo(query.fetchedAt, now.getTime())}</span>}
        <button
          type="button"
          onClick={query.refetch}
          disabled={query.fetching}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium text-ink transition-colors hover:border-link hover:text-link disabled:cursor-wait disabled:opacity-60"
        >
          <RotateCw
            aria-hidden="true"
            className={`size-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p aria-live="polite" className="text-sm">
        {query.refreshError && (
          <span className="text-link">Couldn&apos;t refresh: {query.refreshError.message}</span>
        )}
        <span className="sr-only">{refreshing ? 'Refreshing the dashboard' : ''}</span>
      </p>
    </div>
  )
}
