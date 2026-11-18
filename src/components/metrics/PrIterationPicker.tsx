import {
  ENTIRE_PROJECT,
  formatGeneratedAt,
  formatIterationDates,
  selectScope,
  usePrMetrics,
} from '../../lib/prMetrics'
import Skeleton from '../Skeleton'

interface PrIterationPickerProps {
  /** The picked iteration's name; null = the entire project. */
  value: string | null
  /** null = the entire project. */
  onChange: (name: string | null) => void
}

/**
 * Picks what the PR metric cards cover: the entire project (the default) or one deadline
 * iteration. Renders nothing when the metrics can't load: each card shows its own error or
 * empty state.
 */
export default function PrIterationPicker({ value, onChange }: PrIterationPickerProps) {
  const { data, loading } = usePrMetrics()
  if (loading) return <Skeleton className="h-9 w-72" />
  if (!data) return null
  const selected = selectScope(data, value)
  if (!selected) return null
  const isProject = selected.name === ENTIRE_PROJECT
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <label className="flex items-center gap-3 text-sm font-medium text-ink-muted">
        Scope
        <select
          value={isProject ? '' : selected.name}
          onChange={(e) => onChange(e.target.value || null)}
          className="rounded-full border border-border bg-surface py-1.5 pr-8 pl-4 text-ink"
        >
          <option value="">
            {ENTIRE_PROJECT} · {formatIterationDates(selected.start, selected.end)}
          </option>
          {[...data.iterations].reverse().map((it) => (
            <option key={it.name} value={it.name}>
              {it.name}
              {it.current ? ' (current)' : ''} · {formatIterationDates(it.start, it.end)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-ink-muted">
        {selected.prCount} PRs merged · updated {formatGeneratedAt(data.generatedAt)}
      </p>
    </div>
  )
}
