import { describe, expect, it } from 'vitest'
import { ProjectSetupError } from './errors.js'
import {
  issueRepository,
  labelsOf,
  normalizeItem,
  resolveFields,
  statusKeyOf,
  toClientMeta,
  type RawContent,
  type RawField,
  type RawFieldValue,
  type RawItem,
} from './project.js'

const PROJECT = { id: 'PVT_1', url: 'https://github.com/orgs/dawn/projects/1' }

const FIELDS: RawField[] = [
  { id: 'F_title', name: 'Title', dataType: 'TITLE' },
  {
    id: 'F_status',
    name: 'Status',
    dataType: 'SINGLE_SELECT',
    options: [
      { id: 'S_pb', name: 'Product Backlog' },
      { id: 'S_ab', name: 'Active Backlog (DEADLINE 12-16-26)' },
      { id: 'S_ip', name: 'In progress' },
      { id: 'S_done', name: 'Done', color: 'ORANGE' },
      { id: 'S_blk', name: 'Blocked', color: 'RED' },
    ],
  },
  {
    id: 'F_iter',
    name: 'Iteration',
    // Still on the real board, but the site no longer reads it (no sprints).
    dataType: 'ITERATION',
  },
  { id: 'F_est', name: 'Estimate', dataType: 'NUMBER' },
  {
    id: 'F_pri',
    name: 'Priority',
    dataType: 'SINGLE_SELECT',
    options: [
      { id: 'PR_0', name: 'P0' },
      { id: 'PR_1', name: 'P1' },
    ],
  },
  { id: 'F_size', name: 'Size', dataType: 'SINGLE_SELECT', options: [{ id: 'SZ_m', name: 'M' }] },
  { id: 'F_done', name: 'Estimated done date', dataType: 'DATE' },
  {
    id: 'F_type',
    name: 'Type',
    dataType: 'SINGLE_SELECT',
    options: [{ id: 'T_dev', name: 'Dev' }],
  },
  { id: 'F_sub', name: 'Sub-issues progress', dataType: 'SUB_ISSUES_PROGRESS' },
]

const META = resolveFields(PROJECT, FIELDS)

const select = (fieldId: string, name: string): RawFieldValue => ({
  __typename: 'ProjectV2ItemFieldSingleSelectValue',
  optionId: `${fieldId}-${name}`,
  name,
  field: { id: fieldId },
})

const ALL_VALUES: RawFieldValue[] = [
  { __typename: 'ProjectV2ItemFieldTextValue', field: { id: 'F_title' } },
  select('F_status', 'In progress'),
  { __typename: 'ProjectV2ItemFieldNumberValue', number: 4.5, field: { id: 'F_est' } },
  select('F_pri', 'P0'),
  select('F_size', 'M'),
  { __typename: 'ProjectV2ItemFieldDateValue', date: '2026-09-29', field: { id: 'F_done' } },
  select('F_type', 'Dev'),
]

const people = [{ login: 'ada', avatarUrl: 'https://a/ada.png' }, null]

function item(
  content: RawContent | null,
  values: RawFieldValue[] = [],
  extra: Partial<RawItem> = {},
): RawItem {
  return {
    id: 'PVTI_1',
    isArchived: false,
    updatedAt: '2026-09-20T10:00:00Z',
    content,
    fieldValues: { nodes: values },
    ...extra,
  }
}

const draft: RawContent = {
  __typename: 'DraftIssue',
  id: 'DI_1',
  title: 'Write the test plan',
  updatedAt: '2026-09-21T10:00:00Z',
  assignees: { nodes: people },
}

const issue: RawContent = {
  __typename: 'Issue',
  id: 'I_kw',
  title: 'Crash on launch',
  url: 'https://github.com/dawn/app/issues/12',
  number: 12,
  updatedAt: '2026-09-19T10:00:00Z',
  repository: { nameWithOwner: 'dawn/app' },
  assignees: { nodes: [] },
}

const pr: RawContent = {
  ...issue,
  __typename: 'PullRequest',
  id: 'PR_kw',
  number: 13,
  url: 'https://github.com/dawn/app/pull/13',
}

