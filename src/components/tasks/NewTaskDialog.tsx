import { ChevronRight, CircleAlert, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  createNewTask,
  TasksError,
  type NewTaskRequest,
  type Option,
  type StatusKey,
  type Task,
  type TaskMeta,
  type TeamMember,
} from '../../lib/tasks'
import { showToast } from '../../lib/toast'
import { buttonClasses } from '../buttonStyles'
import StatusSelect from './StatusSelect'

const TITLE_MAX = 256
const ESTIMATE_MAX = 200

const FIELD = 'w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-ink'
const LABEL = 'block text-sm font-medium text-ink'

interface NewTaskDialogProps {
  meta: TaskMeta
  team: TeamMember[]
  /** The signed-in user's login: the default assignee. */
  login: string
  onClose: () => void
  /** The issue was created and added (task is null if the server couldn't read it back). */
  onCreated: (task: Task | null, failedFields: string[]) => void
  /** Where focus goes on close if nothing had focus when it opened (the "n" shortcut). */
  fallbackFocus?: RefObject<HTMLElement | null>
}

const byName = (options: Option[] | undefined, name: string) =>
  options?.find((o) => o.name.trim().toLowerCase() === name.toLowerCase())

/**
 * "New task": creates an issue in the project's linked repository and adds it to the project. Mount it to open it. A native modal
 * <dialog> traps focus, closes on Esc, and makes the page behind it inert.
 *
 * Defaults follow the Type: Dev tasks go in the current sprint with Sizing open; Admin and
 * Docs tasks start with no sprint and Sizing collapsed. The status follows the sprint
 * (Sprint Backlog or Product Backlog) until the user picks one.
 */
