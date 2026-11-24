import { formatRelative, formatShortDate } from '../../lib/dates'

/**
 * "Last updated Nov 23, 2026" (with "(today)", "(3 days ago)"… when `relative`), as a
 * machine-readable <time>. The date is the last commit that touched the artifact.
 */
export default function LastUpdated({
  iso,
  relative = false,
}: {
  iso: string
  relative?: boolean
}) {
  return (
    <time dateTime={iso}>
      Last updated {formatShortDate(iso)}
      {relative && ` (${formatRelative(iso)})`}
    </time>
  )
}
