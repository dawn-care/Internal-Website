/** metrics/shame.json, as documented in dawn-care/DAWN's .github/scripts/shame/README.md. */
export interface ShameFile {
  /** Category id → label. Group by the id (ids never change), show the label. */
  categories: Record<string, string>
  /** Every shame, oldest first. */
  shames: ShameEntry[]
  updatedAt?: string
}

export interface ShameEntry {
  /** When the bot recorded it (ISO, UTC). */
  at: string
  /** GitHub login of the person shamed. */
  login: string
  /** One of `categories`' ids. */
  category: string
  /** What caught it: behemoth, late_night, slow_review, no_reviewer, idle_author or manual. */
  type: string
  /** The PR number, for shames about a PR. */
  pr?: number
  /** Manual shames only: what the shamer typed. */
  reason?: string
  /** Manual shames only: the shamer's GitHub login. */
  by?: string
  /** Manual shames only: the endorsers' GitHub logins. */
  endorsedBy?: string[]
}