describe('normalizeItem', () => {
  it('normalizes a draft issue with every field type', () => {
    expect(normalizeItem(item(draft, ALL_VALUES), META)).toEqual({
      itemId: 'PVTI_1',
      contentId: 'DI_1',
      kind: 'draft',
      title: 'Write the test plan',
      assignees: [{ login: 'ada', avatarUrl: 'https://a/ada.png' }],
      status: 'In progress',
      statusKey: 'inProgress',
      estimateHours: 4.5,
      priority: 'P0',
      size: 'M',
      doneBy: '2026-09-29',
      type: 'Dev',
      // The later of the item's and the content's timestamps.
      updatedAt: '2026-09-21T10:00:00Z',
    })
  })

  it('adds url, repo, and number for issues', () => {
    const task = normalizeItem(item(issue), META)!
    expect(task).toMatchObject({
      kind: 'issue',
      contentId: 'I_kw',
      url: 'https://github.com/dawn/app/issues/12',
      repo: 'dawn/app',
      number: 12,
      updatedAt: '2026-09-20T10:00:00Z',
    })
  })

  it('adds issue labels, and leaves them out when there are none', () => {
    const labelled: RawContent = {
      ...issue,
      labels: { nodes: [{ name: 'bug', color: 'D73A4A' }, null] },
    }
    expect(normalizeItem(item(labelled), META)?.labels).toEqual([{ name: 'bug', color: 'd73a4a' }])
    expect(normalizeItem(item(issue), META)).not.toHaveProperty('labels')
    expect(normalizeItem(item({ ...issue, labels: { nodes: [] } }), META)).not.toHaveProperty(
      'labels',
    )
  })

  it('normalizes pull requests', () => {
    expect(normalizeItem(item(pr), META)).toMatchObject({
      kind: 'pr',
      number: 13,
      repo: 'dawn/app',
    })
  })

  it('leaves unset fields out entirely', () => {
    const task = normalizeItem(item(issue), META)!
    expect(task.status).toBeNull()
    expect(task.statusKey).toBeNull()
    for (const key of ['estimateHours', 'priority', 'size', 'doneBy', 'type']) {
      expect(task).not.toHaveProperty(key)
    }
  })

  it('reads values by field id, not by kind', () => {
    // A number in some other number field must not become the estimate.
    const values: RawFieldValue[] = [
      { __typename: 'ProjectV2ItemFieldNumberValue', number: 5, field: { id: 'F_other' } },
    ]
    expect(normalizeItem(item(draft, values), META)).not.toHaveProperty('estimateHours')
  })

  it('drops archived and redacted items', () => {
    expect(normalizeItem(item(draft, [], { isArchived: true }), META)).toBeNull()
    expect(normalizeItem(item(null), META)).toBeNull()
  })

  it('ignores a malformed date', () => {
    const values: RawFieldValue[] = [
      { __typename: 'ProjectV2ItemFieldDateValue', date: '2026-02-30', field: { id: 'F_done' } },
    ]
    expect(normalizeItem(item(draft, values), META)).not.toHaveProperty('doneBy')
  })
})

describe('labelsOf', () => {
  it('keeps only 6-digit hex colors, so nothing else can reach a style attribute', () => {
    expect(
      labelsOf([
        { name: 'ok', color: 'a2eeef' },
        { name: 'css', color: 'red;background:url(x)' },
        { name: 'short', color: 'fff' },
        { name: '', color: 'a2eeef' },
      ]),
    ).toEqual([
      { name: 'ok', color: 'a2eeef' },
      { name: 'css', color: '' },
      { name: 'short', color: '' },
    ])
  })
})

describe('statusKeyOf', () => {
  it('maps configured names case-insensitively, and unknown names to null', () => {
    expect(statusKeyOf('Done')).toBe('done')
    expect(statusKeyOf(' in PROGRESS ')).toBe('inProgress')
    expect(statusKeyOf('Icebox')).toBeNull()
    expect(statusKeyOf(null)).toBeNull()
  })

  it('matches statuses by prefix, so the deadline can sit in the column name', () => {
    expect(statusKeyOf('Active Backlog (DEADLINE TBD)')).toBe('activeBacklog')
    expect(statusKeyOf('active  backlog')).toBe('activeBacklog')
    // The sandbox project's older name.
    expect(statusKeyOf('Sprint Backlog')).toBe('activeBacklog')
    expect(statusKeyOf('Product Backlog')).toBe('productBacklog')
    expect(statusKeyOf('Done (shipped)')).toBe('done')
  })
})

