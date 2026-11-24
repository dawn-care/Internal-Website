import { CalendarCheck, CheckCircle2, Circle, CircleAlert, Flag, GitMerge } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  deadlineDueLabel,
  deadlineProgress,
  formatDateKey,
  repoRef,
  type BoardColumn,
  type DashboardQuery,
  type DeadlineSummary,
  type DeadlineWidget,
  type ReleaseStatus,
} from '../../lib/dashboard'
import { dateInName } from '../../lib/deadlines'
import { zonedDateKey } from '../../lib/teamTime'
import EmptyState from '../EmptyState'
import ExternalLinkLabel from '../ExternalLinkLabel'
import Skeleton from '../Skeleton'
import { CiStatus } from './PrBits'
import { FOOTER_LINK, WidgetBody, WidgetCard } from './Widget'

/*
 * The deadline-based iteration, as the Development Methodology defines "done": by the
 * deadline, Active Backlog, In Progress and In Review are empty and canary is merged into
 * main; backlog refinement follows within two days.
 */

const COLUMN_LABELS: Record<Exclude<BoardColumn, 'blocked'>, string> = {
  activeBacklog: 'Active Backlog',
  inProgress: 'In progress',
  inReview: 'In review',
}

export default function DeadlineCard({ query, now }: { query: DashboardQuery; now: Date }) {
  const value = query.data?.deadline
  const board = value && !('error' in value) ? value.board : null
  return (
    <WidgetCard
      id="deadline"
      title="Deadline"
      icon={Flag}
      footer={
        <>
          {board && (
            <a href={board.projectUrl} target="_blank" rel="noreferrer" className={FOOTER_LINK}>
              Project board
              <ExternalLinkLabel />
            </a>
          )}
          <Link to="/metrics" className={FOOTER_LINK}>
            PR metrics
          </Link>
        </>
      }
    >
      <WidgetBody
        query={query}
        value={value}
        skeleton={
          <>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-5 space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-52" />
            </div>
          </>
        }
      >
        {(data) => <DeadlineBody data={data} now={now} />}
      </WidgetBody>
    </WidgetCard>
  )
}

function DeadlineBody({ data, now }: { data: DeadlineWidget; now: Date }) {
  return (
    <div className="space-y-5">
      {data.refinement && (
        <p className="flex items-start gap-2 rounded-xl bg-page p-3 text-sm ring-1 ring-accent/60">
          <CalendarCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
          <span>
            <span className="font-semibold">{data.refinement.after}</span> is over. Hold backlog
            refinement by <span className="font-semibold">{formatDateKey(data.refinement.by)}</span>{' '}
            to refill Active Backlog.
          </span>
        </p>
      )}
      {data.deadline ? (
        <>
          <Header deadline={data.deadline} now={now} />
          <BoardDateMismatch data={data} deadline={data.deadline} />
          <Checklist data={data} />
        </>
      ) : (
        <EmptyState>No upcoming deadline is scheduled yet.</EmptyState>
      )}
    </div>
  )
}

