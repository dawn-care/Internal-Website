// Shared with /api (Node ESM): relative imports keep their .js extension.
import {
  BRANCH_FLOW,
  BRANCH_TICKET_PATTERN,
  FOCUS_AREA_LABELS,
  PR_MEDIA_PATTERNS,
  PR_SIZE,
  REQUIRED_APPROVALS,
  UI_FILE_PATTERNS,
  UI_LABELS,
} from '../config/process.js'

/*
 * The team's pull-request rules from src/config/process.ts, as pure functions. Shared by the
 * browser and /api/dashboard.
 */

/** Whether a PR description includes a photo or video. */
export function hasPrMedia(body: string | null | undefined): boolean {
  return !!body && PR_MEDIA_PATTERNS.some((pattern) => pattern.test(body))
}

/**
 * The base branch a PR from `headRef` must target: canary → main, feature branches →
 * canary. Null when the head may never be a PR's head (main).
 */
export function expectedBase(headRef: string): string | null {
  if (BRANCH_FLOW.terminal.includes(headRef)) return null
  return BRANCH_FLOW.promotions[headRef] ?? BRANCH_FLOW.featureBase
}

/** Feature → canary → main. Anything else (e.g. a feature branch straight into main) is flagged. */
export function targetsCorrectBase(headRef: string, baseRef: string): boolean {
  const expected = expectedBase(headRef)
  return expected !== null && expected === baseRef
}

/** A promotion (canary → main) rather than a feature PR. */
export function isReleasePr(headRef: string, baseRef: string): boolean {
  return BRANCH_FLOW.promotions[headRef] === baseRef
}

/** One approval for feature → canary, two for canary → main. */
export function requiredApprovals(headRef: string, baseRef: string): number {
  return isReleasePr(headRef, baseRef) ? REQUIRED_APPROVALS.release : REQUIRED_APPROVALS.feature
}

/** The ticket number a feature branch starts with ("121-caregiver-slug" → 121), else null. */
export function ticketFromBranch(headRef: string): number | null {
  const match = BRANCH_TICKET_PATTERN.exec(headRef)
  return match ? Number(match[1]) : null
}

const lower = (labels: readonly string[]) => new Set(labels.map((l) => l.toLowerCase()))

/** Whether any of a ticket's labels is a focus-area label. */
export function hasFocusAreaLabel(labels: readonly string[]): boolean {
  const wanted = lower(FOCUS_AREA_LABELS)
  return labels.some((l) => wanted.has(l.toLowerCase()))
}

/**
 * Whether a PR changes the UI and so needs a photo or video: its ticket has a UI label, or it
 * changes UI files (outside tests).
 */
export function changesUi(labels: readonly string[], paths: readonly string[]): boolean {
  const ui = lower(UI_LABELS)
  if (labels.some((l) => ui.has(l.toLowerCase()))) return true
  return paths.some(
    (path) =>
      UI_FILE_PATTERNS.some((re) => re.test(path)) && !PR_SIZE.exclude.some((re) => re.test(path)),
  )
}

/** Lines (additions + deletions) and files changed, not counting excluded files. */
export function prSize(
  files: readonly { path: string; additions: number; deletions: number }[],
  exclude: readonly RegExp[] = PR_SIZE.exclude,
): { lines: number; files: number } {
  const counted = files.filter((f) => !exclude.some((re) => re.test(f.path)))
  return {
    lines: counted.reduce((n, f) => n + f.additions + f.deletions, 0),
    files: counted.length,
  }
}

/** Over the PR Size limit (750 lines or 15 files). */
export function isOverSize(size: { lines: number; files: number }): boolean {
  return size.lines > PR_SIZE.maxLines || size.files > PR_SIZE.maxFiles
}
