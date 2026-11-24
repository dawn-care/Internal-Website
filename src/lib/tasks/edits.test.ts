import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TasksError } from './api'
import { changeFromPatch, createNewTask, markDonePatch, resetEdits, saveTaskEdit } from './edits'
import { createMockTasks } from './mock'
import type { Task, TasksResponse } from './types'
import { loadTasks, peekTasks, resetTasksCache } from './useTasks'

const TODAY = new Date(2026, 8, 29, 12, 0)
let data: TasksResponse

/** A write that resolves or rejects when the test says so. */
function deferred() {
  let resolve!: (res: Response) => void
  const promise = new Promise<Response>((r) => (resolve = r))
  return { promise, resolve }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const fail = () => json({ error: { code: 'github-unavailable', message: 'GitHub said no.' } }, 502)

/** PATCH answers, queued per call. GET /api/tasks always returns `data`. */
let writes: Promise<Response>[] = []
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if ((init?.method ?? 'GET') === 'GET') return json(data)
  const next = writes.shift()
  if (!next) throw new Error(`unexpected ${init?.method} ${url}`)
  return next
})

const taskById = (id: string) => peekTasks()!.tasks.find((t) => t.itemId === id)!

beforeEach(async () => {
  data = createMockTasks(TODAY)
  writes = []
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  resetTasksCache()
  resetEdits()
  await loadTasks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveTaskEdit (optimistic update)', () => {
  it('shows the change at once, then keeps the server’s copy', async () => {
    const target = data.tasks[0]
    const write = deferred()
    writes.push(write.promise)

    const saving = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P2' })
    expect(taskById(target.itemId).priority).toBe('P2')

    const fromServer: Task = { ...target, priority: 'P2', updatedAt: 'later' }
    write.resolve(json({ task: fromServer, failedFields: [] }))
    expect(await saving).toEqual([])
    expect(taskById(target.itemId)).toEqual(fromServer)

    const [url, init] = fetchMock.mock.calls.at(-1)!
    expect(url).toBe(`/api/tasks/${target.itemId}`)
    expect(init).toMatchObject({ method: 'PATCH', credentials: 'same-origin' })
    expect(JSON.parse(String(init!.body))).toEqual({ priorityOptionId: 'PR_P2' })
  })

  it('rolls back and rethrows the server’s message when the write fails', async () => {
    const target = data.tasks[0]
    const original = structuredClone(target)
    writes.push(Promise.resolve(fail()))

    const saving = saveTaskEdit(target.itemId, {
      statusOptionId: 'S_done',
      doneBy: null,
      estimateHours: 13,
    })
    expect(taskById(target.itemId)).toMatchObject({ statusKey: 'done', estimateHours: 13 })
    expect(taskById(target.itemId).doneBy).toBeUndefined()

    await expect(saving).rejects.toThrow('GitHub said no.')
    await expect(saving).rejects.toBeInstanceOf(TasksError)
    expect(taskById(target.itemId)).toEqual(original)
  })

  it('rolls back on a network error too', async () => {
    const target = data.tasks[1]
    writes.push(Promise.reject(new TypeError('offline')))
    await expect(saveTaskEdit(target.itemId, { estimateHours: 9 })).rejects.toThrow(
      /couldn't reach the server/,
    )
    expect(taskById(target.itemId).estimateHours).toBe(target.estimateHours)
  })

  it('keeps a newer edit when an earlier one fails', async () => {
    const target = data.tasks[0]
    const first = deferred()
    const second = deferred()
    writes.push(first.promise, second.promise)

    const a = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P2' })
    const b = saveTaskEdit(target.itemId, { doneBy: '2026-12-01' })

    first.resolve(fail())
    await expect(a).rejects.toThrow()
    // A's change is undone; B's is untouched.
    expect(taskById(target.itemId)).toMatchObject({
      priority: target.priority,
      doneBy: '2026-12-01',
    })

    second.resolve(json({ task: { ...target, doneBy: '2026-12-01' }, failedFields: [] }))
    await b
    expect(taskById(target.itemId).doneBy).toBe('2026-12-01')
  })

  it('does not undo a field that a later edit changed again', async () => {
    const target = data.tasks[0]
    const first = deferred()
    const second = deferred()
    writes.push(first.promise, second.promise)

    const a = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P2' })
    const b = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P1' })
    first.resolve(fail())
    await expect(a).rejects.toThrow()
    expect(taskById(target.itemId).priority).toBe('P1')
    second.resolve(json({ task: { ...target, priority: 'P1' }, failedFields: [] }))
    await b
  })

  it('lays edits still in flight over the server’s copy of an earlier one', async () => {
    const target = data.tasks[0]
    const first = deferred()
    const second = deferred()
    writes.push(first.promise, second.promise)

    const a = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P2' })
    const b = saveTaskEdit(target.itemId, { doneBy: '2026-12-01' })
    // The server's copy from A predates B.
    first.resolve(json({ task: { ...target, priority: 'P2' }, failedFields: [] }))
    await a
    expect(taskById(target.itemId)).toMatchObject({ priority: 'P2', doneBy: '2026-12-01' })
    second.resolve(
      json({ task: { ...target, priority: 'P2', doneBy: '2026-12-01' }, failedFields: [] }),
    )
    await b
  })

  it('reports partial failures and shows what GitHub kept', async () => {
    const target = data.tasks[0]
    writes.push(
      Promise.resolve(
        json({ task: { ...target, doneBy: '2026-12-01' }, failedFields: ['Priority'] }),
      ),
    )
    const failed = await saveTaskEdit(target.itemId, {
      priorityOptionId: 'PR_P2',
      doneBy: '2026-12-01',
    })
    expect(failed).toEqual(['Priority'])
    expect(taskById(target.itemId)).toMatchObject({
      priority: target.priority,
      doneBy: '2026-12-01',
    })
  })

  it('ignores a read that started before an edit landed', async () => {
    const target = data.tasks[0]
    const write = deferred()
    writes.push(write.promise)
    let releaseRead!: () => void
    const staleData = structuredClone(data)
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (releaseRead = () => resolve(json(staleData)))),
    )
    const reading = loadTasks()
    const saving = saveTaskEdit(target.itemId, { priorityOptionId: 'PR_P2' })
    releaseRead()
    await reading
    expect(taskById(target.itemId).priority).toBe('P2')
    write.resolve(json({ task: { ...target, priority: 'P2' }, failedFields: [] }))
    await saving
  })
})

