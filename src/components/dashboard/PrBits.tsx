import { AlertTriangle, CheckCircle2, CircleDashed, Clock, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { prProblems, type CiState, type DashboardPr } from '../../lib/dashboard'
import ExternalLinkLabel from '../ExternalLinkLabel'

const CI: Record<
  CiState | 'NONE',
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  SUCCESS: { label: 'CI passing', icon: CheckCircle2, className: 'text-status-green-text' },
  FAILURE: { label: 'CI failing', icon: XCircle, className: 'text-status-red-text font-medium' },
  PENDING: { label: 'CI running', icon: Clock, className: 'text-status-yellow-text' },
  NONE: { label: 'No CI', icon: CircleDashed, className: 'text-ink-muted' },
}

/** The head commit's checks: an icon plus a text label (never color alone). */
export function CiStatus({ state }: { state: CiState | null }) {
  const { label, icon: Icon, className } = CI[state ?? 'NONE']
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
    </span>
  )
}

/** A process warning ("No photo or video"): amber pill with an icon and text. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-yellow-bg px-2 py-0.5 text-xs font-medium text-status-yellow-text">
      <AlertTriangle aria-hidden="true" className="size-3 shrink-0" />
      {children}
    </span>
  )
}

/** A neutral outlined tag ("Draft"). */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-ink-muted">
      {children}
    </span>
  )
}

/** The PR title, opening GitHub in a new tab. */
export function PrTitleLink({ pr }: { pr: DashboardPr }) {
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-sm font-medium underline-offset-4 hover:text-link hover:underline"
    >
      {pr.title}
      <span className="ml-1.5 inline-block align-[-2px] text-ink-muted">
        <ExternalLinkLabel />
      </span>
    </a>
  )
}

/** "1/2 approvals", green once there are enough (1 for canary, 2 for canary → main). */
export function Approvals({ pr }: { pr: Pick<DashboardPr, 'approvals' | 'requiredApprovals'> }) {
  const met = pr.approvals >= pr.requiredApprovals
  return (
    <span className={met ? 'font-medium text-status-green-text' : 'text-ink-muted'}>
      {pr.approvals}/{pr.requiredApprovals} {pr.requiredApprovals === 1 ? 'approval' : 'approvals'}
    </span>
  )
}

/**
 * A PR's Development Methodology checks: approvals, CI, and a warning per broken rule (wrong
 * base, no ticket, ticket without a focus-area label, over the size limit, a UI change with
 * no photo or video). The ticket links to its issue when it's linked.
 */
export function PrChecks({ pr }: { pr: DashboardPr }) {
  const problems = prProblems(pr)
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      {pr.isDraft && <Tag>Draft</Tag>}
      <CiStatus state={pr.ciState} />
      <Approvals pr={pr} />
      {pr.ticket && (
        <span className="text-ink-muted">
          Ticket #{pr.ticket.number}
          {!pr.ticket.linked && ' (from branch)'}
        </span>
      )}
      {problems.map((problem) => (
        <Warning key={problem}>
          {problem === 'Over 750 lines or 15 files'
            ? `${pr.size.lines.toLocaleString('en-US')} lines, ${pr.size.files} files`
            : problem}
        </Warning>
      ))}
    </div>
  )
}
