import { CircleAlert, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { groupByDue, type Task, type TaskMeta, type TeamMember } from '../../lib/tasks'
import EmptyState from '../EmptyState'
import TaskRow from './TaskRow'

interface MyTasksProps {
  tasks: Task[]
  meta: TaskMeta
  team: TeamMember[]
  /** Filters narrowed the list (for a more helpful empty message). */
  filtered: boolean
}

/** The signed-in user's tasks: Overdue / Due this week / Later / No date, then Done. */
export default function MyTasks({ tasks, meta, team, filtered }: MyTasksProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState>
        {filtered
          ? 'None of your tasks match these filters.'
          : "Nothing is assigned to you yet. Assign yourself on the project board and it'll show up here."}
      </EmptyState>
    )
  }

  const groups = groupByDue(tasks)
  const rowProps = { meta, team }
  return (
    <div className="space-y-10">
      <Group title="Overdue" tasks={groups.overdue} icon={CircleAlert} accent {...rowProps} />
      <Group title="Due this week" tasks={groups.thisWeek} {...rowProps} />
      <Group title="Later" tasks={groups.later} {...rowProps} />
      <Group title="No date" tasks={groups.noDate} {...rowProps} />
      {groups.done.length > 0 && (
        <details>
          <summary className="cursor-pointer font-heading text-xl font-semibold text-ink-muted marker:text-ink-muted">
            Done <span className="font-body text-base font-normal">({groups.done.length})</span>
          </summary>
          <ul className="mt-4 space-y-3">
            {groups.done.map((task) => (
              <TaskRow key={task.itemId} task={task} {...rowProps} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Group({
  title,
  tasks,
  icon: Icon,
  accent = false,
  ...rowProps
}: {
  title: string
  tasks: Task[]
  icon?: LucideIcon
  accent?: boolean
  meta: TaskMeta
  team: TeamMember[]
}) {
  const headingId = useId()
  if (tasks.length === 0) return null
  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className={`flex items-center gap-2 text-xl font-semibold ${accent ? 'text-link' : ''}`}
      >
        {Icon && <Icon aria-hidden="true" className="size-5" />}
        {title}
        <span className="font-body text-base font-normal text-ink-muted">({tasks.length})</span>
      </h2>
      <ul className="mt-4 space-y-3">
        {tasks.map((task) => (
          <TaskRow key={task.itemId} task={task} {...rowProps} />
        ))}
      </ul>
    </section>
  )
}