export default function NewTaskDialog({
  meta,
  team,
  login,
  onClose,
  onCreated,
  fallbackFocus,
}: NewTaskDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const id = (name: string) => `${baseId}-${name}`

  const me = team.find((m) => m.login.toLowerCase() === login.toLowerCase())
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [assigneeId, setAssigneeId] = useState(me?.id ?? '')
  const [typeId, setTypeId] = useState(byName(meta.types, 'Admin')?.id ?? '')
  const [doneBy, setDoneBy] = useState('')
  const [priorityId, setPriorityId] = useState('')
  const [estimate, setEstimate] = useState('')
  const [sizeId, setSizeId] = useState('')
  // Chosen by the user; until then, each follows its default.
  const [chosenStatusId, setChosenStatusId] = useState<string | null>(null)
  const [chosenSizingOpen, setChosenSizingOpen] = useState<boolean | null>(null)

  const [titleError, setTitleError] = useState<string | null>(null)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isDev =
    meta.types
      ?.find((t) => t.id === typeId)
      ?.name.trim()
      .toLowerCase() === 'dev'
  // New tickets start in Product Backlog; move one to Active Backlog when the next deadline
  // needs it (Development Methodology, "Features").
  const statusFor = (key: StatusKey) => meta.statuses.find((s) => s.key === key)?.id ?? ''
  const statusId = chosenStatusId ?? statusFor('productBacklog')
  const sizingOpen = chosenSizingOpen ?? isDev
  // The server couldn't work out which repository new issues go in (it says why).
  const cannotCreate = !meta.issueRepository && Boolean(meta.issueSetupError)

  useEffect(() => {
    const dialog = ref.current
    const active = document.activeElement
    // Not body (the "n" shortcut) and not inside the dialog (StrictMode's second effect run
    // happens after the title took focus): fall back to the New task button then.
    const opener =
      active instanceof HTMLElement && active !== document.body && !dialog?.contains(active)
        ? active
        : null
    const returnFocus = opener ?? fallbackFocus?.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      titleRef.current?.focus()
    }
    // As in PreviewPanel: unmounting ends the modal state; don't call close() here.
    return () => returnFocus?.focus()
  }, [fallbackFocus])

  function validate(): boolean {
    const trimmed = title.trim()
    const tError = !trimmed
      ? 'Enter a title.'
      : trimmed.length > TITLE_MAX
        ? `Keep the title to ${TITLE_MAX} characters or fewer.`
        : null
    const hours = estimate.trim() === '' ? null : Number(estimate)
    const eError =
      hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > ESTIMATE_MAX)
        ? `Enter hours between 0 and ${ESTIMATE_MAX}.`
        : null
    setTitleError(tError)
    setEstimateError(eError)
    if (tError) titleRef.current?.focus()
    else if (eError) {
      setChosenSizingOpen(true)
      // After the disclosure opens.
      requestAnimationFrame(() => document.getElementById(id('estimate'))?.focus())
    }
    return !tError && !eError
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (submitting || cannotCreate || !validate()) return

    const input: NewTaskRequest = { title: title.trim() }
    if (notes.trim()) input.body = notes
    if (assigneeId) input.assigneeIds = [assigneeId]
    if (typeId) input.typeOptionId = typeId
    if (doneBy) input.doneBy = doneBy
    if (priorityId) input.priorityOptionId = priorityId
    if (statusId) input.statusOptionId = statusId
    if (estimate.trim() !== '') input.estimateHours = Number(estimate)
    if (sizeId) input.sizeOptionId = sizeId

    setSubmitting(true)
    try {
      const result = await createNewTask(input)
      onCreated(result.task, result.failedFields)
    } catch (err) {
      if (err instanceof TasksError && err.code === 'issue-not-added') {
        // The issue exists: close so nobody submits again and creates a duplicate.
        showToast('error', err.message)
        setSubmitting(false)
        ref.current?.close()
        return
      }
      setFormError(
        err instanceof TasksError ? err.message : "We couldn't create the task. Please try again.",
      )
      setSubmitting(false)
    }
  }

  const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined

  return (
    <dialog
      ref={ref}
      aria-labelledby={id('heading')}
      onClose={onClose}
      onCancel={(e) => {
        // Don't abandon a request mid-flight.
        if (submitting) e.preventDefault()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) ref.current?.close()
      }}
      className="shadow-photo m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-surface p-0 text-ink backdrop:bg-backdrop"
    >
      <form noValidate onSubmit={submit} className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={id('heading')} className="text-2xl font-semibold">
            New task
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={submitting}
            className="-mt-1 -mr-2 shrink-0 rounded-md p-2 text-ink-muted hover:text-ink disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {meta.issueRepository ? (
            <>
              Creates an issue in <span className="font-medium">{meta.issueRepository}</span> and
              adds it to the team&apos;s GitHub project.
            </>
          ) : (
            'Creates an issue and adds it to the team’s GitHub project.'
          )}
        </p>

        {cannotCreate && (
          <p className="mt-5 flex gap-2 rounded-xl border border-link/40 p-3 text-sm">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
            {meta.issueSetupError}
          </p>
        )}

        {/* Server errors are announced as soon as they appear. */}
        <div aria-live="assertive" aria-atomic="true">
          {formError && (
            <p className="mt-5 flex gap-2 rounded-xl border border-link/40 p-3 text-sm">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
              {formError}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor={id('title')} className={LABEL}>
              Title <span className="font-normal text-ink-muted">(required)</span>
            </label>
            <input
              ref={titleRef}
              id={id('title')}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError(null)
              }}
              required
              maxLength={TITLE_MAX}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={describedBy(titleError !== null && id('title-error'))}
              className={`mt-1.5 ${FIELD} ${titleError ? 'border-link' : ''}`}
            />
            <FieldError id={id('title-error')} message={titleError} />
          </div>

          <div>
            <label htmlFor={id('notes')} className={LABEL}>
              Notes
            </label>
            <textarea
              id={id('notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`mt-1.5 ${FIELD} resize-y`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Assignee" htmlFor={id('assignee')}>
              <select
                id={id('assignee')}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={FIELD}
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === me?.id ? `${m.name} (me)` : m.name}
                  </option>
                ))}
              </select>
            </Field>

            {meta.types && (
              <Field label="Type" htmlFor={id('type')}>
                <select
                  id={id('type')}
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className={FIELD}
                >
                  <option value="">None</option>
                  {meta.types.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Done by" htmlFor={id('done-by')}>
              <input
                id={id('done-by')}
                type="date"
                value={doneBy}
                onChange={(e) => setDoneBy(e.target.value)}
                className={FIELD}
              />
            </Field>

            {meta.priorities && (
              <Field label="Priority" htmlFor={id('priority')}>
                <OptionSelect
                  id={id('priority')}
                  options={meta.priorities}
                  value={priorityId}
                  onChange={setPriorityId}
                />
              </Field>
            )}

            <div>
              <label htmlFor={id('status')} className={LABEL}>
                Status
              </label>
              <div className="mt-1.5">
                <StatusSelect
                  variant="field"
                  id={id('status')}
                  statuses={meta.statuses}
                  value={statusId}
                  onChange={setChosenStatusId}
                />
              </div>
              {chosenStatusId === null && (
                <p className="mt-1 text-xs text-ink-muted">
                  Move it to Active Backlog if the next deadline needs it.
                </p>
              )}
            </div>
          </div>

          <details
            open={sizingOpen}
            onToggle={(e) => {
              const open = e.currentTarget.open
              if (open !== sizingOpen) setChosenSizingOpen(open)
            }}
            className="group rounded-xl border border-border px-4 py-3"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-ink-muted transition-transform group-open:rotate-90 motion-reduce:transition-none"
              />
              Sizing
            </summary>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {meta.hasEstimate && (
                <div>
                  <label htmlFor={id('estimate')} className={LABEL}>
                    Estimate (hours)
                  </label>
                  <input
                    id={id('estimate')}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={ESTIMATE_MAX}
                    step={0.5}
                    value={estimate}
                    onChange={(e) => {
                      setEstimate(e.target.value)
                      if (estimateError) setEstimateError(null)
                    }}
                    aria-invalid={estimateError ? true : undefined}
                    aria-describedby={describedBy(estimateError !== null && id('estimate-error'))}
                    className={`mt-1.5 ${FIELD} ${estimateError ? 'border-link' : ''}`}
                  />
                  <FieldError id={id('estimate-error')} message={estimateError} />
                </div>
              )}
              {meta.sizes && (
                <Field label="Size" htmlFor={id('size')}>
                  <OptionSelect
                    id={id('size')}
                    options={meta.sizes}
                    value={sizeId}
                    onChange={setSizeId}
                  />
                </Field>
              )}
            </div>
          </details>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={submitting}
            className={buttonClasses('secondary')}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || cannotCreate}
            className={`${buttonClasses('primary')} disabled:opacity-60`}
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function OptionSelect({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: Option[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      <option value="">None</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

/** A field's error, announced when it appears (the region exists before the message). */
function FieldError({ id, message }: { id: string; message: string | null }) {
  return (
    <p id={id} aria-live="polite" className={message ? 'mt-1 text-sm text-link' : ''}>
      {message}
    </p>
  )
}
