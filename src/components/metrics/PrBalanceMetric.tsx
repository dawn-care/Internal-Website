import { Scale } from 'lucide-react'
import { useId, useRef } from 'react'
import { nameForLogin } from '../../config/team'
import {
  balanceAxisMax,
  balancePeople,
  balancePoints,
  flagLabel,
  formatRange,
  type BalanceMetrics,
  type BalancePersonRow,
} from '../../lib/prMetrics'
import { useWidth } from './pr/chartUtils'
import { PrMetricCard, StatusLabel } from './pr/shared'

/** Metric 3: PRs authored vs. reviewed per person, against the even-share range. */
export default function PrBalanceMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard
      id="pr-balance"
      title="Author and Review Balance"
      icon={Scale}
      iteration={iteration}
    >
      {(file, it) => {
        const rows = balancePeople(it.balance, file.team)
        const range = formatRange(it.balance)
        const margin = Math.round((file.targets.balance.maxFactor - 1) * 100)
        const even = Math.round(it.balance.evenShare * 10) / 10
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Target: everyone&apos;s PRs authored and PRs reviewed each stay within {margin}% of an
              even share. {it.prCount} PRs across {rows.length} members is an even share of {even},
              so the range is {range} PRs authored and {range} PRs reviewed (the shaded box). Each
              number is checked on its own, so one person can get two flags, like under-authoring
              and over-reviewing.
            </p>
            <BalanceScatter balance={it.balance} rows={rows} />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold tracking-wider text-ink-muted uppercase">
                    <th scope="col" className="py-2 pr-4">
                      Member
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Authored
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Reviewed
                    </th>
                    <th scope="col" className="py-2">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.login}>
                      <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                        {nameForLogin(row.login)}
                      </th>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.authored}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.reviewed}</td>
                      <td className="py-2.5">
                        <StatusLabel
                          status={row.flags.length === 0 ? 'met' : 'not-met'}
                          text={
                            row.flags.length === 0
                              ? 'In range'
                              : row.flags.map(flagLabel).join(', ')
                          }
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

const HEIGHT = 320
const MARGIN = { top: 16, right: 24, bottom: 44, left: 52 }
const LINE_H = 14

/**
 * Scatter of authored (x) vs. reviewed (y), one dot per point with every name there stacked
 * beside it. Flagged dots are larger and in the link color; the table below has the words.
 */
function BalanceScatter({ balance, rows }: { balance: BalanceMetrics; rows: BalancePersonRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useWidth(containerRef, 640)
  const titleId = useId()
  const axisMax = balanceAxisMax(balance, rows)
  const plotW = width - MARGIN.left - MARGIN.right
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
  const x = (v: number) => MARGIN.left + (v / axisMax) * plotW
  const y = (v: number) => MARGIN.top + plotH - (v / axisMax) * plotH
  const ticks = Array.from({ length: axisMax / 5 + 1 }, (_, i) => i * 5)
  const flagsByLogin = new Map(rows.map((r) => [r.login, r.flags]))
  const outside = rows.filter((r) => r.flags.length > 0)

  return (
    <div ref={containerRef} className="mt-5">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        className="block max-w-full overflow-visible"
      >
        <title id={titleId}>
          {`PRs authored vs. reviewed per member. Target range ${formatRange(balance)} on both. ` +
            (outside.length === 0
              ? 'Everyone is in range.'
              : `Outside the range: ${outside
                  .map((r) => `${nameForLogin(r.login)} (${r.flags.map(flagLabel).join(', ')})`)
                  .join('; ')}.`)}
        </title>

        {/* Grid and tick labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
            />
            <line
              x1={x(t)}
              x2={x(t)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              className="stroke-border"
            />
            <text
              x={MARGIN.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-muted text-xs"
            >
              {t}
            </text>
            <text
              x={x(t)}
              y={MARGIN.top + plotH + 18}
              textAnchor="middle"
              className="fill-ink-muted text-xs"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Target box: min–max on both axes */}
        <rect
          x={x(balance.min)}
          y={y(balance.max)}
          width={x(balance.max) - x(balance.min)}
          height={y(balance.min) - y(balance.max)}
          strokeDasharray="4 3"
          strokeWidth={1.5}
          className="fill-accent/15 stroke-accent"
        />

        {/* Axis titles */}
        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-ink text-xs font-medium"
        >
          PRs authored
        </text>
        <text
          transform={`translate(14 ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-ink text-xs font-medium"
        >
          PRs reviewed
        </text>

        {/* Points */}
        {balancePoints(rows).map((point) => {
          const px = x(point.authored)
          const py = y(point.reviewed)
          // Names go right of the dot, or left near the right edge.
          const flip = px > MARGIN.left + plotW * 0.75
          const gap = point.flagged ? 17 : 11
          const tx = flip ? px - gap : px + gap
          const top = py - ((point.logins.length - 1) * LINE_H) / 2
          return (
            <g key={`${point.authored},${point.reviewed}`}>
              <title>
                {point.logins
                  .map((login) => {
                    const flags = flagsByLogin.get(login) ?? []
                    return `${nameForLogin(login)}: ${point.authored} authored, ${point.reviewed} reviewed, ${
                      flags.length === 0 ? 'in range' : flags.map(flagLabel).join(', ')
                    }`
                  })
                  .join('\n')}
              </title>
              <circle
                cx={px}
                cy={py}
                r={point.flagged ? 8 : 6}
                strokeWidth={2}
                className={
                  point.flagged ? 'fill-link stroke-surface' : 'fill-ink-muted stroke-surface'
                }
              />
              {point.flagged && (
                <circle
                  cx={px}
                  cy={py}
                  r={12}
                  strokeWidth={1.5}
                  className="fill-none stroke-link"
                />
              )}
              {point.logins.map((login, i) => (
                <text
                  key={login}
                  x={tx}
                  y={top + i * LINE_H}
                  dy="0.32em"
                  textAnchor={flip ? 'end' : 'start'}
                  className={`fill-ink text-xs ${point.flagged ? 'font-semibold' : ''}`}
                >
                  {nameForLogin(login).split(' ')[0]}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
