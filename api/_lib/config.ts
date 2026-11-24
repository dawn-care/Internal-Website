/**
 * Every GitHub Project field and option name the site depends on. Fields are looked up BY
 * NAME at runtime, so renaming one on the project board is a one-line fix here.
 */

export const FIELD_NAMES = {
  status: 'Status',
  iteration: 'Iteration',
  estimate: 'Estimate',
  priority: 'Priority',
  size: 'Size',
  doneBy: 'Estimated done date',
  type: 'Type',
} as const

export type FieldKey = keyof typeof FIELD_NAMES

/** Status options the site gives meaning to, by stable key. Other options are just "open". */
export const STATUS_NAMES = {
  productBacklog: 'Product Backlog',
  sprintBacklog: 'Sprint Backlog',
  inProgress: 'In progress',
  inReview: 'In review',
  done: 'Done',
  blocked: 'Blocked',
} as const

export type StatusKey = keyof typeof STATUS_NAMES

/**
 * New tasks become issues in the repository linked to the project. When the project links
 * exactly one repository, it's used automatically; if it links several, name the one to use
 * here ("owner/name"). Null = use the only linked repository.
 */
export const ISSUE_REPOSITORY: string | null = null

/** The burndown's unit: the Estimate field, in hours. Stored with each day so units never mix. */
export const BURNDOWN_UNIT = 'estimateHours' as const

/** GitHub date fields are calendar dates; "today" is judged in the team's time zone. */
export const TEAM_TIME_ZONE = 'America/New_York'

/** How long project metadata (field ids, options, iterations) is cached per instance. */
export const PROJECT_META_TTL_MS = 5 * 60 * 1000

/** Fields the site can't work without. Estimate is the burndown's unit, so it's required. */
export const REQUIRED_FIELDS: readonly FieldKey[] = ['status', 'iteration', 'doneBy', 'estimate']

/**
 * The /artifacts pages show the Markdown files in this public repository's branch. The site
 * only reads it; documents link back to it for files the site doesn't show.
 */
export const ARTIFACTS_REPOSITORY = {
  owner: 'dawn-care',
  name: 'Artifacts',
  branch: 'main',
} as const
