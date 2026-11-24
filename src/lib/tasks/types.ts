/**
 * The /api/tasks response, as the browser sees it. Mirrors api/_lib/github/types.ts: keep
 * the two in sync.
 */

/** A status's role, from the server config. Other statuses are simply "open". */
export type StatusKey =
  'productBacklog' | 'activeBacklog' | 'inProgress' | 'inReview' | 'done' | 'blocked'

export interface Assignee {
  login: string
  avatarUrl: string
}

/** An issue or PR label. */
export interface Label {
  name: string
  /** GitHub's hex color, lowercase and without "#" (e.g. "d73a4a"); "" if unusable. */
  color: string
}

export interface Task {
  itemId: string
  contentId: string
  kind: 'draft' | 'issue' | 'pr'
  title: string
  /** Issues and PRs only; drafts live on the project board. */
  url?: string
  repo?: string
  number?: number
  assignees: Assignee[]
  status: string | null
  statusKey: StatusKey | null
  estimateHours?: number
  priority?: string
  size?: string
  /** "Estimated done date" ("Done by" in the UI), as "YYYY-MM-DD". */
  doneBy?: string
  type?: string
  /** Issues and PRs only (drafts can't have labels), sorted by name. Absent when none. */
  labels?: Label[]
  updatedAt: string
}

export interface Option {
  id: string
  name: string
}

export interface StatusOption extends Option {
  key: StatusKey | null
  /** GitHub's option color (GRAY, BLUE, …). Unknown or missing renders as GRAY. */
  color?: string
}

export interface TaskMeta {
  projectUrl: string
  /** "owner/name" where New task creates issues. Absent when that can't be worked out. */
  issueRepository?: string
  /** Why New task can't create issues (e.g. no linked repository). Safe to show. */
  issueSetupError?: string
  /** False when the project has no Estimate field: hide estimate inputs. */
  hasEstimate: boolean
  statuses: StatusOption[]
  /** Optional fields are absent when the project doesn't have them: hide their UI. */
  priorities?: Option[]
  sizes?: Option[]
  types?: Option[]
}

export interface TeamMember {
  id: string
  login: string
  name: string
  avatarUrl: string
}

export interface TasksResponse {
  tasks: Task[]
  /** Items GitHub hid from this user (e.g. issues in a private repo they can't read). */
  hiddenCount: number
  meta: TaskMeta
  team: TeamMember[]
}

/** POST /api/tasks body. Option ids come from TaskMeta. */
export interface NewTaskRequest {
  title: string
  body?: string
  assigneeIds?: string[]
  estimateHours?: number
  priorityOptionId?: string
  sizeOptionId?: string
  /** "YYYY-MM-DD". */
  doneBy?: string
  typeOptionId?: string
  /** Omit for the default: Product Backlog. */
  statusOptionId?: string
}

/**
 * PATCH /api/tasks/:itemId body. Null clears a field. Title, body, and assignees apply to
 * drafts; assignees also to issues; pull requests take fields only. `assigneeIds` is the
 * complete new set.
 */
export interface TaskPatch {
  title?: string
  body?: string
  assigneeIds?: string[]
  estimateHours?: number | null
  priorityOptionId?: string | null
  sizeOptionId?: string | null
  doneBy?: string | null
  typeOptionId?: string | null
  statusOptionId?: string | null
}

/** The response to a write: the item as GitHub now has it, and anything that didn't stick. */
export interface WriteResult {
  /** Null if the server couldn't re-read the item after writing (the writes still happened). */
  task: Task | null
  /** Display names ("Priority", "Assignees", …) of changes GitHub rejected. */
  failedFields: string[]
}
