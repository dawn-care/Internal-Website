import { ArrowRight, CircleAlert, EyeOff, ListTodo } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import {
  repoRef,
  setStatusOverride,
  taskCounts,
  type DashboardQuery,
  type MyTasks,
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

export default function MyTasksWidget({ query, now }: { query: DashboardQuery; now: Date }) {
  const tasks = query.data?.tasks
  const open = tasks && !('error' in tasks) ? tasks.counts.open : undefined
  return (
    <WidgetCard
      id="my-tasks"
      title="My tasks"
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
        value={tasks}
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
        {(data) => <TaskGroups data={data} now={now} />}
      </WidgetBody>
    </WidgetCard>
  )
}

function TaskGroups({ data, now }: { data: MyTasks; now: Date }) {
  const counts = taskCounts(data)
  const groups = [
    { key: 'overdue', title: 'Overdue', tasks: data.overdue, total: data.counts.overdue },
    {
      key: 'dueThisWeek',
      title: 'Due this week',
      tasks: data.dueThisWeek,
      total: data.counts.dueThisWeek,
    },
    { key: 'blocked', title: 'Blocked', tasks: data.blocked, total: data.counts.blocked },
    {
      key: 'inProgress',
      title: 'In progress',
      tasks: data.inProgress,
      total: data.counts.inProgress,
    },
  ] as const
  const shown = groups.filter((g) => g.tasks.length > 0)

  return (
    <div className="space-y-6">
      {shown.length === 0 ? (
        <EmptyState>
          {data.counts.open === 0
            ? 'Nothing is assigned to you right now.'
            : 'None of your tasks are overdue, due this week, blocked, or in progress.'}
        </EmptyState>
      ) : (
        shown.map((g) => (
          <TaskGroup
            key={g.key}
            title={g.title}
            tasks={g.tasks}
            open={counts[g.key]}
            more={g.total - g.tasks.length}
            accent={g.key === 'overdue'}
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
