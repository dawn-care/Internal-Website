import { LayoutGrid } from 'lucide-react'
import { summaryTiles } from '../../lib/prMetrics'
import { PR_METRIC_ANCHORS } from './pr/chartUtils'
import { PrMetricCard, StatusLabel } from './pr/shared'

/** Five tiles, one per PR metric: headline, target, and Met / Not met. */
export default function PrSummaryMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard
      id="pr-summary"
      title="PR Metrics Summary"
      icon={LayoutGrid}
      iteration={iteration}
    >
      {(file, it) => (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryTiles(file, it).map((tile) => (
            <li key={tile.key}>
              <a
                href={`#${PR_METRIC_ANCHORS[tile.key]}`}
                className="flex h-full flex-col rounded-xl border border-border p-4 hover:bg-surface-raised"
              >
                <span className="text-sm font-medium text-ink">{tile.label}</span>
                <span className="mt-2 text-2xl font-semibold text-ink tabular-nums">
                  {tile.value}
                </span>
                <span className="mt-3 text-xs text-ink-muted">
                  <span className="font-semibold">Target:</span> {tile.target}
                </span>
                <span className="mt-auto pt-3 text-sm">
                  <StatusLabel status={tile.status} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </PrMetricCard>
  )
}
