import { CalendarClock, ExternalLink, Pencil } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { formatCardDate } from '../../lib/dates'
import {
  doneByDate,
  githubLink,
  isBlocked,
  isDone,
  isOverdue,
  markDonePatch,
  type Label,
  type Task,
  type TaskMeta,
  type TaskPatch,
  type TeamMember,
} from '../../lib/tasks'
import { saveWithToast } from './saveTask'
import StatusSelect from './StatusSelect'

const BADGE = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium'
/**
 * A compact native control that looks like a badge until you use it. min-h-6 keeps it at
 * least 24px tall (WCAG 2.5.8 target size), which matters on phones.
 */
const PILL =
  'min-h-6 rounded-full border border-border bg-surface py-0.5 text-xs font-medium text-ink-muted hover:border-ink/30'

/** "Done by Tue, Sep 29", in the link color with "overdue" when it has passed. */
export function DoneByLabel({ task, today }: { task: Task; today?: Date }) {
  const date = doneByDate(task)
  if (!date) return null
  const overdue = isOverdue(task, today)
  return (
    <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-link' : ''}`}>
      <CalendarClock aria-hidden="true" className="size-3.5" />
      Done by {formatCardDate(date, today)}
      {overdue && <span> · overdue</span>}
    </span>
  )
}

interface TaskRowProps {
  task: Task
  meta: TaskMeta
  team: TeamMember[]
  today?: Date
}

/**
 * One task, with inline edits: status, "Done by", estimate, priority, and
 * assignee, plus a "Mark done" checkbox. Every edit is optimistic and confirmed by a toast.
 * Drafts can be renamed here; issue and PR titles link out to GitHub instead.
 */
export default function TaskRow({ task, meta, team, today }: TaskRowProps) {
  const link = githubLink(task, meta.projectUrl)
  const overdue = isOverdue(task, today)
  const blocked = isBlocked(task)
  const done = isDone(task)
  const save = (patch: TaskPatch, what: string) => void saveWithToast(task.itemId, patch, what)
  const label = (field: string) => `${field} for “${task.title}”`
  const doneOption = meta.statuses.find((s) => s.key === 'done')

  return (
    <li
      // Every row has the 4px left border (transparent unless flagged) so titles line up.
      className={`shadow-card rounded-2xl border-l-4 bg-surface p-4 sm:px-5 ${
        overdue || blocked ? 'border-link' : 'border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {doneOption && (
          <input
            type="checkbox"
            checked={done}
            aria-label={`Mark “${task.title}” done`}
            onChange={(e) => {
              const patch = markDonePatch(task, meta, e.target.checked)
              if (patch) save(patch, 'the status')
            }}
            className="mt-1 size-4 shrink-0 cursor-pointer accent-link"
          />
        )}
        <div className="min-w-0 flex-1">
          <TaskTitle task={task} done={done} linkHref={link.href} onRename={save} />
          {task.labels && <Labels labels={task.labels} />}
        </div>
        {task.kind === 'draft' && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            title={link.label}
            className="-m-1.5 shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-link"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="sr-only">
              {link.label}: {task.title} (opens in a new tab)
            </span>
          </a>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-ink-muted">
        <StatusSelect
          variant="pill"
          aria-label={label('Status')}
          statuses={meta.statuses}
          value={meta.statuses.find((s) => s.name === task.status)?.id ?? ''}
          unknownName={task.status ?? undefined}
          onChange={(id) => save({ statusOptionId: id }, 'the status')}
        />
        {task.type && (
          <span className={`${BADGE} border border-border text-ink-muted`}>
            <span className="sr-only">Type </span>
            {task.type}
          </span>
        )}
        {meta.priorities && (
          <OptionPill
            label={label('Priority')}
            options={meta.priorities}
            valueName={task.priority}
            emptyLabel="No priority"
            urgent={task.priority !== undefined && /^p0$/i.test(task.priority)}
            onChange={(id) => save({ priorityOptionId: id }, 'the priority')}
          />
        )}
        {meta.hasEstimate && (
          <EstimateInput
            label={label('Estimate in hours')}
            value={task.estimateHours}
            onCommit={(hours) => save({ estimateHours: hours }, 'the estimate')}
          />
        )}
        {task.size && (
          <span className="px-1">
            <span className="sr-only">Size </span>
            {task.size}
          </span>
        )}
        <DoneByInput
          label={label('Done by')}
          task={task}
          overdue={overdue}
          onCommit={(date) => save({ doneBy: date }, 'the “Done by” date')}
        />
        <AssigneeControl
          label={label('Assignee')}
          task={task}
          team={team}
          onChange={(ids) => save({ assigneeIds: ids }, 'the assignee')}
        />
        {task.kind === 'draft' && <span className="text-xs">Draft</span>}
      </div>
    </li>
  )
}

/**
 * The issue's or PR's GitHub labels, read-only. Label colors are arbitrary, so the text
 * stays ink-muted (AA in both themes) and the color only fills a decorative swatch.
 */
function Labels({ labels }: { labels: Label[] }) {
  return (
    <ul aria-label="Labels" className="mt-1.5 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <li
          key={l.name}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-px text-xs text-ink-muted"
        >
          {l.color && (
            <span
              aria-hidden="true"
              // Data from GitHub, validated as 6-digit hex on the server.
              style={{ backgroundColor: `#${l.color}` }}
              className="size-2 shrink-0 rounded-full ring-1 ring-border"
            />
          )}
          {l.name}
        </li>
      ))}
    </ul>
  )
}

