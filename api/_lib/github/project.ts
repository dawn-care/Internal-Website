import {
  FIELD_NAMES,
  ISSUE_REPOSITORY,
  PROJECT_META_TTL_MS,
  REQUIRED_FIELDS,
  STATUS_NAMES,
  type FieldKey,
  type StatusKey,
} from '../config.js'
import { parseDateKey } from '../dates.js'
import { getProjectConfig } from '../env.js'
import { GitHubApiError, ProjectSetupError } from './errors.js'
import { graphql } from './graphql.js'
import type { Assignee, Label, Option, StatusOption, Task, TaskMeta, TeamMember } from './types.js'

// ─── Project metadata ────────────────────────────────────────────────────────

/** A single-select option as GitHub returns it, with its board color. */
interface RawOption extends Option {
  color?: string | null
}

interface SelectField {
  id: string
  options: RawOption[]
}

interface PlainField {
  id: string
}

/** The project's fields, resolved by the names in config.ts. Optional fields may be absent. */
/** A repository linked to the project. */
export interface LinkedRepository {
  id: string
  nameWithOwner: string
}

export interface ProjectMeta {
  projectId: string
  projectUrl: string
  /** Repositories linked to the project (Project settings → Linked repositories). */
  repositories: LinkedRepository[]
  status: SelectField
  doneBy: PlainField
  type?: SelectField
  estimate?: PlainField
  priority?: SelectField
  size?: SelectField
}

const FIELD_DATA_TYPES: Record<FieldKey, string> = {
  status: 'SINGLE_SELECT',
  estimate: 'NUMBER',
  priority: 'SINGLE_SELECT',
  size: 'SINGLE_SELECT',
  doneBy: 'DATE',
  type: 'SINGLE_SELECT',
}

const FIELD_KIND_LABELS: Record<string, string> = {
  SINGLE_SELECT: 'single select',
  ITERATION: 'iteration',
  NUMBER: 'number',
  DATE: 'date',
}

export interface RawField {
  id?: string
  name?: string
  dataType?: string
  options?: RawOption[]
}

const PROJECT_META_QUERY = /* GraphQL */ `
  query ProjectMeta($org: String!, $number: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        id
        url
        repositories(first: 20) {
          nodes {
            id
            nameWithOwner
          }
        }
        fields(first: 100) {
          nodes {
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              options {
                id
                name
                color
              }
            }
          }
        }
      }
    }
  }
`

interface ProjectMetaData {
  organization: {
    projectV2: {
      id: string
      url: string
      repositories?: { nodes: (LinkedRepository | null)[] }
      fields: { nodes: (RawField | null)[] }
    } | null
  } | null
}

/**
 * Resolves every field from config.ts by name (case-insensitive). A missing or wrongly typed
 * REQUIRED field throws, naming it; a missing optional field is simply left out.
 */
