import { isSampleMode } from '../sampleMode'
import { createTask, TasksError, updateTask } from './api'
import type {
  NewTaskRequest,
  StatusKey,
  Task,
  TaskMeta,
  TaskPatch,
  TasksResponse,
  WriteResult,
} from './types'
import { loadTasks, mutateTasks, peekTasks } from './useTasks'

/*
 * Task writes from the browser. Edits are optimistic: the cached task changes at once, the
 * server's answer replaces it, and a failure puts back only what that edit changed (so a
 * second edit made meanwhile survives the first one failing).
 */

/** The parts of a task a write can change. `undefined` means "cleared". */
export type TaskChange = Partial<
  Pick<
    Task,
    | 'title'
    | 'assignees'
    | 'status'
    | 'statusKey'
    | 'estimateHours'
    | 'priority'
    | 'size'
    | 'doneBy'
    | 'type'
  >
>

type Ctx = Pick<TasksResponse, 'meta' | 'team'>

const optionName = (options: { id: string; name: string }[] | undefined, id: string | null) =>
  id === null ? undefined : options?.find((o) => o.id === id)?.name

/** What a task will look like once GitHub accepts `patch`: the optimistic change. */
export function changeFromPatch(patch: TaskPatch, { meta, team }: Ctx): TaskChange {
  const change: TaskChange = {}
  if (patch.title !== undefined) change.title = patch.title.trim()
  if (patch.assigneeIds !== undefined) {
    change.assignees = patch.assigneeIds.flatMap((id) => {
      const member = team.find((m) => m.id === id)
      return member ? [{ login: member.login, avatarUrl: member.avatarUrl }] : []
    })
  }
  if (patch.statusOptionId !== undefined) {
    const option = meta.statuses.find((s) => s.id === patch.statusOptionId)
    change.status = option?.name ?? null
    change.statusKey = option?.key ?? null
  }
  if (patch.estimateHours !== undefined) change.estimateHours = patch.estimateHours ?? undefined
  if (patch.priorityOptionId !== undefined) {
    change.priority = optionName(meta.priorities, patch.priorityOptionId)
  }
  if (patch.sizeOptionId !== undefined) change.size = optionName(meta.sizes, patch.sizeOptionId)
  if (patch.typeOptionId !== undefined) change.type = optionName(meta.types, patch.typeOptionId)
  if (patch.doneBy !== undefined) change.doneBy = patch.doneBy ?? undefined
  return change
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function withTask(data: TasksResponse, itemId: string, fn: (task: Task) => Task): TasksResponse {
  return { ...data, tasks: data.tasks.map((t) => (t.itemId === itemId ? fn(t) : t)) }
}

/**
 * Undoes `change` on `task`, key by key, back to `before`. A key that has moved on since
 * (another edit changed it again) is left alone.
 */
export function revertChange(task: Task, change: TaskChange, before: TaskChange): Task {
  const next: Task = { ...task }
  for (const key of Object.keys(change) as (keyof TaskChange)[]) {
    if (same(task[key], change[key])) Object.assign(next, { [key]: before[key] })
  }
  return next
}

/** Changes still waiting on GitHub, per item, so a server reply doesn't erase a newer edit. */
const pending = new Map<string, Set<TaskChange>>()

function track(itemId: string, change: TaskChange): () => void {
  const set = pending.get(itemId) ?? new Set()
  set.add(change)
  pending.set(itemId, set)
  return () => {
    set.delete(change)
    if (set.size === 0) pending.delete(itemId)
  }
}

let mockCount = 0
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 250))

/** Sample data (VITE_TASKS_MOCK or a preview): writes only change the in-memory data. */
const mockWrites = {
  async create(input: NewTaskRequest): Promise<WriteResult> {
    await mockDelay()
    const data = peekTasks()
    if (!data) throw new TasksError('unknown', 'Tasks have not loaded yet.')
    mockCount += 1
    const repo = data.meta.issueRepository ?? 'dawn-team/dawn-app'
    const number = 900 + mockCount
    const statusKey: StatusKey = 'productBacklog'
    const statusOptionId =
      input.statusOptionId ?? data.meta.statuses.find((s) => s.key === statusKey)?.id
    const task: Task = {
      itemId: `PVTI_local${mockCount}`,
      contentId: `I_local${mockCount}`,
      kind: 'issue',
      title: input.title,
      url: `https://github.com/${repo}/issues/${number}`,
      repo,
      number,
      assignees: [],
      status: null,
      statusKey: null,
      updatedAt: new Date().toISOString(),
      ...changeFromPatch({ ...input, statusOptionId }, data),
    }
    return { task, failedFields: [] }
  },
  async update(): Promise<WriteResult> {
    await mockDelay()
    // No server copy: the optimistic change stands.
    return { task: null, failedFields: [] }
  },
}

