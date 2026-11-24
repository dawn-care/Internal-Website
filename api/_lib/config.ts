/**
 * Every GitHub Project field and option name the site depends on. Fields are looked up BY
 * NAME at runtime, so renaming one on the project board is a one-line fix here.
 */

export const FIELD_NAMES = {
  status: 'Status',
  estimate: 'Estimate',
  priority: 'Priority',
  size: 'Size',
  doneBy: 'Estimated done date',
  type: 'Type',
} as const

export type FieldKey = keyof typeof FIELD_NAMES

/**
 * Status options the site gives meaning to, by stable key. Other options are just "open".
 * A board option matches when its name STARTS WITH one of these (case-insensitive), so the
 * team can put the deadline in the column name ("Active Backlog (DEADLINE 12-16-26)") without breaking
 * the site. The first name of each key is the one the site writes about; later ones are
 * older names still accepted (the sandbox project still says "Sprint Backlog").
 */
export const STATUS_NAMES = {
  productBacklog: ['Product Backlog'],
  activeBacklog: ['Active Backlog', 'Sprint Backlog'],
  inProgress: ['In progress'],
  inReview: ['In review'],
  done: ['Done'],
  blocked: ['Blocked'],
} as const satisfies Record<string, readonly string[]>

export type StatusKey = keyof typeof STATUS_NAMES

/**
 * The statuses a deadline needs empty (Development Methodology: "Active Backlog, In Progress
 * and In Review should be empty"), in board order.
 */
export const DEADLINE_STATUSES: readonly StatusKey[] = ['activeBacklog', 'inProgress', 'inReview']

/**
 * New tasks become issues in the repository linked to the project. When the project links
 * exactly one repository, it's used automatically; if it links several, name the one to use
 * here ("owner/name"). Null = use the only linked repository.
 */
export const ISSUE_REPOSITORY: string | null = null

/** GitHub date fields are calendar dates; "today" is judged in the team's time zone. */
export const TEAM_TIME_ZONE = 'America/New_York'

/** How long project metadata (field ids and options) is cached per instance. */
export const PROJECT_META_TTL_MS = 5 * 60 * 1000

/** Fields the site can't work without. Estimate, Priority, Size and Type are optional. */
export const REQUIRED_FIELDS: readonly FieldKey[] = ['status', 'doneBy']

/**
 * The /artifacts pages show the Markdown files in this public repository's branch. The site
 * only reads it; documents link back to it for files the site doesn't show.
 */
export const ARTIFACTS_REPOSITORY = {
  owner: 'dawn-care',
  name: 'Artifacts',
  branch: 'main',
} as const