export function resolveFields(
  project: { id: string; url: string; repositories?: { nodes: (LinkedRepository | null)[] } },
  rawFields: readonly (RawField | null)[],
): ProjectMeta {
  const byName = new Map<string, RawField>()
  for (const field of rawFields) {
    if (field?.id && field.name) byName.set(field.name.trim().toLowerCase(), field)
  }

  const problems: string[] = []
  const found: Partial<Record<FieldKey, RawField>> = {}
  for (const key of Object.keys(FIELD_NAMES) as FieldKey[]) {
    const name = FIELD_NAMES[key]
    const expected = FIELD_DATA_TYPES[key]
    const field = byName.get(name.toLowerCase())
    const required = REQUIRED_FIELDS.includes(key)
    if (field && field.dataType === expected) {
      found[key] = field
    } else if (required) {
      problems.push(
        field
          ? `"${name}" must be a ${FIELD_KIND_LABELS[expected]} field`
          : `"${name}" (${FIELD_KIND_LABELS[expected]}) is missing`,
      )
    }
  }
  if (problems.length > 0) {
    // Listing what GitHub did return makes a renamed field obvious.
    const available = rawFields
      .filter((f): f is RawField => Boolean(f?.name))
      .map(
        (f) => `"${f.name}" (${FIELD_KIND_LABELS[f.dataType ?? ''] ?? f.dataType?.toLowerCase()})`,
      )
      .join(', ')
    throw new ProjectSetupError(
      `The GitHub Project isn't set up as expected: ${problems.join('; ')}. Check the field names in api/_lib/config.ts. The project's fields are: ${available || 'none'}.`,
    )
  }

  const select = (f: RawField): SelectField => ({ id: f.id!, options: f.options ?? [] })
  const plain = (f: RawField): PlainField => ({ id: f.id! })
  const optional = <T>(f: RawField | undefined, make: (f: RawField) => T) =>
    f ? make(f) : undefined

  return {
    projectId: project.id,
    projectUrl: project.url,
    repositories: (project.repositories?.nodes ?? []).filter((r): r is LinkedRepository =>
      Boolean(r?.id && r.nameWithOwner),
    ),
    status: select(found.status!),
    doneBy: plain(found.doneBy!),
    type: optional(found.type, select),
    estimate: optional(found.estimate, plain),
    priority: optional(found.priority, select),
    size: optional(found.size, select),
  }
}

interface CacheEntry {
  expires: number
  promise: Promise<ProjectMeta>
}

/** Per function instance. Holds the in-flight promise too, so parallel callers share it. */
const metaCache = new Map<string, CacheEntry>()

export function clearProjectMetaCache(): void {
  metaCache.clear()
}

/** Project id and fields, cached per function instance for PROJECT_META_TTL_MS. */
export function getProjectMeta(token: string): Promise<ProjectMeta> {
  const { org, projectNumber } = getProjectConfig()
  const cacheKey = `${org}#${projectNumber}`
  const cached = metaCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.promise

  const promise = fetchProjectMeta(token, org, projectNumber)
  metaCache.set(cacheKey, { expires: Date.now() + PROJECT_META_TTL_MS, promise })
  // Never cache a failure.
  promise.catch(() => {
    if (metaCache.get(cacheKey)?.promise === promise) metaCache.delete(cacheKey)
  })
  return promise
}

async function fetchProjectMeta(token: string, org: string, number: number): Promise<ProjectMeta> {
  const data = await graphql<ProjectMetaData>(token, PROJECT_META_QUERY, { org, number })
  const project = data.organization?.projectV2
  // GitHub answers null (not an error) for projects the user can't see.
  if (!project) throw new GitHubApiError('no-access', 200, `project ${org}#${number} not visible`)
  return resolveFields(project, project.fields.nodes)
}

/**
 * Where New task creates issues: ISSUE_REPOSITORY if set, else the project's only linked
 * repository. Throws a ProjectSetupError (safe to show) naming the problem otherwise.
 */
export function issueRepository(meta: ProjectMeta): LinkedRepository {
  const linked = meta.repositories
  const names = linked.map((r) => r.nameWithOwner).join(', ')
  if (ISSUE_REPOSITORY) {
    const wanted = ISSUE_REPOSITORY.trim().toLowerCase()
    const repo = linked.find((r) => r.nameWithOwner.toLowerCase() === wanted)
    if (repo) return repo
    throw new ProjectSetupError(
      `ISSUE_REPOSITORY in api/_lib/config.ts is "${ISSUE_REPOSITORY}", but the GitHub Project isn't linked to that repository. Linked: ${names || 'none'}.`,
    )
  }
  if (linked.length === 1) return linked[0]
  throw new ProjectSetupError(
    linked.length === 0
      ? "New tasks become issues, but the GitHub Project isn't linked to a repository (or you can't see it). Link one in the project's settings."
      : `The GitHub Project links several repositories (${names}). Set ISSUE_REPOSITORY in api/_lib/config.ts to the one new tasks should go in.`,
  )
}