describe('resolveFields', () => {
  it('names every missing required field, and lists the fields the project has', () => {
    const fields = FIELDS.filter((f) => f.name !== 'Estimated done date' && f.name !== 'Status')
    expect(() => resolveFields(PROJECT, fields)).toThrow(ProjectSetupError)
    expect(() => resolveFields(PROJECT, fields)).toThrow(
      /"Status" \(single select\) is missing; "Estimated done date" \(date\) is missing/,
    )
    expect(() => resolveFields(PROJECT, fields)).toThrow(
      /The project's fields are: "Title" \(title\), "Iteration" \(iteration\), "Estimate" \(number\)/,
    )
  })

  it('treats Type as optional', () => {
    const meta = resolveFields(
      PROJECT,
      FIELDS.filter((f) => f.name !== 'Type'),
    )
    expect(meta.type).toBeUndefined()
    expect(toClientMeta(meta)).not.toHaveProperty('types')
    const task = normalizeItem(item(draft, ALL_VALUES), meta)!
    expect(task).not.toHaveProperty('type')
    expect(task.status).toBe('In progress')
  })

  it('rejects a required field of the wrong type', () => {
    const fields = FIELDS.map((f) =>
      f.name === 'Estimated done date' ? { ...f, dataType: 'TEXT' } : f,
    )
    expect(() => resolveFields(PROJECT, fields)).toThrow(
      /"Estimated done date" must be a date field/,
    )
  })

  it('omits missing optional fields', () => {
    const fields = FIELDS.filter((f) => !['Priority', 'Size'].includes(f.name!))
    const meta = resolveFields(PROJECT, fields)
    expect(meta.priority).toBeUndefined()
    const client = toClientMeta(meta)
    expect(client).not.toHaveProperty('priorities')
    expect(client).not.toHaveProperty('sizes')
  })

  it('treats Estimate and Iteration as optional', () => {
    const fields = FIELDS.filter((f) => f.name !== 'Estimate' && f.name !== 'Iteration')
    const meta = resolveFields(PROJECT, fields)
    expect(meta.estimate).toBeUndefined()
    expect(toClientMeta(meta).hasEstimate).toBe(false)
    expect(toClientMeta(META).hasEstimate).toBe(true)
    expect(normalizeItem(item(draft, ALL_VALUES), meta)).not.toHaveProperty('estimateHours')
  })

  it('ignores a leftover Story Points field', () => {
    const fields: RawField[] = [
      ...FIELDS,
      { id: 'F_pts', name: 'Story Points', dataType: 'SINGLE_SELECT', options: [] },
    ]
    const meta = resolveFields(PROJECT, fields)
    expect(Object.values(meta).some((f) => (f as { id?: string })?.id === 'F_pts')).toBe(false)
  })

  it('finds fields regardless of name casing', () => {
    const fields = FIELDS.map((f) => (f.name === 'Estimate' ? { ...f, name: 'estimate' } : f))
    expect(resolveFields(PROJECT, fields).estimate?.id).toBe('F_est')
  })
})

describe('issueRepository', () => {
  const withRepos = (names: string[]) =>
    resolveFields(
      {
        ...PROJECT,
        repositories: { nodes: names.map((n, i) => ({ id: `R_${i}`, nameWithOwner: n })) },
      },
      FIELDS,
    )

  it('uses the only linked repository, and tells the browser which it is', () => {
    const meta = withRepos(['dawn/app'])
    expect(issueRepository(meta)).toEqual({ id: 'R_0', nameWithOwner: 'dawn/app' })
    const client = toClientMeta(meta)
    expect(client.issueRepository).toBe('dawn/app')
    expect(client).not.toHaveProperty('issueSetupError')
  })

  it('explains, rather than guessing, with none or several', () => {
    expect(() => issueRepository(withRepos([]))).toThrow(/isn't linked to a repository/)
    expect(() => issueRepository(withRepos(['dawn/app', 'dawn/docs']))).toThrow(
      /links several repositories \(dawn\/app, dawn\/docs\).*ISSUE_REPOSITORY/,
    )
    const client = toClientMeta(withRepos([]))
    expect(client).not.toHaveProperty('issueRepository')
    expect(client.issueSetupError).toMatch(/isn't linked/)
  })
})

describe('toClientMeta', () => {
  it('tags statuses with their keys', () => {
    const client = toClientMeta(META)
    expect(client.statuses.find((s) => s.name === 'Blocked')).toEqual({
      id: 'S_blk',
      name: 'Blocked',
      key: 'blocked',
      color: 'RED',
    })
    // No color from GitHub: left out (the browser shows GRAY).
    expect(client.statuses.find((s) => s.name === 'In progress')).not.toHaveProperty('color')
    expect(client.statuses.find((s) => s.id === 'S_ab')?.key).toBe('activeBacklog')
    expect(client).not.toHaveProperty('iterations')
  })
})
