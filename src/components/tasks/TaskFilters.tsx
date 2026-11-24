import type { ReactNode } from 'react'
import { DEFAULT_FILTERS, type TaskFilters as Filters, type TaskMeta } from '../../lib/tasks'
import { StatusDot } from './StatusBadge'

interface TaskFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  meta: TaskMeta
  /** "Show Done" only makes sense where Done items are listed (My tasks). */
  showDoneToggle: boolean
}

const SELECT = 'rounded-full border border-border bg-surface py-1.5 pr-8 pl-3.5 text-sm text-ink'

export default function TaskFilters({ filters, onChange, meta, showDoneToggle }: TaskFiltersProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })
  const isDefault = (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).every(
    (k) => filters[k] === DEFAULT_FILTERS[k],
  )

  return (
    <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <legend className="sr-only">Filter tasks</legend>
      {meta.types && (
        <FilterSelect
          label="Type"
          value={filters.type}
          options={meta.types.map((o) => o.name)}
          onChange={(v) => set('type', v)}
        />
      )}
      <FilterSelect
        label="Status"
        value={filters.status}
        options={meta.statuses.map((o) => o.name)}
        onChange={(v) => set('status', v)}
        // Native <option>s can't be colored reliably, so the chosen status's dot sits in
        // the closed select instead.
        dot={
          filters.status ? (
            <StatusDot color={meta.statuses.find((s) => s.name === filters.status)?.color} />
          ) : undefined
        }
      />
      {meta.priorities && (
        <FilterSelect
          label="Priority"
          value={filters.priority}
          options={meta.priorities.map((o) => o.name)}
          onChange={(v) => set('priority', v)}
        />
      )}
      {showDoneToggle && (
        <Checkbox
          label="Show Done"
          checked={filters.showDone}
          onChange={(v) => set('showDone', v)}
        />
      )}
      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          Reset filters
        </button>
      )}
    </fieldset>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  dot,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  /** Shown inside the select, before the selected value. */
  dot?: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-ink-muted">
      {label}
      <span className="relative inline-flex items-center">
        {dot && (
          <span className="pointer-events-none absolute left-3.5 inline-flex [&>span]:size-2">
            {dot}
          </span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${SELECT} ${dot ? 'pl-7' : ''}`}
        >
          <option value="">Any</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm font-medium ${disabled ? 'text-ink-muted/70' : 'cursor-pointer text-ink'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-link"
      />
      {label}
      {hint && <span className="font-normal text-ink-muted">({hint})</span>}
    </label>
  )
}
