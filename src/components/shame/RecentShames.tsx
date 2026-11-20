import { History } from 'lucide-react'
import { RECENT_SHAMES, SHAME_REPO, SHAME_TYPE_LABELS } from '../../config/shame'
import { nameForLogin } from '../../config/team'
import { formatRelative } from '../../lib/dates'
import { categoryLabel, recentShames, type ShameEntry } from '../../lib/shame'
import ShameCard from './ShameCard'

const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/New_York',
})

/** The newest shames, with each /shame's reason, shamer and endorsers. */
export default function RecentShames() {
  return (
    <ShameCard id="shame-recent" title="Recent Shames" icon={History}>
      {(file) => (
        <ul className="divide-y divide-border">
          {recentShames(file, RECENT_SHAMES).map((shame, i) => (
            <li key={`${shame.at}-${i}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-ink">{nameForLogin(shame.login)}</span>
                <span className="rounded-full bg-status-gray-bg px-2 py-0.5 text-xs font-medium text-status-gray-text">
                  {categoryLabel(file, shame.category)}
                </span>
                <span className="text-ink-muted">
                  <What shame={shame} />
                </span>
                <time
                  dateTime={shame.at}
                  title={dateTime.format(new Date(shame.at))}
                  className="ml-auto text-xs text-ink-muted"
                >
                  {formatRelative(shame.at)}
                </time>
              </div>
              {shame.type === 'manual' && (
                <div className="mt-1 text-sm">
                  {shame.reason && <p className="text-ink">“{shame.reason}”</p>}
                  <p className="mt-0.5 text-ink-muted">
                    Shamed by {shame.by ? nameForLogin(shame.by) : 'someone'}
                    {shame.endorsedBy?.length ? `, endorsed by ${listNames(shame.endorsedBy)}` : ''}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </ShameCard>
  )
}

function What({ shame }: { shame: ShameEntry }) {
  const label = SHAME_TYPE_LABELS[shame.type] ?? shame.type
  if (!shame.pr) return <>{label}</>
  return (
    <>
      {label} on{' '}
      <a
        href={`https://github.com/${SHAME_REPO}/pull/${shame.pr}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-sm font-medium text-link underline-offset-4 hover:underline"
      >
        #{shame.pr}
      </a>
    </>
  )
}

function listNames(logins: string[]): string {
  const names = logins.map(nameForLogin)
  return names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