/** The browser's view of the metadata: the option lists and which optional fields exist. */
export function toClientMeta(meta: ProjectMeta): TaskMeta {
  // Statuses carry GitHub's color so badges match the board; other options don't need it.
  const statuses: StatusOption[] = meta.status.options.map((o) =>
    dropUndefined({
      id: o.id,
      name: o.name,
      key: statusKeyOf(o.name),
      color: o.color ?? undefined,
    }),
  )
  const plain = (options: RawOption[] | undefined): Option[] | undefined =>
    options?.map(({ id, name }) => ({ id, name }))
  let repository: string | undefined
  let issueSetupError: string | undefined
  try {
    repository = issueRepository(meta).nameWithOwner
  } catch (err) {
    issueSetupError = err instanceof Error ? err.message : String(err)
  }
  return dropUndefined({
    projectUrl: meta.projectUrl,
    issueRepository: repository,
    issueSetupError,
    hasEstimate: Boolean(meta.estimate),
    statuses,
    priorities: plain(meta.priority?.options),
    sizes: plain(meta.size?.options),
    types: plain(meta.type?.options),
  })
}

/**
 * The site's key for a board status: the key whose name (or older name) the option's name
 * STARTS WITH, case-insensitively, so "Active Backlog (DEADLINE 12-16-26)" is activeBacklog. Longer
 * names are tried first, so one prefix can't shadow a more specific one.
 */
const STATUS_PREFIXES = (Object.entries(STATUS_NAMES) as [StatusKey, readonly string[]][])
  .flatMap(([key, names]) => names.map((name) => [name.toLowerCase(), key] as const))
  .sort((a, b) => b[0].length - a[0].length)

export function statusKeyOf(name: string | null | undefined): StatusKey | null {
  const normalized = name?.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!normalized) return null
  return STATUS_PREFIXES.find(([prefix]) => normalized.startsWith(prefix))?.[1] ?? null
}

// ─── Items ───────────────────────────────────────────────────────────────────

interface RawFieldRef {
  id?: string
}

/** One entry of an item's fieldValues; only the kinds the site reads are queried. */
export type RawFieldValue =
  | {
      __typename: 'ProjectV2ItemFieldSingleSelectValue'
      optionId: string | null
      name: string | null
      field: RawFieldRef
    }
  | { __typename: 'ProjectV2ItemFieldNumberValue'; number: number | null; field: RawFieldRef }
  | { __typename: 'ProjectV2ItemFieldDateValue'; date: string | null; field: RawFieldRef }
  | { __typename: string; field?: RawFieldRef }

/** The node id is only needed server-side (to diff assignees); it's not sent to the browser. */
export interface RawAssignee extends Assignee {
  id?: string
}

export type RawContent =
  | {
      __typename: 'DraftIssue'
      id: string
      title: string
      updatedAt: string
      assignees: { nodes: (RawAssignee | null)[] }
    }
  | {
      __typename: 'Issue' | 'PullRequest'
      id: string
      title: string
      url: string
      number: number
      updatedAt: string
      repository: { nameWithOwner: string }
      assignees: { nodes: (RawAssignee | null)[] }
      /** Drafts can't have labels: they belong to the issue or PR. */
      labels?: { nodes: ({ name: string; color: string } | null)[] }
    }

export interface RawItem {
  id: string
  isArchived: boolean
  updatedAt: string
  /** Null when the item is redacted (content in a repo the user can't see). */
  content: RawContent | null
  fieldValues: { nodes: (RawFieldValue | null)[] }
}

const FIELD_REF = 'field { ... on ProjectV2FieldCommon { id } }'
const ASSIGNEES = 'assignees(first: 20) { nodes { id login avatarUrl } }'
const LABELS =
  'labels(first: 20, orderBy: { field: NAME, direction: ASC }) { nodes { name color } }'

