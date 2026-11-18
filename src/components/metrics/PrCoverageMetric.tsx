import { Crosshair } from 'lucide-react'
import { nameForLogin } from '../../config/team'
import { barTone, formatPercent, formatShare, ratio, shareStatus } from '../../lib/prMetrics'
import { PercentBar, PrMetricCard, StatusLabel } from './pr/shared'

/**
 * Metric 4: share of labeled PRs authored or reviewed by a focus-area expert for at least
 * one of their labels. Each PR counts once.
 */
export default function PrCoverageMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard
      id="pr-coverage"
      title="Focus-Area Coverage"
      icon={Crosshair}
      iteration={iteration}
    >
      {(file, it) => {
        const { share } = file.targets.coverage
        const { covered, labeled, unlabeled } = it.coverage
        const status = shareStatus(covered, labeled, share)
        const experts = Object.entries(file.focusOwners)
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Target: {formatShare(share)} of PRs authored or reviewed by a focus-area expert for at
              least one of the ticket&apos;s focus areas. Each PR counts once.
            </p>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="text-2xl font-semibold text-ink tabular-nums">
                {formatPercent(covered, labeled)}
              </span>
              <span className="text-ink-muted">
                ({covered} of {labeled} PRs)
              </span>
              {status === 'not-met' && <StatusLabel status="not-met" text="Below target" />}
            </p>
            <div className="mt-3">
              <PercentBar
                value={ratio(covered, labeled) ?? 0}
                target={share}
                tone={barTone(covered, labeled, share)}
              />
            </div>
            {unlabeled > 0 && (
              <p className="mt-3 text-sm text-ink-muted">
                {unlabeled} PR{unlabeled === 1 ? '' : 's'} had no focus-area label and{' '}
                {unlabeled === 1 ? "isn't" : "aren't"} counted here or in Breadth of Knowledge.
              </p>
            )}

            <h3 className="mt-8 text-sm font-semibold tracking-wider text-ink-muted uppercase">
              Focus-area experts
            </h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Focus area</th>
                  <th scope="col">Experts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {experts.map(([label, logins]) => (
                  <tr key={label}>
                    <th scope="row" className="py-2 pr-4 font-medium text-ink">
                      {label}
                    </th>
                    <td className="py-2 text-ink-muted">
                      {logins.length > 0 ? logins.map(nameForLogin).join(', ') : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }}
    </PrMetricCard>
  )
}
