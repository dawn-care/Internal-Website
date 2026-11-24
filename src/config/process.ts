/*
 * The team's pull-request process, from the Development Methodology doc (dawn-care/Artifacts).
 * Shared by the browser and the server (/api/dashboard) and by the PR metrics, so keep this
 * file free of browser-only code and imports.
 */

/**
 * Approvals a PR needs before it may merge: one for a feature branch into canary, two for
 * canary into main (GitHub enforces both). See requiredApprovals in src/lib/prRules.
 */
export const REQUIRED_APPROVALS = { feature: 1, release: 2 } as const

/**
 * A requested review is late after this many business days (Mon–Fri, America/New_York):
 * the "reviewed within 24 business hours" target of the Review and Merge Time metric.
 */
export const REVIEW_SLA_BUSINESS_DAYS = 1

/**
 * "If the change affects the UI, photos or videos will be added to the pull request
 * description." Any of these counts as a photo or video: an image (Markdown or <img>), a
 * GitHub upload (github.com/user-attachments), a video file, YouTube, Loom or Google Drive.
 */
export const PR_MEDIA_PATTERNS: readonly RegExp[] = [
  /!\[[^\]]*\]\([^)]+\)/,
  /<(img|video)\b/i,
  /\bgithub\.com\/user-attachments\/(assets|files)\//i,
  /\.(png|jpe?g|gif|webp|mp4|mov|webm)(?=$|[?#)\s"'>\]])/i,
  /\b(?:www\.|m\.)?youtube\.com\/(?:watch|shorts|embed|live)\b/i,
  /\byoutu\.be\//i,
  /\bloom\.com\/(?:share|embed)\//i,
  /\bdrive\.google\.com\//i,
]

/** Ticket labels that mean the PR changes the UI (so it needs a photo or video). */
export const UI_LABELS: readonly string[] = ['Frontend', 'UI/UX']

/** Changed files that mean the PR changes the UI, when the ticket's labels don't say. */
export const UI_FILE_PATTERNS: readonly RegExp[] = [/\.(tsx|jsx|css|scss|html)$/i]

/**
 * The focus-area labels every ticket carries (project + technical labels). A PR's ticket
 * needs at least one, or the PR counts toward no focus area in the PR metrics. Must match
 * the keys of PR_METRICS_RULES.focusOwners (a test checks).
 */
export const FOCUS_AREA_LABELS: readonly string[] = [
  'Caregiver',
  'Carepartner',
  'Staff Member',
  'Frontend',
  'UI/UX',
  'Server',
  'Cloud',
  'Security',
]

/** "Each feature branch starts with the issue number of that ticket": 121-caregiver-slug. */
export const BRANCH_TICKET_PATTERN = /^(\d+)-/

/**
 * PR Size: "90% of PRs have <= 750 LOC and <= 15 files changed", not counting docs, tests,
 * lockfiles, generated docs or images.
 */
export const PR_SIZE = {
  maxLines: 750,
  maxFiles: 15,
  exclude: [
    /\.md$/,
    /(_test\.go|\.test\.[jt]sx?|\.spec\.[jt]sx?)$/,
    /__tests__\//,
    /(^|\/)tests?\//,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /go\.sum$/,
    /^server\/cmd\/docs\//,
    /\.(snap|svg|png|jpe?g)$/,
  ] as RegExp[],
} as const

/**
 * Branch flow: feature branch → canary → main. The base each head branch must target;
 * anything not named here is a feature branch and targets `featureBase`.
 */
export const BRANCH_FLOW = {
  /** Where feature branches merge. */
  featureBase: 'canary',
  /** Head branch → the only base it may target. */
  promotions: { canary: 'main' } as Record<string, string>,
  /** Branches that are never a PR's head (nothing merges out of main). */
  terminal: ['main'] as readonly string[],
} as const
