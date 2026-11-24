import type { StatusKey } from '../config.js'

/**
 * The /api/tasks response. Mirrored for the browser in src/lib/tasks/types.ts: keep the two
 * in sync.
 */

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
  /** The project item id (what field edits target). */
  itemId: string
  /** The draft issue, issue, or pull request id. */
  contentId: string
  kind: 'draft' | 'issue' | 'pr'
  title: string
  /** Issues and PRs only; drafts live on the project board. */
  url?: string
  /** "owner/name", issues and PRs only. */
  repo?: string
  number?: number
  assignees: Assignee[]
  /** The Status option's name, or null when unset. */
  status: string | null
  /** The status's role (Done, Blocked, …) from the server config, so renames stay one-line. */
  statusKey: StatusKey | null
  estimateHours?: number
  priority?: string
  size?: string
  /** "Estimated done date", as "YYYY-MM-DD". */
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
  /** GitHub's option color (GRAY, BLUE, GREEN, …), so badges match the board. */
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
  /** Optional fields are omitted when the project doesn't have them. */
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
 * PATCH /api/tasks/:itemId body. Every key is optional; null clears a field. Title, body,
 * and assignees apply to drafts; assignees also to issues; pull requests take fields only.
 * `assigneeIds` is the complete new set.
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
  /** Null if the item couldn't be re-read after writing (the writes still happened). */
  task: Task | null
  /** Display names ("Priority", "Assignees", …) of changes GitHub rejected. */
  failedFields: string[]
}
