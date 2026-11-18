import { Timer } from 'lucide-react'
import { formatShare, speedBars } from '../../lib/prMetrics'
import { BarRow, PrMetricCard } from './pr/shared'

/** Metric 2: share of PRs first-reviewed and merged within the business-hour targets. */
export default function PrSpeedMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard id="pr-speed" title="Review and Merge Time" icon={Timer} iteration={iteration}>
      {(file, it) => {
        const { share } = file.targets.speed
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Target: {formatShare(share)} of PRs for each. Business hours are Monday–Friday,
              counted from when a PR is opened for review. A first review that requests changes
              still counts.
            </p>
            <ul className="mt-5 space-y-5">
              {speedBars(it.speed, file.targets).map((bar) => (
                <BarRow
                  key={bar.key}
                  label={bar.label}
                  n={bar.count}
                  total={bar.total}
                  target={share}
                />
              ))}
            </ul>
          </div>
        )
      }}
    </PrMetricCard>
  )
}