/** Everything the site reads from one project item. Shared by the list and single-item reads. */
const ITEM_SELECTION = /* GraphQL */ `
  id
  isArchived
  updatedAt
  content {
    __typename
    ... on DraftIssue {
      id
      title
      updatedAt
      ${ASSIGNEES}
    }
    ... on Issue {
      id
      title
      url
      number
      updatedAt
      repository { nameWithOwner }
      ${ASSIGNEES}
      ${LABELS}
    }
    ... on PullRequest {
      id
      title
      url
      number
      updatedAt
      repository { nameWithOwner }
      ${ASSIGNEES}
      ${LABELS}
    }
  }
  fieldValues(first: 50) {
    nodes {
      __typename
      ... on ProjectV2ItemFieldSingleSelectValue { optionId name ${FIELD_REF} }
      ... on ProjectV2ItemFieldNumberValue { number ${FIELD_REF} }
      ... on ProjectV2ItemFieldDateValue { date ${FIELD_REF} }
    }
  }
`

const ITEMS_QUERY = /* GraphQL */ `
  query ProjectItems($org: String!, $number: Int!, $after: String) {
    organization(login: $org) {
      projectV2(number: $number) {
        items(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ${ITEM_SELECTION}
          }
        }
      }
    }
  }
`

interface ItemsPage {
  organization: {
    projectV2: {
      items: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        nodes: (RawItem | null)[]
      }
    } | null
  } | null
}

/** Guard against a runaway cursor: 50 pages is 5,000 items, far past any sprint board. */
const MAX_PAGES = 50

export interface ItemList {
  tasks: Task[]
  /**
   * Non-archived items GitHub wouldn't show this user (content redacted: e.g. an issue in a
   * private repo the token can't read). Counted so the UI can say so instead of dropping
   * them silently.
   */
  hiddenCount: number
}

/** Every non-archived item, normalized, 100 per page. */
export async function listItems(token: string): Promise<ItemList> {
  const { org, projectNumber } = getProjectConfig()
  const [meta, raw] = await Promise.all([
    getProjectMeta(token),
    fetchAllItems(token, org, projectNumber),
  ])
  const tasks: Task[] = []
  let hiddenCount = 0
  for (const item of raw) {
    if (item.isArchived) continue
    const task = normalizeItem(item, meta)
    if (task) tasks.push(task)
    else if (!item.content) hiddenCount += 1
  }
  return { tasks, hiddenCount }
}

async function fetchAllItems(token: string, org: string, number: number): Promise<RawItem[]> {
  const items: RawItem[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: ItemsPage = await graphql<ItemsPage>(token, ITEMS_QUERY, { org, number, after })
    const connection = data.organization?.projectV2?.items
    if (!connection)
      throw new GitHubApiError('no-access', 200, `project ${org}#${number} not visible`)
    for (const node of connection.nodes) if (node) items.push(node)
    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) return items
    after = connection.pageInfo.endCursor
  }
  console.warn(`[github] stopped after ${MAX_PAGES} pages of project items`)
  return items
}

const ITEM_QUERY = /* GraphQL */ `
  query ProjectItem($id: ID!) {
    node(id: $id) {
      ... on ProjectV2Item {
        project { id }
        ${ITEM_SELECTION}
      }
    }
  }
`

interface ItemData {
  node: (RawItem & { project?: { id: string } }) | null
}

/**
 * One item of THIS project (the project id is checked, so an id from another project the
 * user can see is treated as not found). Null when it doesn't exist, isn't visible, or is
 * archived.
 */
export async function getItem(
  token: string,
  itemId: string,
  meta: ProjectMeta,
): Promise<{ raw: RawItem; task: Task } | null> {
  const data = await graphql<ItemData>(token, ITEM_QUERY, { id: itemId })
  const raw = data.node
  if (!raw || raw.project?.id !== meta.projectId) return null
  const task = normalizeItem(raw, meta)
  return task ? { raw, task } : null
}

const KINDS = { DraftIssue: 'draft', Issue: 'issue', PullRequest: 'pr' } as const

/**
 * A raw project item → Task, reading field values by the field ids in `meta`. Returns null
 * for archived and redacted items (and any content type the site doesn't handle).
 */