/** Drafts: the title with a rename button. Issues and PRs: the title links to GitHub. */
function TaskTitle({
  task,
  done,
  linkHref,
  onRename,
}: {
  task: Task
  done: boolean
  linkHref: string
  onRename: (patch: TaskPatch, what: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Enter/Esc end editing, and the blur that follows must not save a second time.
  const finished = useRef(false)
  const returnFocus = useRef(false)
  const text = `font-medium ${done ? 'text-ink-muted line-through' : ''}`

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  if (task.kind !== 'draft') {
    return (
      <a
        href={linkHref}
        target="_blank"
        rel="noreferrer"
        className={`${text} rounded-sm underline-offset-4 hover:text-link hover:underline`}
      >
        {task.title}
        <ExternalLink
          aria-hidden="true"
          className="ml-1.5 inline size-3.5 align-[-2px] text-ink-muted"
        />
        <span className="sr-only">
          {' '}
          (opens the {task.kind === 'pr' ? 'pull request' : 'issue'} in GitHub, in a new tab)
        </span>
      </a>
    )
  }

  if (editing) {
    const finish = (value: string | null, refocus: boolean) => {
      if (finished.current) return
      finished.current = true
      returnFocus.current = refocus
      setEditing(false)
      const title = value?.trim()
      if (title && title !== task.title) onRename({ title }, 'the title')
    }
    return (
      <>
        <label htmlFor={inputId} className="sr-only">
          Title
        </label>
        <input
          id={inputId}
          defaultValue={task.title}
          maxLength={256}
          autoFocus
          onBlur={(e) => finish(e.currentTarget.value, false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(e.currentTarget.value, true)
            if (e.key === 'Escape') finish(null, true)
          }}
          className="-my-1 w-full rounded-lg border border-ink/20 px-2 py-1 font-medium"
        />
      </>
    )
  }

  return (
    <p className={`${text} group`}>
      {task.title}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          finished.current = false
          setEditing(true)
        }}
        className="ml-1.5 inline-flex size-6 items-center justify-center rounded-full align-middle text-ink-muted opacity-80 group-hover:opacity-100 hover:bg-ink/5 hover:text-link focus-visible:opacity-100"
      >
        <Pencil aria-hidden="true" className="size-3.5" />
        <span className="sr-only">Rename “{task.title}”</span>
      </button>
    </p>
  )
}