describe('createNewTask', () => {
  it('posts the input and adds the created task to the list', async () => {
    const created: Task = { ...data.tasks[0], itemId: 'PVTI_new', title: 'New one' }
    writes.push(Promise.resolve(json({ task: created, failedFields: ['Priority'] }, 201)))
    const result = await createNewTask({ title: 'New one', priorityOptionId: 'PR_P0' })
    expect(result.failedFields).toEqual(['Priority'])
    expect(peekTasks()!.tasks[0]).toEqual(created)
    const [url, init] = fetchMock.mock.calls.at(-1)!
    expect(url).toBe('/api/tasks')
    expect(init?.method).toBe('POST')
  })
})

describe('changeFromPatch', () => {
  it('turns option ids into the names and values tasks carry', () => {
    const me = data.team[0]
    expect(
      changeFromPatch(
        {
          statusOptionId: 'S_blocked',
          priorityOptionId: null,
          assigneeIds: [me.id, 'U_unknown'],
          estimateHours: null,
        },
        data,
      ),
    ).toEqual({
      status: 'Blocked',
      statusKey: 'blocked',
      priority: undefined,
      assignees: [{ login: me.login, avatarUrl: me.avatarUrl }],
      estimateHours: undefined,
    })
  })
})

describe('markDonePatch', () => {
  const { meta } = createMockTasks(TODAY)
  const task = (status: string, key: Task['statusKey']): Task => ({
    ...data.tasks[0],
    itemId: 'X',
    status,
    statusKey: key,
  })

  it('restores the status a task had before it was checked off', () => {
    expect(markDonePatch(task('In review', 'inReview'), meta, true)).toEqual({
      statusOptionId: 'S_done',
    })
    expect(markDonePatch(task('Done', 'done'), meta, false)).toEqual({
      statusOptionId: 'S_inReview',
    })
  })

  it('falls back to In progress when it wasn’t checked off here', () => {
    expect(markDonePatch({ ...task('Done', 'done'), itemId: 'Y' }, meta, false)).toEqual({
      statusOptionId: 'S_inProgress',
    })
  })
})
