import { FIELD_NAMES, type FieldKey } from './config.js'
import { parseDateKey } from './dates.js'
import { statusKeyOf, type ProjectMeta } from './github/project.js'

/**
 * Validation for task writes. Everything the browser sends is checked against the project
 * metadata before any GitHub call, so a bad request fails with a readable 400 instead of a
 * half-applied change.
 */

/** Bad input from the client. The message is shown to the user, so keep it plain. */
export class InputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InputError'
  }
}

export const TITLE_MAX = 256
export const BODY_MAX = 65_536
export const ESTIMATE_MAX_HOURS = 200
/** GitHub allows at most 10 assignees on an issue. */
export const ASSIGNEES_MAX = 10

/** A project field value to set (a value) or clear (null). */
export type FieldValue =
  | { kind: 'singleSelect'; optionId: string }
  | { kind: 'number'; number: number }
  | { kind: 'date'; date: string }

/** Field changes in the order they're applied. */
export type FieldChanges = Partial<Record<FieldKey, FieldValue | null>>

export interface CreateTaskInput {
  title: string
  body?: string
  assigneeIds?: string[]
  fields: FieldChanges
}

export interface PatchTaskInput {
  title?: string
  body?: string
  assigneeIds?: string[]
  fields: FieldChanges
}

/** Request keys for the single-select, date, and number fields. */
const FIELD_KEYS = {
  statusOptionId: 'status',
  estimateHours: 'estimate',
  priorityOptionId: 'priority',
  sizeOptionId: 'size',
  doneBy: 'doneBy',
  typeOptionId: 'type',
} as const satisfies Record<string, FieldKey>

type FieldRequestKey = keyof typeof FIELD_KEYS

const CONTENT_KEYS = ['title', 'body', 'assigneeIds'] as const
const ALLOWED_KEYS = new Set<string>([...CONTENT_KEYS, ...Object.keys(FIELD_KEYS)])

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new InputError('Send the task as a JSON object.')
  }
  const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k))
  if (unknown.length > 0) {
    throw new InputError(`Unknown field(s): ${unknown.join(', ')}.`)
  }
  return body as Record<string, unknown>
}

function parseTitle(value: unknown): string {
  if (value === undefined || value === null) throw new InputError('Title is required.')
  if (typeof value !== 'string') throw new InputError('Title must be text.')
  const title = value.trim()
  if (title.length === 0) throw new InputError('Title is required.')
  if (title.length > TITLE_MAX) {
    throw new InputError(`Title must be at most ${TITLE_MAX} characters.`)
  }
  return title
}

function parseBody(value: unknown): string {
  if (typeof value !== 'string') throw new InputError('Notes must be text.')
  if (value.length > BODY_MAX) {
    throw new InputError(`Notes must be at most ${BODY_MAX.toLocaleString('en-US')} characters.`)
  }
  return value
}

function parseAssigneeIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new InputError('Assignees must be a list of GitHub user ids.')
  }
  const ids = [...new Set(value as string[])]
  if (ids.length > ASSIGNEES_MAX) {
    throw new InputError(`A task can have at most ${ASSIGNEES_MAX} assignees.`)
  }
  return ids
}

/** One field's value, checked against the project. `null` (clear) only when allowed. */
function parseField(
  key: FieldRequestKey,
  value: unknown,
  meta: ProjectMeta,
  allowClear: boolean,
): FieldValue | null {
  const fieldKey = FIELD_KEYS[key]
  const label = FIELD_NAMES[fieldKey]
  if (value === null) {
    if (!allowClear) throw new InputError(`${label} can't be empty here; leave it out instead.`)
    if (!meta[fieldKey]) throw new InputError(`This project has no "${label}" field.`)
    return null
  }

  switch (fieldKey) {
    case 'estimate': {
      if (!meta.estimate) throw new InputError(`This project has no "${label}" field.`)
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new InputError(`${label} must be a number of hours.`)
      }
      if (value < 0 || value > ESTIMATE_MAX_HOURS) {
        throw new InputError(`${label} must be between 0 and ${ESTIMATE_MAX_HOURS} hours.`)
      }
      return { kind: 'number', number: value }
    }
    case 'doneBy': {
      // Exactly "YYYY-MM-DD" and a real calendar date (no timestamps, no Feb 30).
      if (typeof value !== 'string' || value.length !== 10 || !parseDateKey(value)) {
        throw new InputError(`"Done by" must be a date like 2026-10-05.`)
      }
      return { kind: 'date', date: value }
    }
    default: {
      const field = meta[fieldKey]
      if (!field) throw new InputError(`This project has no "${label}" field.`)
      if (typeof value !== 'string' || !field.options.some((o) => o.id === value)) {
        throw new InputError(`That ${label} option is not one of the project’s options.`)
      }
      return { kind: 'singleSelect', optionId: value }
    }
  }
}

function parseFields(
  body: Record<string, unknown>,
  meta: ProjectMeta,
  allowClear: boolean,
): FieldChanges {
  const fields: FieldChanges = {}
  for (const key of Object.keys(FIELD_KEYS) as FieldRequestKey[]) {
    if (body[key] === undefined) continue
    fields[FIELD_KEYS[key]] = parseField(key, body[key], meta, allowClear)
  }
  return fields
}

/**
 * POST /api/tasks. Without an explicit status, a new task goes to "Product Backlog" (skipped
 * if the project lacks that option).
 */
export function parseCreateTask(body: unknown, meta: ProjectMeta): CreateTaskInput {
  const obj = asObject(body)
  const input: CreateTaskInput = {
    title: parseTitle(obj.title),
    fields: parseFields(obj, meta, false),
  }
  if (obj.body !== undefined) input.body = parseBody(obj.body)
  if (obj.assigneeIds !== undefined) input.assigneeIds = parseAssigneeIds(obj.assigneeIds)

  if (!input.fields.status) {
    const option = meta.status.options.find((o) => statusKeyOf(o.name) === 'productBacklog')
    if (option) input.fields.status = { kind: 'singleSelect', optionId: option.id }
  }
  return input
}

/** PATCH /api/tasks/:itemId. Null clears a field. At least one change is required. */
export function parsePatchTask(body: unknown, meta: ProjectMeta): PatchTaskInput {
  const obj = asObject(body)
  const input: PatchTaskInput = { fields: parseFields(obj, meta, true) }
  if (obj.title !== undefined) input.title = parseTitle(obj.title)
  if (obj.body !== undefined) input.body = parseBody(obj.body)
  if (obj.assigneeIds !== undefined) input.assigneeIds = parseAssigneeIds(obj.assigneeIds)
  if (Object.keys(input).length === 1 && Object.keys(input.fields).length === 0) {
    throw new InputError('Nothing to change.')
  }
  return input
}

/** "PVTI_…"-style GraphQL node ids: letters, digits, underscores, and dashes. */
export function parseItemId(value: unknown): string {
  const id = Array.isArray(value) ? value[0] : value
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    throw new InputError('That task id is not valid.')
  }
  return id
}