function Header({ deadline, now }: { deadline: DeadlineSummary; now: Date }) {
  const progress = deadlineProgress(deadline.start, deadline.end, now)
  const progressId = `deadline-${deadline.start}-progress`
  return (
    <div>
      <p className="font-heading text-2xl font-semibold">{deadline.name}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {deadline.active
          ? deadlineDueLabel(deadline.end, deadline.daysLeft, now)
          : `Starts ${formatDateKey(deadline.start)} · due ${formatDateKey(deadline.end)}`}
      </p>
      {deadline.active && (
        <div className="mt-4">
          <p id={progressId} className="text-xs text-ink-muted">
            Day {progress.day} of {progress.totalDays}
          </p>
          <div
            role="progressbar"
            aria-labelledby={progressId}
            aria-valuemin={0}
            aria-valuemax={progress.totalDays}
            aria-valuenow={progress.day}
            aria-valuetext={`Day ${progress.day} of ${progress.totalDays}`}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-horizon"
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The team writes the deadline into the Active Backlog column ("Active Backlog (DEADLINE
 * 12-16-26)"), but the site's dates come from src/config/deadlines.ts. When the two
 * disagree, say so, so the config gets updated (the PR metrics use the same dates).
 */
function BoardDateMismatch({
  data,
  deadline,
}: {
  data: DeadlineWidget
  deadline: DeadlineSummary
}) {
  const name = data.board?.names.activeBacklog
  const onBoard = name ? dateInName(name, Number(deadline.end.slice(0, 4))) : null
  if (!onBoard || onBoard === deadline.end) return null
  return (
    <p className="flex items-start gap-2 rounded-xl bg-status-yellow-bg p-3 text-sm text-status-yellow-text">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        The board says {deadline.active ? 'this deadline is' : 'the next deadline is'}{' '}
        <span className="font-semibold">{formatDateKey(onBoard)}</span>, but the site has{' '}
        <span className="font-semibold">{formatDateKey(deadline.end)}</span>. Update{' '}
        <code className="font-mono text-xs">src/config/deadlines.ts</code> so the dashboard and PR
        metrics match.
      </span>
    </p>
  )
}

/** One "done by the deadline" condition: met (check) or not (circle), always with text. */
function Item({ met, children }: { met: boolean; children: React.ReactNode }) {
  const Icon = met ? CheckCircle2 : Circle
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-4 shrink-0 ${met ? 'text-status-green-text' : 'text-ink-muted'}`}
      />
      <span className="sr-only">{met ? 'Done: ' : 'Not yet: '}</span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </li>
  )
}

function Checklist({ data }: { data: DeadlineWidget }) {
  const { board } = data
  return (
    <div>
      <h3 className="font-body text-sm font-semibold tracking-wide text-ink-muted uppercase">
        Before the deadline
      </h3>
      <ul className="mt-2">
        {board ? (
          (Object.keys(COLUMN_LABELS) as (keyof typeof COLUMN_LABELS)[]).map((column) => {
            const count = board.counts[column]
            return (
              <Item key={column} met={count === 0}>
                <span className="font-medium">{COLUMN_LABELS[column]}</span>
                <span className="text-ink-muted">
                  {' · '}
                  {count === 0 ? 'empty' : `${count} ${count === 1 ? 'task' : 'tasks'} left`}
                </span>
              </Item>
            )
          })
        ) : (
          <li className="py-1.5 text-sm text-ink-muted">
            Couldn&apos;t read the board: {data.boardError?.message ?? 'unknown error'}
          </li>
        )}
        <ReleaseItem release={data.release} error={data.releaseError?.message} />
      </ul>
      {board && board.counts.blocked > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-link">
          <CircleAlert aria-hidden="true" className="size-4" />
          {board.counts.blocked} blocked {board.counts.blocked === 1 ? 'task' : 'tasks'} on the
          board
        </p>
      )}
    </div>
  )
}

function ReleaseItem({ release, error }: { release: ReleaseStatus | null; error?: string }) {
  if (!release) {
    return (
      <li className="py-1.5 text-sm text-ink-muted">
        Couldn&apos;t check canary → main: {error ?? 'unknown error'}
      </li>
    )
  }
  const merged = release.merged[0]
  if (merged && release.open.length === 0) {
    return (
      <Item met>
        <span className="font-medium">canary merged into main</span>
        <span className="text-ink-muted">
          {' · '}
          {formatDateKey(zonedDateKey(new Date(merged.mergedAt!)))},{' '}
          <a
            href={merged.url}
            target="_blank"
            rel="noreferrer"
            className="text-link underline underline-offset-4"
          >
            {repoRef(merged)}
            <ExternalLinkLabel />
          </a>
        </span>
      </Item>
    )
  }
  if (release.open.length === 0) {
    return (
      <Item met={false}>
        <span className="font-medium">canary → main</span>
        <span className="text-ink-muted"> · not opened yet</span>
      </Item>
    )
  }
  return (
    <>
      {release.open.map((pr) => (
        <Item key={pr.url} met={false}>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <GitMerge
                aria-hidden="true"
                className="mr-1 inline size-3.5 align-[-2px] text-ink-muted"
              />
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-4 hover:text-link hover:underline"
              >
                canary → main ({repoRef(pr)})
                <span className="ml-1 inline-block align-[-2px] text-ink-muted">
                  <ExternalLinkLabel />
                </span>
              </a>
            </span>
            <span
              className={`text-xs ${pr.approvals >= pr.requiredApprovals ? 'font-medium text-status-green-text' : 'text-ink-muted'}`}
            >
              {pr.approvals}/{pr.requiredApprovals} approvals
            </span>
            <CiStatus state={pr.ciState} />
            {pr.isDraft && <span className="text-xs text-ink-muted">Draft</span>}
          </span>
        </Item>
      ))}
    </>
  )
}
