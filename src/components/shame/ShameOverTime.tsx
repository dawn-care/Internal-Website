import { ChartColumn } from 'lucide-react'
import { useRef } from 'react'
import { formatIterationDates } from '../../lib/prMetrics'
import { addDaysToDateKey } from '../../lib/teamTime'
import { niceTicks, plural, weeklyCounts, type WeekBucket } from '../../lib/shame'
import { useWidth } from '../metrics/pr/chartUtils'
import ShameCard from './ShameCard'

const HEIGHT = 180
const PAD = { top: 12, right: 8, bottom: 28, left: 28 }

/** Shames per week (team time), as one bar series, with a table for screen readers. */
export default function ShameOverTime() {
  return (
    <ShameCard id="shame-over-time" title="Shames over Time" icon={ChartColumn}>
      {(file) => <WeeklyChart weeks={weeklyCounts(file, new Date())} />}
    </ShameCard>
  )
}

function weekLabel(week: WeekBucket): string {
  return formatIterationDates(week.weekStart, addDaysToDateKey(week.weekStart, 6))
}

function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useWidth(ref, 640)
  const max = Math.max(1, ...weeks.map((w) => w.count))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const slot = plotW / weeks.length
  const barW = Math.max(2, Math.min(40, slot - 2))
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  // Label at most ~8 weeks along the axis, always including the last.
  const every = Math.ceil(weeks.length / Math.max(1, Math.floor(plotW / 80)))

  return (
    <div>
      <p className="text-sm text-ink-muted">
        Shames per week, Monday to Sunday. Hover a bar for its week.
      </p>
      <div ref={ref} className="mt-4">
        <svg
          aria-hidden="true"
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block max-w-full text-ink-muted"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-current text-[11px] tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}
          {weeks.map((week, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2
            const showLabel = (weeks.length - 1 - i) % every === 0
            return (
              <g key={week.weekStart}>
                <title>
                  {`${weekLabel(week)}: ${plural(week.count, 'shame')}${week.manual ? ` (${week.manual} from /shame)` : ''}`}
                </title>
                {/* A full-height hit target, wider than the bar, carries the tooltip. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                />
                {week.count > 0 && (
                  <rect
                    x={x}
                    y={y(week.count)}
                    width={barW}
                    height={y(0) - y(week.count)}
                    rx={2}
                    className="fill-accent"
                  />
                )}
                {showLabel && (
                  <text
                    x={PAD.left + i * slot + slot / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-current text-[11px]"
                  >
                    {weekLabel(week).split(' – ')[0]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>Shames per week</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Shames</th>
            <th scope="col">From /shame</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <th scope="row">{weekLabel(week)}</th>
              <td>{week.count}</td>
              <td>{week.manual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
