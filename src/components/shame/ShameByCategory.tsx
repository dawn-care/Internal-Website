import { Tags } from 'lucide-react'
import { categoryTotals, plural, shameSummary } from '../../lib/shame'
import ShameCard from './ShameCard'

/** Shames per category across the whole team, most first. */
export default function ShameByCategory() {
  return (
    <ShameCard id="shame-categories" title="Shames by Category" icon={Tags}>
      {(file) => {
        const summary = shameSummary(file)
        const rows = categoryTotals(file)
        const max = Math.max(1, ...rows.map((r) => r.count))
        return (
          <div>
            <p className="text-sm text-ink-muted">
              {plural(summary.total, 'shame')} for {plural(summary.people, 'person', 'people')}:{' '}
              {summary.automatic} caught by the bot, {summary.manual} from /shame in Discord.
            </p>
            <ul className="mt-4 space-y-3">
              {rows.map((row) => (
                <li
                  key={row.category}
                  className="grid grid-cols-[minmax(7rem,10rem)_1fr_2.5rem] items-center gap-3 text-sm"
                >
                  <span className="font-medium text-ink">{row.label}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 100 14"
                    preserveAspectRatio="none"
                    className="block h-3.5 w-full"
                  >
                    <rect width="100" height="14" rx="2" className="fill-status-gray-bg" />
                    {row.count > 0 && (
                      <rect
                        width={(row.count / max) * 100}
                        height="14"
                        rx="2"
                        className="fill-accent"
                      />
                    )}
                  </svg>
                  <span className="text-right font-semibold text-ink tabular-nums">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      }}
    </ShameCard>
  )
}