const apiWrites = { create: createTask, update: updateTask }
const writes = () => (isSampleMode() ? mockWrites : apiWrites)

/**
 * Saves an edit optimistically. Resolves with the names of any changes GitHub rejected
 * (the task then shows what GitHub actually has). Rejects, after rolling back, if the
 * whole edit failed.
 */
export async function saveTaskEdit(itemId: string, patch: TaskPatch): Promise<string[]> {
  const data = peekTasks()
  const task = data?.tasks.find((t) => t.itemId === itemId)
  if (!data || !task) throw new TasksError('not-found', 'That task is no longer loaded.')

  const change = changeFromPatch(patch, data)
  const before: TaskChange = {}
  for (const key of Object.keys(change) as (keyof TaskChange)[]) {
    Object.assign(before, { [key]: task[key] })
  }
  const untrack = track(itemId, change)
  mutateTasks((d) => withTask(d, itemId, (t) => ({ ...t, ...change })))

  let result: WriteResult
  try {
    result = await writes().update(itemId, patch)
  } catch (err) {
    untrack()
    mutateTasks((d) => withTask(d, itemId, (t) => revertChange(t, change, before)))
    throw err
  }
  untrack()

  const fresh = result.task
  if (fresh) {
    // GitHub's copy, with any edits still in flight laid back on top.
    const stillPending = [...(pending.get(itemId) ?? [])]
    mutateTasks((d) =>
      withTask(d, itemId, () => stillPending.reduce<Task>((t, c) => ({ ...t, ...c }), fresh)),
    )
  } else if (result.failedFields.length > 0) {
    // Part of it failed and we don't know which values stuck: read everything again.
    void loadTasks()
  }
  return result.failedFields
}

/**
 * Saves an edit to a task that may not be in the tasks cache (e.g. from the Dashboard, which
 * has its own data). A cached task goes through saveTaskEdit so every view stays in step.
 * Resolves with the names of changes GitHub rejected; rejects if the whole edit failed.
 */
export async function saveTaskPatch(itemId: string, patch: TaskPatch): Promise<string[]> {
  if (peekTasks()?.tasks.some((t) => t.itemId === itemId)) return saveTaskEdit(itemId, patch)
  const result = await writes().update(itemId, patch)
  return result.failedFields
}

/** Creates an issue (added to the project) and adds it to the cached list. */
export async function createNewTask(input: NewTaskRequest): Promise<WriteResult> {
  const result = await writes().create(input)
  const task = result.task
  if (task) mutateTasks((d) => ({ ...d, tasks: [task, ...d.tasks] }))
  else void loadTasks()
  return result
}

/** Each task's status before it was checked off here, so unchecking can put it back. */
const statusBeforeDone = new Map<string, string>()

/**
 * The patch for the "Mark done" checkbox. Checking remembers the current status; unchecking
 * restores it, falling back to "In progress". Null if the project lacks the needed option.
 */
export function markDonePatch(
  task: Task,
  meta: Pick<TaskMeta, 'statuses'>,
  done: boolean,
): TaskPatch | null {
  const byKey = (key: StatusKey) => meta.statuses.find((s) => s.key === key)
  if (done) {
    const doneOption = byKey('done')
    if (!doneOption) return null
    const current = meta.statuses.find((s) => s.name === task.status)
    if (current && current.key !== 'done') statusBeforeDone.set(task.itemId, current.id)
    return { statusOptionId: doneOption.id }
  }
  const remembered = statusBeforeDone.get(task.itemId)
  const restore =
    (remembered && meta.statuses.find((s) => s.id === remembered)) || byKey('inProgress')
  if (!restore) return null
  return { statusOptionId: restore.id }
}

/** For tests. */
export function resetEdits(): void {
  pending.clear()
  statusBeforeDone.clear()
}
