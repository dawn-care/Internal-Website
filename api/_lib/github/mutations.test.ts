import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCreateTask, parsePatchTask } from '../taskInput.js'
import { GitHubApiError, IssueNotAddedError, ProjectSetupError } from './errors.js'
import { graphql } from './graphql.js'
import { createTask, patchTask } from './mutations.js'
import { resolveFields, type RawContent, type RawField, type RawItem } from './project.js'

vi.mock('./graphql.js', () => ({ graphql: vi.fn() }))

const graphqlMock = vi.mocked(graphql)

const FIELDS: RawField[] = [
  {
    id: 'F_status',
    name: 'Status',
    dataType: 'SINGLE_SELECT',
    options: [
      { id: 'S_pb', name: 'Product Backlog' },
      { id: 'S_ab', name: 'Active Backlog (DEADLINE 12-16-26)' },
    ],
  },
  {
    id: 'F_iter',
    name: 'Iteration',
    dataType: 'ITERATION',
  },
  {
    id: 'F_pri',
    name: 'Priority',
    dataType: 'SINGLE_SELECT',
    options: [{ id: 'PR_0', name: 'P0' }],
  },
  { id: 'F_est', name: 'Estimate', dataType: 'NUMBER' },
  { id: 'F_done', name: 'Estimated done date', dataType: 'DATE' },
]

const REPO = { id: 'R_app', nameWithOwner: 'dawn/app' }
const META = resolveFields({ id: 'PVT', url: 'u', repositories: { nodes: [REPO] } }, FIELDS)

const DRAFT: RawContent = {
  __typename: 'DraftIssue',
  id: 'DI_1',
  title: 'Plan',
  updatedAt: '2026-09-20T00:00:00Z',
  assignees: { nodes: [] },
}

const ISSUE: RawContent = {
  __typename: 'Issue',
  id: 'I_1',
  title: 'Bug',
  url: 'https://github.com/dawn/app/issues/1',
  number: 1,
  updatedAt: '2026-09-20T00:00:00Z',
  repository: { nameWithOwner: 'dawn/app' },
  assignees: {
    nodes: [
      { id: 'U_ada', login: 'ada', avatarUrl: '' },
      { id: 'U_bo', login: 'bo', avatarUrl: '' },
    ],
  },
}

function item(content: RawContent, projectId = 'PVT'): RawItem & { project: { id: string } } {
  return {
    id: 'PVTI_1',
    isArchived: false,
    updatedAt: '2026-09-20T00:00:00Z',
    content,
    fieldValues: { nodes: [] },
    project: { id: projectId },
  }
}

/** The operation name of each GraphQL call, in order. */
const operations = () =>
  graphqlMock.mock.calls.map(([, query]) => /(?:mutation|query) (\w+)/.exec(query)![1])

/** Variables of every call to `operation`. */
const inputsOf = (operation: string) =>
  graphqlMock.mock.calls
    .filter(([, query]) => query.includes(`mutation ${operation}`))
    .map(([, , variables]) => (variables as { input: Record<string, unknown> }).input)

/**
 * Answers by operation. `fail` lists UpdateFieldValue field ids that should fail, or other
 * operation names.
 */
function stub(options: { content?: RawContent; projectId?: string; fail?: string[] } = {}) {
  const fail = new Set(options.fail)
  graphqlMock.mockImplementation(async (_token, query, variables) => {
    const input = (variables as { input?: { fieldId?: string } }).input
    const op = /(?:mutation|query) (\w+)/.exec(query)![1]
    if (fail.has(op) || (input?.fieldId && fail.has(input.fieldId))) {
      throw new GitHubApiError('upstream', 200, 'nope')
    }
    if (op === 'CreateIssue') {
      return {
        createIssue: {
          issue: { id: 'I_new', number: 12, url: 'https://github.com/dawn/app/issues/12' },
        },
      }
    }
    if (op === 'AddProjectItem') return { addProjectV2ItemById: { item: { id: 'PVTI_1' } } }
    if (op === 'ProjectItem') return { node: item(options.content ?? DRAFT, options.projectId) }
    return {}
  })
}

