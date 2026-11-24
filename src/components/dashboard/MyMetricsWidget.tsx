import { ArrowRight, ChartColumn, CheckCircle2, Circle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { nameForLogin } from '../../config/team'
import {
  formatGeneratedAt,
  myPrMetrics,
  usePrMetrics,
  type MyPrMetrics,
  type PrMetricsFile,
} from '../../lib/prMetrics'
import { isSampleMode } from '../../lib/sampleMode'
import EmptyState from '../EmptyState'
import ErrorState from '../ErrorState'
import LoadingState from '../LoadingState'
import Skeleton from '../Skeleton'
import { FOOTER_LINK, WidgetCard } from './Widget'

/*
 * The team PR metrics (/metrics), filtered to me for the current deadline: a nudge while
 * there's still time to act. Fetched in the browser like /metrics (public data), so it loads
 * and fails on its own, never holding up the other widgets.
 */

export default function MyMetricsWidget({ login }: { login: string }) {
  const query = usePrMetrics()
  return (
    <WidgetCard
      id="my-metrics"
      title="My PR metrics"
      icon={ChartColumn}
      footer={
        <Link to="/metrics" className={FOOTER_LINK}>
          Team metrics
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      {query.loading ? (
        <LoadingState>
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-40" />
          </div>
        </LoadingState>
      ) : query.error ? (
        <ErrorState message="We couldn't load the PR metrics right now." onRetry={query.refetch} />
      ) : !query.data ? (
        <EmptyState>PR metrics haven&apos;t been generated yet. They update nightly.</EmptyState>
      ) : (
        <Body {...forViewer(query.data, login)} generatedAt={query.data.generatedAt} />
      )}
    </WidgetCard>
  )
}

/**
 * My numbers. The sample user isn't on the team, so sample mode shows the first team
 * member's numbers instead (and says whose they are).
 */
function forViewer(
  file: PrMetricsFile,
  login: string,
): { metrics: MyPrMetrics | null; sampleOf?: string } {
  const mine = myPrMetrics(file, login)
  if (mine || !isSampleMode() || file.team.length === 0) return { metrics: mine }
  return { metrics: myPrMetrics(file, file.team[0]), sampleOf: file.team[0] }
}

function Body({
  metrics,
  sampleOf,
  generatedAt,
}: {
  metrics: MyPrMetrics | null
  sampleOf?: string
  generatedAt: string
}) {
  if (!metrics) {
    return (
      <EmptyState>
        Your GitHub login isn&apos;t on the PR metrics team list (src/config/team.ts).
      </EmptyState>
    )
  }
  const band = `${Math.ceil(metrics.min)}–${Math.floor(metrics.max)}`
  const authoredOk = metrics.authored >= metrics.min && metrics.authored <= metrics.max
  const reviewedOk = metrics.reviewed >= metrics.min && metrics.reviewed <= metrics.max
  const areasOk = metrics.areasCovered.length >= metrics.areasTarget
  const sizeOk = metrics.sizeWithin === metrics.sizeTotal
  return (
    <div>
      {sampleOf && (
        <p className="mb-2 text-sm font-medium">Sample: showing {nameForLogin(sampleOf)}</p>
      )}
      <p className="text-sm text-ink-muted">
        {metrics.iteration.name}
        {metrics.iteration.current ? ' so far' : ''}, merged PRs · updated{' '}
        {formatGeneratedAt(generatedAt)}
      </p>
      <ul className="mt-3 divide-y divide-border">
        <Row ok={authoredOk} label="PRs authored" value={metrics.authored}>
          Fair share: {band}
        </Row>
        <Row ok={reviewedOk} label="PRs reviewed" value={metrics.reviewed}>
          Fair share: {band}
        </Row>
        <Row
          ok={areasOk}
          label="Focus areas"
          value={`${metrics.areasCovered.length} of ${metrics.areasCovered.length + metrics.areasMissing.length}`}
        >
          {metrics.areasMissing.length === 0
            ? `All covered (target ${metrics.areasTarget})`
            : `Target ${metrics.areasTarget}. Not yet: ${metrics.areasMissing.join(', ')}`}
        </Row>
        {metrics.sizeTotal > 0 && (
          <Row
            ok={sizeOk}
            label="PRs within size"
            value={`${metrics.sizeWithin} of ${metrics.sizeTotal}`}
          >
            750 lines and 15 files, tests and docs excluded
          </Row>
        )}
      </ul>
    </div>
  )
}

function Row({
  ok,
  label,
  value,
  children,
}: {
  ok: boolean
  label: string
  value: ReactNode
  children: ReactNode
}) {
  const Icon = ok ? CheckCircle2 : Circle
  return (
    <li className="flex items-start gap-2.5 py-2.5">
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-4 shrink-0 ${ok ? 'text-status-green-text' : 'text-link'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium">
            {label}
            <span className="sr-only">{ok ? ' (on target)' : ' (off target)'}</span>
          </span>
          <span className="font-heading text-lg font-semibold">{value}</span>
        </p>
        <p className="text-xs text-ink-muted">{children}</p>
      </div>
    </li>
  )
}