/** A single-select field as a pill; the empty choice clears the field. */
function OptionPill({
  label,
  options,
  valueName,
  emptyLabel,
  urgent = false,
  format = (name) => name,
  onChange,
}: {
  label: string
  options: { id: string; name: string }[]
  valueName: string | undefined
  emptyLabel: string
  urgent?: boolean
  format?: (name: string) => string
  onChange: (optionId: string | null) => void
}) {
  const value = options.find((o) => o.name === valueName)?.id ?? ''
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
      className={`${PILL} pr-7 pl-2.5 ${urgent ? 'border-link text-link' : ''}`}
    >
      <option value="">{emptyLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {format(o.name)}
        </option>
      ))}
    </select>
  )
}

/** Hours, saved on Enter or blur; Esc puts the old value back. Empty clears it. */
function EstimateInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number | undefined
  onCommit: (hours: number | null) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === undefined ? '' : String(value))

  function commit() {
    if (draft === null) return
    setDraft(null)
    const trimmed = draft.trim()
    const hours = trimmed === '' ? null : Number(trimmed)
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 200)) return
    if ((hours ?? undefined) !== value) onCommit(hours)
  }

  return (
    <Suffixed suffix="h">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={200}
        step={0.5}
        placeholder="–"
        aria-label={label}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setDraft(null)
        }}
        className={`${PILL} w-16 [appearance:textfield] pr-5 pl-2.5 [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </Suffixed>
  )
}

function Suffixed({ suffix, children }: { suffix: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-xs text-ink-muted"
      >
        {suffix}
      </span>
    </span>
  )
}

/**
 * The "Done by" date, saved on blur or Enter (not on every change: browsers report
 * half-typed dates like year 0002 while you type). Emptying it clears the field.
 */
function DoneByInput({
  label,
  task,
  overdue,
  onCommit,
}: {
  label: string
  task: Task
  overdue: boolean
  onCommit: (date: string | null) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    setDraft(null)
    const next = draft || null
    // A full date with a plausible year; anything else snaps back to the saved value.
    if (next !== null && !/^(19|20)\d{2}-\d{2}-\d{2}$/.test(next)) return
    if (next !== (task.doneBy ?? null)) onCommit(next)
  }

  return (
    <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-link' : ''}`}>
      <CalendarClock aria-hidden="true" className="size-3.5" />
      <input
        type="date"
        aria-label={overdue ? `${label} (overdue)` : label}
        value={draft ?? task.doneBy ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setDraft(null)
        }}
        className={`${PILL} px-2.5 ${overdue ? 'border-link text-link' : ''}`}
      />
      {overdue && <span className="text-xs">overdue</span>}
    </span>
  )
}

/**
 * One assignee, picked from the team. Tasks with several assignees, assignees from outside
 * the team, and pull requests are shown read-only (edit those in GitHub).
 */
function AssigneeControl({
  label,
  task,
  team,
  onChange,
}: {
  label: string
  task: Task
  team: TeamMember[]
  onChange: (ids: string[]) => void
}) {
  const current = task.assignees[0]
  const member = current && team.find((m) => m.login.toLowerCase() === current.login.toLowerCase())
  const editable = task.kind !== 'pr' && task.assignees.length <= 1 && (!current || member)

  if (!editable) {
    if (task.assignees.length === 0) return null
    return (
      <span className="px-1" title="Edit assignees in GitHub">
        <span className="sr-only">Assigned to </span>@
        {task.assignees.map((a) => a.login).join(', @')}
      </span>
    )
  }
  return (
    <select
      aria-label={label}
      value={member?.id ?? ''}
      onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      className={`${PILL} max-w-40 pr-7 pl-2.5`}
    >
      <option value="">Unassigned</option>
      {team.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  )
}
