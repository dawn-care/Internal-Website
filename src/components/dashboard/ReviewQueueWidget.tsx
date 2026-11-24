import { GitPullRequest } from 'lucide-react'
import { isPastSla } from '../../lib/businessTime'
import {
  formatBusinessWait,
  repoRef,
  type DashboardQuery,
  type ReviewQueuePr,
} from '../../lib/dashboard'
import Avatar from '../Avatar'
import EmptyState from '../EmptyState'
import Skeleton from '../Skeleton'
import { PrChecks, PrTitleLink } from './PrBits'
import { CountBadge, WidgetBody, WidgetCard } from './Widget'

/** Past the SLA first, then the longest wait. */
function byMostOverdue(now: Date) {
  return (a: ReviewQueuePr, b: ReviewQueuePr) =>
    Number(isLate(b, now)) - Number(isLate(a, now)) || a.waitingSince.localeCompare(b.waitingSince)
}

/** Rechecked against the clock so a long-open dashboard doesn't go stale. */
const isLate = (pr: ReviewQueuePr, now: Date) =>
  pr.isPastSla || isPastSla(new Date(pr.waitingSince), now)

export default function ReviewQueueWidget({ query, now }: { query: DashboardQuery; now: Date }) {
  const queue = query.data?.reviewQueue
  const count = Array.isArray(queue) ? queue.length : undefined
  return (
    <WidgetCard
      id="reviews"
      title="Reviews waiting on me"
      icon={GitPullRequest}
      badge={count !== undefined && <CountBadge count={count} label={`${count} waiting`} />}
    >
      <WidgetBody
        query={query}
        value={queue}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
      >
        {(prs) =>
          prs.length === 0 ? (
            <EmptyState>No reviews waiting on you. Nice.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {[...prs].sort(byMostOverdue(now)).map((pr) => (
                <ReviewRow key={pr.id} pr={pr} now={now} />
              ))}
            </ul>
          )
        }
      </WidgetBody>
    </WidgetCard>
  )
}

function ReviewRow({ pr, now }: { pr: ReviewQueuePr; now: Date }) {
  const late = isLate(pr, now)
  const author = pr.author ?? 'unknown'
  return (
    <li className="flex gap-3 py-3">
      <Avatar person={{ name: author, avatarUrl: pr.authorAvatarUrl ?? '' }} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-muted">
          {repoRef(pr)} <span className="sr-only">by</span>
          <span aria-hidden="true">·</span> @{author}
        </p>
        <PrTitleLink pr={pr} />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className={late ? 'font-medium text-link' : 'text-ink-muted'}>
            waiting {formatBusinessWait(pr.waitingSince, now)}
          </span>
          {late && (
            <span className="rounded-full bg-link px-2 py-0.5 font-semibold text-surface">
              Past 24 business hours
            </span>
          )}
        </div>
        <PrChecks pr={pr} />
      </div>
    </li>
  )
}
