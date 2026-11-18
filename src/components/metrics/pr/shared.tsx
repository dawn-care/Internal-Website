import type { LucideIcon } from 'lucide-react'
import { CircleCheck, CircleMinus, CircleX } from 'lucide-react'
import type { ReactNode } from 'react'
import { PR_METRICS_REPO } from '../../../config/prMetrics'
import {
  barTone,
  formatPercent,
  ratio,
  selectScope,
  shareStatus,
  usePrMetrics,
  type IterationMetrics,
  type PrMetricsFile,
  type TargetStatus,
} from '../../../lib/prMetrics'
import { WidgetCard } from '../../dashboard/Widget'
import EmptyState from '../../EmptyState'
import ErrorState from '../../ErrorState'
import LoadingState from '../../LoadingState'
import Skeleton from '../../Skeleton'
import { TONE_FILL } from './chartUtils'

interface PrMetricCardProps {
  id: string
  title: string
  icon: LucideIcon
  /** The picked iteration's name; null = the entire project. */
  iteration: string | null
  /** Shown instead of children when the iteration has no PRs. */
  emptyText?: string
  children: (file: PrMetricsFile, iteration: IterationMetrics) => ReactNode
}

/**
 * One PR metric card. Every card reads the same shared fetch (src/lib/prMetrics) and
 * handles its own loading, error, and empty states, so one never blocks another.
 */
export function PrMetricCard({
  id,
  title,
  icon,
  iteration,
  emptyText = 'No PRs merged in this iteration yet.',
  children,
}: PrMetricCardProps) {
  const query = usePrMetrics()
  let body: ReactNode
  if (query.loading) {
    body = (
      <LoadingState>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-5 h-6 w-full" />
        <Skeleton className="mt-3 h-6 w-3/4" />
      </LoadingState>
    )
  } else if (query.error) {
    body = <ErrorState message={query.error.message} onRetry={query.refetch} />
  } else if (!query.data) {
    body = (
      <EmptyState>
        PR metrics haven&apos;t been generated yet. They&apos;re published nightly once the
        pr-metrics workflow next runs in {PR_METRICS_REPO}.
      </EmptyState>
    )
  } else {
    const it = selectScope(query.data, iteration)
    if (!it) body = <EmptyState>No deadline iteration has started yet.</EmptyState>
    else if (it.prCount === 0) body = <EmptyState>{emptyText}</EmptyState>
    else body = children(query.data, it)
  }
  return (
    <WidgetCard id={id} title={title} icon={icon}>
      {body}
    </WidgetCard>
  )
}

const STATUS = {
  met: { icon: CircleCheck, text: 'Met', className: 'text-status-green-text' },
  'not-met': { icon: CircleX, text: 'Not met', className: 'text-status-red-text' },
  'no-data': { icon: CircleMinus, text: 'No data', className: 'text-ink-muted' },
} satisfies Record<TargetStatus, { icon: LucideIcon; text: string; className: string }>

/** "Met" / "Not met" with an icon: never color alone. `text` overrides the words. */
export function StatusLabel({ status, text }: { status: TargetStatus; text?: string }) {
  const { icon: Icon, text: fallback, className } = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${className}`}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {text ?? fallback}
    </span>
  )
}

const BAR_H = 14

interface PercentBarProps {
  /** 0–1. */
  value: number
  /** 0–1: where the target marker sits. */
  target: number
  tone: keyof typeof TONE_FILL
}

/** A horizontal percent bar with a target marker (decorative; the row's text carries it). */
export function PercentBar({ value, target, tone }: PercentBarProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 100 ${BAR_H}`}
      preserveAspectRatio="none"
      className="block h-3.5 w-full overflow-visible"
    >
      <rect width="100" height={BAR_H} rx="2" className="fill-status-gray-bg" />
      <rect
        width={Math.min(100, Math.max(0, value * 100))}
        height={BAR_H}
        rx="2"
        className={TONE_FILL[tone]}
      />
      <TargetMarker x={target * 100} />
    </svg>
  )
}

/** The vertical target line, poking out above and below a 0–100 bar. */
export function TargetMarker({ x }: { x: number }) {
  return (
    <line
      x1={x}
      x2={x}
      y1={-4}
      y2={BAR_H + 4}
      vectorEffect="non-scaling-stroke"
      strokeWidth={2}
      className="stroke-ink"
    />
  )
}

interface BarRowProps {
  label: ReactNode
  n: number
  total: number
  /** Target share, 0–1. */
  target: number
}

/**
 * One labeled percent bar: "label … 88% · 53/60" with "Below target" text under target,
 * so the tone color is never the only signal.
 */
export function BarRow({ label, n, total, target }: BarRowProps) {
  const status = shareStatus(n, total, target)
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="flex items-center gap-3 tabular-nums">
          {status === 'not-met' && <StatusLabel status="not-met" text="Below target" />}
          <span className="font-semibold text-ink">{formatPercent(n, total)}</span>
          <span className="text-ink-muted">
            {n}/{total}
          </span>
        </span>
      </div>
      <div className="mt-2">
        <PercentBar value={ratio(n, total) ?? 0} target={target} tone={barTone(n, total, target)} />
      </div>
    </li>
  )
}
