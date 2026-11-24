import { FIELD_NAMES, type FieldKey } from '../config.js'
import {
  InputError,
  type CreateTaskInput,
  type FieldChanges,
  type FieldValue,
  type PatchTaskInput,
} from '../taskInput.js'
import { GitHubApiError, IssueNotAddedError } from './errors.js'
import { graphql } from './graphql.js'
import { getItem, issueRepository, type ProjectMeta } from './project.js'
import type { Task, WriteResult } from './types.js'

/*
 * Task writes, always with the signed-in user's token so GitHub attributes the change to them
 * and enforces their permissions. Calls run one at a time: GitHub applies field updates to
 * the same item more reliably in sequence, and a failure names exactly which field didn't
 * stick.
 */

const CREATE_ISSUE = /* GraphQL */ `
  mutation CreateIssue($input: CreateIssueInput!) {
    createIssue(input: $input) {
      issue {
        id
        number
        url
      }
    }
  }
`

const ADD_PROJECT_ITEM = /* GraphQL */ `
  mutation AddProjectItem($input: AddProjectV2ItemByIdInput!) {
    addProjectV2ItemById(input: $input) {
      item {
        id
      }
    }
  }
`

const UPDATE_FIELD_VALUE = /* GraphQL */ `
  mutation UpdateFieldValue($input: UpdateProjectV2ItemFieldValueInput!) {
    updateProjectV2ItemFieldValue(input: $input) {
      projectV2Item {
        id
      }
    }
  }
`

const CLEAR_FIELD_VALUE = /* GraphQL */ `
  mutation ClearFieldValue($input: ClearProjectV2ItemFieldValueInput!) {
    clearProjectV2ItemFieldValue(input: $input) {
      projectV2Item {
        id
      }
    }
  }
`

const UPDATE_DRAFT_ISSUE = /* GraphQL */ `
  mutation UpdateDraftIssue($input: UpdateProjectV2DraftIssueInput!) {
    updateProjectV2DraftIssue(input: $input) {
      draftIssue {
        id
      }
    }
  }
`

const ADD_ASSIGNEES = /* GraphQL */ `
  mutation AddAssignees($input: AddAssigneesToAssignableInput!) {
    addAssigneesToAssignable(input: $input) {
      clientMutationId
    }
  }
`

const REMOVE_ASSIGNEES = /* GraphQL */ `
  mutation RemoveAssignees($input: RemoveAssigneesFromAssignableInput!) {
    removeAssigneesFromAssignable(input: $input) {
      clientMutationId
    }
  }
`

interface CreateIssueData {
  createIssue: { issue: { id: string; number: number; url: string } | null } | null
}

interface AddProjectItemData {
  addProjectV2ItemById: { item: { id: string } | null } | null
}

/** Labels for non-field changes in `failedFields`. */
const CONTENT_LABELS = { title: 'Title', body: 'Notes', assignees: 'Assignees' } as const

/** Errors that will fail every following call too, so there's no point continuing. */
const isFatal = (err: unknown) =>
  err instanceof GitHubApiError && (err.kind === 'session-expired' || err.kind === 'rate-limited')

/** Runs write steps in order, recording which ones failed instead of stopping at the first. */
class StepRunner {
  readonly failed: string[] = []
  succeeded = 0
  firstError: unknown = null
  private stopped = false

  async run(labels: string | string[], step: () => Promise<unknown>): Promise<void> {
    const names = ([] as string[]).concat(labels)
    if (this.stopped) {
      this.failed.push(...names)
      return
    }
    try {
      await step()
      this.succeeded += 1
    } catch (err) {
      const detail = err instanceof GitHubApiError ? `${err.kind} ${err.detail}` : String(err)
      console.error(`[github] could not set ${names.join(', ')}: ${detail}`)
      this.firstError ??= err
      this.failed.push(...names)
      if (isFatal(err)) this.stopped = true
    }
  }
}

function fieldValueInput(value: FieldValue): Record<string, unknown> {
  switch (value.kind) {
    case 'singleSelect':
      return { singleSelectOptionId: value.optionId }
    case 'number':
      return { number: value.number }
    case 'date':
      return { date: value.date }
  }
}

async function applyFields(
  token: string,
  meta: ProjectMeta,
  itemId: string,
  fields: FieldChanges,
  runner: StepRunner,
): Promise<void> {
  for (const [key, value] of Object.entries(fields) as [FieldKey, FieldValue | null][]) {
    // Validation already checked that the field exists.
    const fieldId = meta[key]!.id
    const base = { projectId: meta.projectId, itemId, fieldId }
    await runner.run(FIELD_NAMES[key], () =>
      value === null
        ? graphql(token, CLEAR_FIELD_VALUE, { input: base })
        : graphql(token, UPDATE_FIELD_VALUE, {
            input: { ...base, value: fieldValueInput(value) },
          }),
    )
  }
}

