import { ArrowRight, CircleAlert, EyeOff, ListTodo } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import {
  repoRef,
  setStatusOverride,
  workCounts,
  type BoardColumn,
  type DashboardQuery,
  type MyWork,
} from '../../lib/dashboard'
import {
  isDone,
  markDonePatch,
  statusOptionOf,
  type StatusOption,
  type Task,
} from '../../lib/tasks'
import EmptyState from '../EmptyState'
import ExternalLinkLabel from '../ExternalLinkLabel'
import Skeleton from '../Skeleton'
import StatusBadge from '../tasks/StatusBadge'
import { DoneByLabel } from '../tasks/TaskRow'
import { saveWithToast } from '../tasks/saveTask'
import { CountBadge, FOOTER_LINK, WidgetBody, WidgetCard } from './Widget'

/**
 * My open tasks by board column, the way the Thursday check-in goes: what I'm working on,
 * what's in review, what's next for the deadline, and what's blocked.
 */
export default function MyWorkWidget({ query, now }: { query: DashboardQuery; now: Date }) {
  const work = query.data?.work
  const open = work && !('error' in work) ? workCounts(work, now).open : undefined
  return (
    <WidgetCard
      id="my-work"
      title="My work"
      icon={ListTodo}
      badge={open !== undefined && <CountBadge count={open} label={`${open} open`} />}
      footer={
        <Link to="/tasks" className={FOOTER_LINK}>
          All my tasks
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      <WidgetBody
        query={query}
        value={work}
        skeleton={
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-4 h-5 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
      >
        {(data) => <WorkGroups data={data} now={now} />}
      </WidgetBody>
    </WidgetCard>
  )
}

const GROUPS: { key: BoardColumn; title: string }[] = [
  { key: 'inProgress', title: 'In progress' },
  { key: 'inReview', title: 'In review' },
  { key: 'activeBacklog', title: 'Up next (Active Backlog)' },
  { key: 'blocked', title: 'Blocked' },
]

function WorkGroups({ data, now }: { data: MyWork; now: Date }) {
  const counts = workCounts(data, now)
  const shown = GROUPS.filter((g) => data.columns[g.key].length > 0)

  return (
    <div className="space-y-6">
      {counts.overdue > 0 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-link">
          <CircleAlert aria-hidden="true" className="size-4" />
          {counts.overdue} past {counts.overdue === 1 ? 'its' : 'their'} &ldquo;Done by&rdquo; date
        </p>
      )}
      {shown.length === 0 ? (
        <EmptyState>
          {data.counts.open === 0
            ? 'Nothing is assigned to you right now.'
            : 'Nothing of yours is in progress, in review, in Active Backlog, or blocked. The rest is in Product Backlog.'}
        </EmptyState>
      ) : (
        shown.map((g) => (
          <TaskGroup
            key={g.key}
            title={g.title}
            tasks={data.columns[g.key]}
            open={counts[g.key]}
            more={data.counts[g.key] - data.columns[g.key].length}
            accent={g.key === 'blocked'}
            statuses={data.statuses}
            now={now}
          />
        ))
      )}
      {data.hiddenCount > 0 && (
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {data.hiddenCount === 1
              ? '1 project item is hidden because GitHub didn’t share it.'
              : `${data.hiddenCount} project items are hidden because GitHub didn’t share them.`}{' '}
            <Link to="/tasks" className="font-medium text-link underline underline-offset-4">
              See Tasks
            </Link>
          </span>
        </p>
      )}
    </div>
  )
}

function TaskGroup({
  title,
  tasks,
  open,
  more,
  accent,
  statuses,
  now,
}: {
  title: string
  tasks: Task[]
  open: number
  more: number
  accent: boolean
  statuses: StatusOption[]
  now: Date
}) {
  const headingId = useId()
  return (
    <div role="group" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className={`flex items-center gap-1.5 font-body text-sm font-semibold tracking-wide uppercase ${
          accent ? 'text-link' : 'text-ink-muted'
        }`}
      >
        {accent && <CircleAlert aria-hidden="true" className="size-4" />}
        {title}
        <span className="font-normal">({open})</span>
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {tasks.map((task) => (
          <CompactTaskRow key={task.itemId} task={task} statuses={statuses} now={now} />
        ))}
      </ul>
      {more > 0 && (
        <Link
          to="/tasks"
          className="mt-1 inline-block text-sm text-link underline-offset-4 hover:underline"
        >
          and {more} more
        </Link>
      )}
    </div>
  )
}

/** "Mark done" for a dashboard task: the same patch as the Tasks page, shown at once. */
async function toggleDone(task: Task, statuses: StatusOption[], done: boolean): Promise<void> {
  const patch = markDonePatch(task, { statuses }, done)
  const option = statuses.find((s) => s.id === patch?.statusOptionId)
  if (!patch || !option) return
  setStatusOverride(task.itemId, { name: option.name, key: option.key })
  const saved = await saveWithToast(task.itemId, patch, 'the status')
  if (!saved) {
    setStatusOverride(task.itemId, task.status ? { name: task.status, key: task.statusKey } : null)
  }
}

function CompactTaskRow({
  task,
  statuses,
  now,
}: {
  task: Task
  statuses: StatusOption[]
  now: Date
}) {
  const done = isDone(task)
  const status = statusOptionOf(task, { statuses })
  const canMarkDone = statuses.some((s) => s.key === 'done')
  const title = `font-medium ${done ? 'text-ink-muted line-through' : ''}`

  return (
    <li className="flex items-start gap-3 py-2.5">
      {canMarkDone && (
        <input
          type="checkbox"
          checked={done}
          aria-label={`Mark “${task.title}” done`}
          onChange={(e) => void toggleDone(task, statuses, e.target.checked)}
          className="mt-1 size-4 shrink-0 cursor-pointer accent-link"
        />
      )}
      <div className="min-w-0 flex-1">
        {task.url ? (
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className={`${title} rounded-sm underline-offset-4 hover:text-link hover:underline`}
          >
            {task.title}
            <span className="ml-1.5 inline-block align-[-2px] text-ink-muted">
              <ExternalLinkLabel />
            </span>
          </a>
        ) : (
          <p className={title}>{task.title}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {status && <StatusBadge status={status} />}
          <DoneByLabel task={task} today={now} />
          {task.repo && task.number !== undefined && (
            <span>{repoRef({ repo: task.repo, number: task.number })}</span>
          )}
        </div>
      </div>
    </li>
  )
}
