import { Ruler } from 'lucide-react'
import { nameForLogin } from '../../config/team'
import {
  formatPercent,
  formatShare,
  sizeByAuthor,
  sizeSegments,
  type SizeSegmentKey,
} from '../../lib/prMetrics'
import { BarRow, PrMetricCard } from './pr/shared'

/** Segment fills, from fine to worst. Each also has a legend entry with its count. */
const SEGMENT_FILL: Record<SizeSegmentKey, string> = {
  within: 'fill-status-green-text',
  overLinesOnly: 'fill-status-yellow-text',
  overFilesOnly: 'fill-status-purple-text',
  overBoth: 'fill-status-red-text',
}
const SEGMENT_SWATCH: Record<SizeSegmentKey, string> = {
  within: 'bg-status-green-text',
  overLinesOnly: 'bg-status-yellow-text',
  overFilesOnly: 'bg-status-purple-text',
  overBoth: 'bg-status-red-text',
}

/** Metric 1: share of PRs within the line and file limits, overall and per author. */
export default function PrSizeMetric({ iteration }: { iteration: string | null }) {
  return (
    <PrMetricCard id="pr-size" title="PR Size" icon={Ruler} iteration={iteration}>
      {(file, it) => {
        const { maxLines, maxFiles, share } = file.targets.size
        const segments = sizeSegments(it.size)
        const authors = sizeByAuthor(it.size, file.team, share)
        let offset = 0
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Target: {formatShare(share)} of PRs with at most {maxLines} changed lines and{' '}
              {maxFiles} changed files (tests, docs, and generated files not counted).
            </p>
            <p className="mt-4 text-sm">
              <span className="text-2xl font-semibold text-ink tabular-nums">
                {formatPercent(it.size.within, it.size.total)}
              </span>{' '}
              <span className="text-ink-muted">
                ({it.size.within} of {it.size.total} PRs)
              </span>
            </p>
            <svg
              aria-hidden="true"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              className="mt-3 block h-5 w-full overflow-visible"
            >
              {segments.map((seg) => {
                const w = it.size.total > 0 ? (seg.count / it.size.total) * 100 : 0
                const x = offset
                offset += w
                return w > 0 ? (
                  <rect
                    key={seg.key}
                    x={x}
                    width={w}
                    height="20"
                    className={`${SEGMENT_FILL[seg.key]} stroke-surface`}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null
              })}
              <line
                x1={share * 100}
                x2={share * 100}
                y1={-4}
                y2={24}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="stroke-ink"
              />
            </svg>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {segments.map((seg) => (
                <li key={seg.key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`size-3 rounded-sm ${SEGMENT_SWATCH[seg.key]}`}
                  />
                  <span className="text-ink">{seg.label}</span>
                  <span className="text-ink-muted tabular-nums">{seg.count}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-ink-muted">
                <span aria-hidden="true" className="inline-block h-3.5 w-0.5 bg-ink" />
                {formatShare(share)} target
              </li>
            </ul>

            <h3 className="mt-8 text-sm font-semibold tracking-wider text-ink-muted uppercase">
              By author
            </h3>
            <ul className="mt-4 space-y-4">
              {authors.map((row) => (
                <BarRow
                  key={row.login}
                  label={nameForLogin(row.login)}
                  n={row.within}
                  total={row.total}
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