export function normalizeItem(item: RawItem, meta: ProjectMeta): Task | null {
  const content = item.content
  if (item.isArchived || !content || !(content.__typename in KINDS)) return null

  const values = new Map<string, RawFieldValue>()
  for (const value of item.fieldValues.nodes) {
    if (value?.field?.id) values.set(value.field.id, value)
  }
  const selectName = (field: SelectField | undefined): string | undefined => {
    const value = field && values.get(field.id)
    return value && 'name' in value && value.name ? value.name : undefined
  }
  const numberOf = (field: PlainField | undefined): number | undefined => {
    const value = field && values.get(field.id)
    return value && 'number' in value && typeof value.number === 'number' ? value.number : undefined
  }
  const dateOf = (field: PlainField): string | undefined => {
    const value = values.get(field.id)
    return value && 'date' in value ? parseDateKey(value.date) : undefined
  }
  const status = selectName(meta.status) ?? null
  const task: Task = {
    itemId: item.id,
    contentId: content.id,
    kind: KINDS[content.__typename],
    title: content.title,
    assignees: content.assignees.nodes
      .filter((a): a is RawAssignee => a !== null)
      .map((a) => ({ login: a.login, avatarUrl: a.avatarUrl })),
    status,
    statusKey: statusKeyOf(status),
    estimateHours: numberOf(meta.estimate),
    priority: selectName(meta.priority),
    size: selectName(meta.size),
    doneBy: dateOf(meta.doneBy),
    type: selectName(meta.type),
    updatedAt: later(item.updatedAt, content.updatedAt),
  }
  if (content.__typename !== 'DraftIssue') {
    task.url = content.url
    task.repo = content.repository.nameWithOwner
    task.number = content.number
    const labels = labelsOf(content.labels?.nodes)
    if (labels.length > 0) task.labels = labels
  }
  return dropUndefined(task)
}

/**
 * Labels with a usable color. GitHub sends colors as 6-digit hex without "#"; anything else
 * is dropped to "" (shown without a swatch) so it can never reach a style attribute as-is.
 */
export function labelsOf(nodes: ({ name: string; color: string } | null)[] | undefined): Label[] {
  return (nodes ?? [])
    .filter((l): l is { name: string; color: string } => Boolean(l?.name))
    .map((l) => ({
      name: l.name,
      color: /^[0-9a-f]{6}$/i.test(l.color) ? l.color.toLowerCase() : '',
    }))
}

function later(a: string, b: string): string {
  return Date.parse(b) > Date.parse(a) ? b : a
}

/** Keeps the JSON lean and makes "absent" mean absent (not `"x": undefined`). */
function dropUndefined<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] === undefined) delete value[key]
  }
  return value
}

// ─── Team ────────────────────────────────────────────────────────────────────

const TEAM_QUERY = /* GraphQL */ `
  query OrgMembers($org: String!, $after: String) {
    organization(login: $org) {
      membersWithRole(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          login
          name
          avatarUrl
        }
      }
    }
  }
`

interface TeamPage {
  organization: {
    membersWithRole: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: ({ id: string; login: string; name: string | null; avatarUrl: string } | null)[]
    }
  } | null
}

/** Org members for assignee pickers and the Team view, sorted by display name. */
export async function listTeam(token: string): Promise<TeamMember[]> {
  const { org } = getProjectConfig()
  const members: TeamMember[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: TeamPage = await graphql<TeamPage>(token, TEAM_QUERY, { org, after })
    const connection = data.organization?.membersWithRole
    if (!connection) throw new GitHubApiError('no-access', 200, `org ${org} not visible`)
    for (const m of connection.nodes) {
      if (m)
        members.push({ id: m.id, login: m.login, name: m.name || m.login, avatarUrl: m.avatarUrl })
    }
    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break
    after = connection.pageInfo.endCursor
  }
  return members.sort((a, b) => a.name.localeCompare(b.name))
}