beforeEach(() => {
  graphqlMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createTask', () => {
  const input = parseCreateTask(
    {
      title: 'Plan',
      body: 'Notes',
      assigneeIds: ['U_ada'],
      estimateHours: 3,
      doneBy: '2026-10-01',
    },
    META,
  )

  it('creates an issue in the linked repo, adds it to the project, then sets each field', async () => {
    stub({ content: ISSUE })
    const result = await createTask('gho_test', META, input)

    expect(operations()).toEqual([
      'CreateIssue',
      'AddProjectItem',
      'UpdateFieldValue',
      'UpdateFieldValue',
      'UpdateFieldValue',
      'ProjectItem',
    ])
    expect(inputsOf('CreateIssue')).toEqual([
      { repositoryId: 'R_app', title: 'Plan', body: 'Notes', assigneeIds: ['U_ada'] },
    ])
    expect(inputsOf('AddProjectItem')).toEqual([{ projectId: 'PVT', contentId: 'I_new' }])
    expect(inputsOf('UpdateFieldValue')).toEqual([
      { projectId: 'PVT', itemId: 'PVTI_1', fieldId: 'F_est', value: { number: 3 } },
      { projectId: 'PVT', itemId: 'PVTI_1', fieldId: 'F_done', value: { date: '2026-10-01' } },
      // The default status comes last: Product Backlog.
      {
        projectId: 'PVT',
        itemId: 'PVTI_1',
        fieldId: 'F_status',
        value: { singleSelectOptionId: 'S_pb' },
      },
    ])
    for (const [token] of graphqlMock.mock.calls) expect(token).toBe('gho_test')
    expect(result.failedFields).toEqual([])
    expect(result.task).toMatchObject({ itemId: 'PVTI_1', kind: 'issue' })
  })

  it('keeps going after a failed field and reports it by name', async () => {
    stub({ content: ISSUE, fail: ['F_est', 'F_done'] })
    const result = await createTask('t', META, input)
    // Every field was still attempted.
    expect(inputsOf('UpdateFieldValue')).toHaveLength(3)
    expect(result.failedFields).toEqual(['Estimate', 'Estimated done date'])
    expect(result.task).not.toBeNull()
  })

  it('stops calling GitHub once the session has expired, and marks the rest failed', async () => {
    let calls = 0
    graphqlMock.mockImplementation(async (_t, query) => {
      if (query.includes('CreateIssue')) {
        return { createIssue: { issue: { id: 'I_new', number: 12, url: 'u' } } }
      }
      if (query.includes('AddProjectItem'))
        return { addProjectV2ItemById: { item: { id: 'PVTI_1' } } }
      calls += 1
      throw new GitHubApiError('session-expired', 401)
    })
    const result = await createTask('t', META, input)
    // One field attempt, then the read-back (which fails quietly).
    expect(calls).toBe(2)
    expect(result.failedFields).toEqual(['Estimate', 'Estimated done date', 'Status'])
    expect(result.task).toBeNull()
  })

  it('writes nothing more when the issue itself cannot be created', async () => {
    stub({ fail: ['CreateIssue'] })
    await expect(createTask('t', META, input)).rejects.toBeInstanceOf(GitHubApiError)
    expect(operations()).toEqual(['CreateIssue'])
  })

  it('names the created issue when it cannot be added to the project, so nobody retries', async () => {
    stub({ fail: ['AddProjectItem'] })
    const attempt = createTask('t', META, input)
    await expect(attempt).rejects.toBeInstanceOf(IssueNotAddedError)
    await expect(attempt).rejects.toThrow(
      /Issue #12 was created in dawn\/app.*https:\/\/github\.com\/dawn\/app\/issues\/12/,
    )
    // No field writes against an item that doesn't exist.
    expect(operations()).toEqual(['CreateIssue', 'AddProjectItem'])
  })

  it.each([
    ['no linked repository', []],
    ['several linked repositories', [REPO, { id: 'R_docs', nameWithOwner: 'dawn/docs' }]],
  ])('refuses before writing anything with %s', async (_label, repos) => {
    stub()
    const meta = resolveFields({ id: 'PVT', url: 'u', repositories: { nodes: repos } }, FIELDS)
    await expect(createTask('t', meta, input)).rejects.toBeInstanceOf(ProjectSetupError)
    expect(operations()).toEqual([])
  })
})

describe('patchTask', () => {
  it('updates a draft through its DraftIssue content id, then its fields', async () => {
    stub()
    const input = parsePatchTask(
      { title: 'Renamed', assigneeIds: ['U_bo'], priorityOptionId: null },
      META,
    )
    const result = await patchTask('t', META, 'PVTI_1', input)
    expect(operations()).toEqual([
      'ProjectItem',
      'UpdateDraftIssue',
      'ClearFieldValue',
      'ProjectItem',
    ])
    expect(inputsOf('UpdateDraftIssue')).toEqual([
      { draftIssueId: 'DI_1', title: 'Renamed', assigneeIds: ['U_bo'] },
    ])
    expect(inputsOf('ClearFieldValue')).toEqual([
      { projectId: 'PVT', itemId: 'PVTI_1', fieldId: 'F_pri' },
    ])
    expect(result?.failedFields).toEqual([])
  })

  it('diffs issue assignees into add and remove calls', async () => {
    stub({ content: ISSUE })
    await patchTask('t', META, 'PVTI_1', parsePatchTask({ assigneeIds: ['U_ada', 'U_cy'] }, META))
    expect(operations()).toEqual(['ProjectItem', 'AddAssignees', 'RemoveAssignees', 'ProjectItem'])
    expect(inputsOf('AddAssignees')).toEqual([{ assignableId: 'I_1', assigneeIds: ['U_cy'] }])
    expect(inputsOf('RemoveAssignees')).toEqual([{ assignableId: 'I_1', assigneeIds: ['U_bo'] }])
  })

  it("refuses to edit an issue's title, and a PR's assignees", async () => {
    stub({ content: ISSUE })
    await expect(
      patchTask('t', META, 'PVTI_1', parsePatchTask({ title: 'x' }, META)),
    ).rejects.toThrow(/only be edited in GitHub/)
    stub({ content: { ...ISSUE, __typename: 'PullRequest' } })
    await expect(
      patchTask('t', META, 'PVTI_1', parsePatchTask({ assigneeIds: [] }, META)),
    ).rejects.toThrow(/Only project fields/)
    // Nothing was written.
    expect(operations().every((op) => op === 'ProjectItem')).toBe(true)
  })

  it('returns null for an item from another project', async () => {
    stub({ projectId: 'PVT_other' })
    const input = parsePatchTask({ priorityOptionId: 'PR_0' }, META)
    expect(await patchTask('t', META, 'PVTI_1', input)).toBeNull()
    expect(operations()).toEqual(['ProjectItem'])
  })

  it('reports a partial failure, but throws when every change failed', async () => {
    stub({ fail: ['F_pri'] })
    const partial = parsePatchTask({ priorityOptionId: 'PR_0', doneBy: '2026-10-01' }, META)
    expect((await patchTask('t', META, 'PVTI_1', partial))?.failedFields).toEqual(['Priority'])

    stub({ fail: ['F_pri'] })
    const only = parsePatchTask({ priorityOptionId: 'PR_0' }, META)
    await expect(patchTask('t', META, 'PVTI_1', only)).rejects.toBeInstanceOf(GitHubApiError)
  })
})