/** The item as GitHub now has it, or null if that read fails (the writes still happened). */
async function readBack(token: string, itemId: string, meta: ProjectMeta): Promise<Task | null> {
  try {
    return (await getItem(token, itemId, meta))?.task ?? null
  } catch (err) {
    console.error(`[github] could not re-read item after writing: ${String(err)}`)
    return null
  }
}

/**
 * Creates an issue in the project's linked repository, adds it to the project, then sets each
 * field on it. Nothing is written if the repository can't be determined. If the issue itself
 * can't be created, this throws; if it's created but can't be added to the project, this
 * throws IssueNotAddedError (so the user doesn't create it twice). After that, a failed field
 * doesn't undo the task: the result lists it in `failedFields`.
 */
export async function createTask(
  token: string,
  meta: ProjectMeta,
  input: CreateTaskInput,
): Promise<WriteResult & { itemId: string }> {
  const repo = issueRepository(meta)
  const created = await graphql<CreateIssueData>(token, CREATE_ISSUE, {
    input: {
      repositoryId: repo.id,
      title: input.title,
      ...(input.body !== undefined && { body: input.body }),
      ...(input.assigneeIds?.length && { assigneeIds: input.assigneeIds }),
    },
  })
  const issue = created.createIssue?.issue
  if (!issue) throw new GitHubApiError('upstream', 200, 'createIssue returned no issue')

  let itemId: string | undefined
  try {
    // Returns the existing item if a project workflow already auto-added the issue.
    const added = await graphql<AddProjectItemData>(token, ADD_PROJECT_ITEM, {
      input: { projectId: meta.projectId, contentId: issue.id },
    })
    itemId = added.addProjectV2ItemById?.item?.id
  } catch (err) {
    console.error(
      `[github] adding ${repo.nameWithOwner}#${issue.number} to the project failed: ${String(err)}`,
    )
  }
  if (!itemId) throw new IssueNotAddedError(repo.nameWithOwner, issue.number, issue.url)

  const runner = new StepRunner()
  await applyFields(token, meta, itemId, input.fields, runner)
  return { itemId, task: await readBack(token, itemId, meta), failedFields: runner.failed }
}

/**
 * Applies a partial update. Drafts: title, notes, and assignees via updateProjectV2DraftIssue
 * (which takes the DraftIssue's content id). Issues: assignees via add/remove. Pull requests:
 * project fields only. Returns null when the item isn't in this project.
 *
 * If some changes fail, the rest still apply and `failedFields` names the failures. If every
 * change fails, the first error is thrown (so e.g. an expired session becomes a 401).
 */
export async function patchTask(
  token: string,
  meta: ProjectMeta,
  itemId: string,
  input: PatchTaskInput,
): Promise<WriteResult | null> {
  const current = await getItem(token, itemId, meta)
  if (!current) return null
  const { raw, task } = current

  const editsText = input.title !== undefined || input.body !== undefined
  if (task.kind === 'pr' && (editsText || input.assigneeIds)) {
    throw new InputError(
      'Only project fields can be edited on pull requests. Use GitHub for the rest.',
    )
  }
  if (task.kind === 'issue' && editsText) {
    throw new InputError("An issue's title and description can only be edited in GitHub.")
  }

  const runner = new StepRunner()

  if (task.kind === 'draft' && (editsText || input.assigneeIds)) {
    const labels: string[] = []
    if (input.title !== undefined) labels.push(CONTENT_LABELS.title)
    if (input.body !== undefined) labels.push(CONTENT_LABELS.body)
    if (input.assigneeIds) labels.push(CONTENT_LABELS.assignees)
    await runner.run(labels, () =>
      graphql(token, UPDATE_DRAFT_ISSUE, {
        input: {
          draftIssueId: task.contentId,
          ...(input.title !== undefined && { title: input.title }),
          ...(input.body !== undefined && { body: input.body }),
          ...(input.assigneeIds && { assigneeIds: input.assigneeIds }),
        },
      }),
    )
  }

  if (task.kind === 'issue' && input.assigneeIds) {
    const currentIds = new Set(
      (raw.content?.assignees.nodes ?? []).flatMap((a) => (a?.id ? [a.id] : [])),
    )
    const wanted = new Set(input.assigneeIds)
    const toAdd = [...wanted].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !wanted.has(id))
    const assignable = { assignableId: task.contentId }
    if (toAdd.length > 0) {
      await runner.run(CONTENT_LABELS.assignees, () =>
        graphql(token, ADD_ASSIGNEES, { input: { ...assignable, assigneeIds: toAdd } }),
      )
    }
    if (toRemove.length > 0) {
      await runner.run(CONTENT_LABELS.assignees, () =>
        graphql(token, REMOVE_ASSIGNEES, { input: { ...assignable, assigneeIds: toRemove } }),
      )
    }
  }

  await applyFields(token, meta, itemId, input.fields, runner)

  if (runner.succeeded === 0 && runner.firstError) throw runner.firstError
  return {
    task: await readBack(token, itemId, meta),
    failedFields: [...new Set(runner.failed)],
  }
}
