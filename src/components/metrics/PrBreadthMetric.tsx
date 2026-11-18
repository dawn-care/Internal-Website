import { Network } from 'lucide-react'
import { nameForLogin } from '../../config/team'
import { breadthRows, heatLevel } from '../../lib/prMetrics'
import { PrMetricCard, StatusLabel } from './pr/shared'

/** Metric 5: per person, PRs authored or reviewed in each breadth label (a heatmap table). */
export default function PrBreadthMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard id="pr-breadth" title="Breadth of Knowledge" icon={Network} iteration={iteration}>
      {(file, it) => {
        const { minLabels } = file.targets.breadth
        const labels = file.breadthLabels
        const rows = breadthRows(it.breadth, labels, file.team, minLabels)
        const maxCount = Math.max(0, ...rows.flatMap((r) => r.counts))
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Target: everyone authors or reviews at least one PR in {minLabels} of the{' '}
              {labels.length} focus areas. Each cell is the number of PRs authored or reviewed.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-ink-muted">
                    <th scope="col" className="px-2 py-1 text-left">
                      Member
                    </th>
                    {labels.map((label) => (
                      <th key={label} scope="col" className="px-2 py-1 text-center">
                        {label}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-1 text-left">
                      Focus areas covered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.login}>
                      <th
                        scope="row"
                        className="px-2 py-2 text-left font-medium whitespace-nowrap text-ink"
                      >
                        {nameForLogin(row.login)}
                      </th>
                      {row.counts.map((count, i) =>
                        count === 0 ? (
                          <td
                            key={labels[i]}
                            className="rounded-md bg-status-red-bg px-2 py-2 text-center font-semibold text-status-red-text tabular-nums ring-1 ring-status-red-text ring-inset"
                          >
                            0<span className="sr-only"> (none)</span>
                          </td>
                        ) : (
                          <td
                            key={labels[i]}
                            className="rounded-md px-2 py-2 text-center text-ink tabular-nums"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(heatLevel(count, maxCount) * 100)}%, var(--surface))`,
                            }}
                          >
                            {count}
                          </td>
                        ),
                      )}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="text-ink tabular-nums">
                          {row.labelsCovered} of {labels.length}
                        </span>{' '}
                        <StatusLabel
                          status={row.passes ? 'met' : 'not-met'}
                          text={row.passes ? 'Pass' : 'Fail'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }}
    </PrMetricCard>
  )
}
