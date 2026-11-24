import { isPastSla } from '../../../src/lib/businessTime.js'
import {
  changesUi,
  hasFocusAreaLabel,
  hasPrMedia,
  isOverSize,
  isReleasePr,
  prSize,
  requiredApprovals,
  targetsCorrectBase,
  ticketFromBranch,
} from '../../../src/lib/prRules.js'
import { graphql } from './graphql.js'

/*
 * Pull requests for the Developer dashboard, from GitHub's search (type: ISSUE) scoped to the
 * org, checked against the Development Methodology (src/config/process.ts, src/lib/prRules).
 * PR bodies are read only to detect a photo or video; they're never sent to the client.
 */

export type CiState = 'SUCCESS' | 'FAILURE' | 'PENDING'

export interface PrReview {
  author: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  submittedAt: string | null
}

/** Fields every dashboard PR has. Mirrored for the browser with the dashboard types. */
export interface DashboardPr {
  id: string
  title: string
  url: string
  /** "owner/name". */
  repo: string
  number: number
  author: string | null
  /** The author's GitHub avatar; null when unknown. */
  authorAvatarUrl: string | null
  isDraft: boolean
  createdAt: string
  baseRefName: string
  headRefName: string
  /** Pending review requests: user logins, or "org/team" for teams. */
  requestedReviewers: string[]
  /** Each reviewer's latest review. */
  reviews: PrReview[]
  /** Distinct reviewers: requested plus those who already reviewed (never the author). */
  reviewerCount: number
  /** Latest reviews that approve (never the author's). */
  approvals: number
  /** 1 for feature → canary, 2 for canary → main. */
  requiredApprovals: number
  /** canary → main. */
  isRelease: boolean
  /** The head commit's combined checks; null when it has none. */
  ciState: CiState | null
  /** Feature → canary, canary → main. */
  targetsCorrectBase: boolean
  /**
   * The PR's ticket: the first issue it closes ("Closes #121"), else the issue number its
   * branch starts with. `labels` is null when only the branch names it (labels unknown).
   * Null for a feature PR with neither; release PRs have no ticket.
   */
  ticket: { number: number; linked: boolean; labels: string[] | null } | null
  /** The ticket's labels are known and include no focus-area label. */
  missingFocusLabel: boolean
  /** Counted like the PR Size metric (no docs, tests, lockfiles or images). */
  size: { lines: number; files: number; over: boolean }
  /** It changes the UI (UI label on the ticket, or UI files), so it needs a photo or video. */
  needsMedia: boolean
  /** The description has a photo or video. */
  hasMedia: boolean
}

export interface ReviewQueuePr extends DashboardPr {
  /** When my review was requested (latest request); the PR's createdAt if unknown. */
  waitingSince: string
  /** A full business day has passed since waitingSince. */
  isPastSla: boolean
}

export interface MyPr extends DashboardPr {
  changesRequested: number
}

/** A canary → main merge (release), open or merged. */
export interface ReleasePr {
  title: string
  url: string
  repo: string
  number: number
  isDraft: boolean
  approvals: number
  requiredApprovals: number
  ciState: CiState | null
  /** Null while open. */
  mergedAt: string | null
}

export interface ReleaseStatus {
  /** Open canary → main PRs in the org. */
  open: ReleasePr[]
  /** canary → main merges since the deadline started, newest first. */
  merged: ReleasePr[]
}

// ─── Raw GraphQL shapes ──────────────────────────────────────────────────────

type RawReviewer =
  | { __typename: 'User' | 'Mannequin' | 'Bot'; login: string }
  | { __typename: 'Team'; slug: string; organization?: { login: string } | null }
  | { __typename: string }
  | null

export interface RawPullRequest {
  __typename?: string
  id: string
  title: string
  url: string
  number: number
  isDraft: boolean
  createdAt: string
  mergedAt?: string | null
  baseRefName: string
  headRefName: string
  body: string | null
  changedFiles?: number
  files?: { nodes: ({ path: string; additions: number; deletions: number } | null)[] } | null
  labels?: { nodes: ({ name: string } | null)[] } | null
  closingIssuesReferences?: {
    nodes: ({ number: number; labels: { nodes: ({ name: string } | null)[] } | null } | null)[]
  } | null
  repository: { nameWithOwner: string }
  author: { login: string; avatarUrl?: string | null } | null
  reviewRequests: { nodes: ({ requestedReviewer: RawReviewer } | null)[] } | null
  latestReviews: {
    nodes: ({
      state: string
      submittedAt: string | null
      author: { login: string } | null
    } | null)[]
  } | null
  timelineItems: {
    nodes: ({ createdAt: string; requestedReviewer: RawReviewer } | null)[]
  } | null
  commits: {
    nodes: ({ commit: { statusCheckRollup: { state: string } | null } } | null)[]
  } | null
}

const PR_FIELDS = `
  __typename
  ... on PullRequest {
    id
    title
    url
    number
    isDraft
    createdAt
    mergedAt
    baseRefName
    headRefName
    body
    changedFiles
    files(first: 100) { nodes { path additions deletions } }
    labels(first: 20) { nodes { name } }
    closingIssuesReferences(first: 5) {
      nodes { number labels(first: 20) { nodes { name } } }
    }
    repository { nameWithOwner }
    author { login avatarUrl(size: 64) }
    reviewRequests(first: 20) {
      nodes { requestedReviewer { ...Reviewer } }
    }
    latestReviews(first: 20) {
      nodes { state submittedAt author { login } }
    }
    timelineItems(itemTypes: [REVIEW_REQUESTED_EVENT], last: 20) {
      nodes { ... on ReviewRequestedEvent { createdAt requestedReviewer { ...Reviewer } } }
    }
    commits(last: 1) {
      nodes { commit { statusCheckRollup { state } } }
    }
  }
`

const PR_SEARCH_QUERY = `
  query DashboardPullRequests($query: String!) {
    search(type: ISSUE, query: $query, first: 50) {
      nodes { ${PR_FIELDS} }
    }
  }
  fragment Reviewer on RequestedReviewer {
    __typename
    ... on User { login }
    ... on Bot { login }
    ... on Mannequin { login }
    ... on Team { slug organization { login } }
  }
`

interface SearchData {
  search: { nodes: (RawPullRequest | Record<string, never> | null)[] }
}

async function searchPullRequests(token: string, query: string): Promise<RawPullRequest[]> {
  const data = await graphql<SearchData>(token, PR_SEARCH_QUERY, { query })
  // Null nodes: results the token can't read (e.g. a repo the app isn't installed on).
  return (data.search?.nodes ?? []).filter(
    (n): n is RawPullRequest => !!n && (n as RawPullRequest).__typename === 'PullRequest',
  )
}

// ─── Normalization ───────────────────────────────────────────────────────────

function reviewerName(reviewer: RawReviewer): string | null {
  if (!reviewer) return null
  if ('login' in reviewer && typeof reviewer.login === 'string') return reviewer.login
  if ('slug' in reviewer && typeof reviewer.slug === 'string') {
    return reviewer.organization?.login
      ? `${reviewer.organization.login}/${reviewer.slug}`
      : reviewer.slug
  }
  return null
}

const REVIEW_STATES = new Set<PrReview['state']>([
  'APPROVED',
  'CHANGES_REQUESTED',
  'COMMENTED',
  'DISMISSED',
  'PENDING',
])

export function ciStateOf(rollup: string | null | undefined): CiState | null {
  switch (rollup) {
    case 'SUCCESS':
      return 'SUCCESS'
    case 'FAILURE':
    case 'ERROR':
      return 'FAILURE'
    case 'PENDING':
    case 'EXPECTED':
      return 'PENDING'
    default:
      return null
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function normalizePr(raw: RawPullRequest): DashboardPr {
  const author = raw.author?.login ?? null
  const requestedReviewers = (raw.reviewRequests?.nodes ?? [])
    .map((n) => reviewerName(n?.requestedReviewer ?? null))
    .filter((name): name is string => name !== null)
  const reviews: PrReview[] = []
  for (const node of raw.latestReviews?.nodes ?? []) {
    const login = node?.author?.login
    if (!node || !login || !REVIEW_STATES.has(node.state as PrReview['state'])) continue
    reviews.push({
      author: login,
      state: node.state as PrReview['state'],
      submittedAt: node.submittedAt,
    })
  }
  const reviewers = new Set(
    [...requestedReviewers, ...reviews.map((r) => r.author)]
      .filter((name) => !author || !same(name, author))
      .map((name) => name.toLowerCase()),
  )
  const rollup = raw.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state
  const release = isReleasePr(raw.headRefName, raw.baseRefName)
  const ticket = release ? null : ticketOf(raw)
  // The PR's own labels count too, as in the PR metrics.
  const labels = [...names(raw.labels?.nodes), ...(ticket?.labels ?? [])]
  const files = (raw.files?.nodes ?? []).filter((f): f is NonNullable<typeof f> => !!f)
  const counted = prSize(files)
  // More files than GitHub listed: the PR is over the file limit whatever they are.
  const unlisted = (raw.changedFiles ?? files.length) > files.length
  return {
    id: raw.id,
    title: raw.title,
    url: raw.url,
    repo: raw.repository.nameWithOwner,
    number: raw.number,
    author,
    authorAvatarUrl: raw.author?.avatarUrl ?? null,
    isDraft: raw.isDraft,
    createdAt: raw.createdAt,
    baseRefName: raw.baseRefName,
    headRefName: raw.headRefName,
    requestedReviewers,
    reviews,
    reviewerCount: reviewers.size,
    approvals: approvalsOf(reviews, author),
    requiredApprovals: requiredApprovals(raw.headRefName, raw.baseRefName),
    isRelease: release,
    ciState: ciStateOf(rollup),
    targetsCorrectBase: targetsCorrectBase(raw.headRefName, raw.baseRefName),
    ticket,
    missingFocusLabel: !!ticket && ticket.labels !== null && !hasFocusAreaLabel(labels),
    size: { ...counted, over: unlisted || isOverSize(counted) },
    needsMedia:
      !release &&
      changesUi(
        labels,
        files.map((f) => f.path),
      ),
    hasMedia: hasPrMedia(raw.body),
  }
}

function names(nodes: ({ name: string } | null)[] | undefined): string[] {
  return (nodes ?? []).flatMap((n) => (n?.name ? [n.name] : []))
}

function approvalsOf(reviews: PrReview[], author: string | null): number {
  return reviews.filter((r) => r.state === 'APPROVED' && (!author || !same(r.author, author)))
    .length
}

function ticketOf(raw: RawPullRequest): DashboardPr['ticket'] {
  const linked = (raw.closingIssuesReferences?.nodes ?? []).find((n) => n !== null)
  if (linked) {
    return { number: linked.number, linked: true, labels: names(linked.labels?.nodes) }
  }
  const fromBranch = ticketFromBranch(raw.headRefName)
  return fromBranch === null ? null : { number: fromBranch, linked: false, labels: null }
}

/** When `login`'s review was last requested (by user, not via a team); else the PR's createdAt. */
export function waitingSinceFor(raw: RawPullRequest, login: string): string {
  let latest: string | undefined
  for (const node of raw.timelineItems?.nodes ?? []) {
    const name = reviewerName(node?.requestedReviewer ?? null)
    if (!node || !name || !same(name, login)) continue
    if (!latest || node.createdAt > latest) latest = node.createdAt
  }
  return latest ?? raw.createdAt
}

export function toReviewQueuePr(raw: RawPullRequest, login: string, now: Date): ReviewQueuePr {
  const waitingSince = waitingSinceFor(raw, login)
  return {
    ...normalizePr(raw),
    waitingSince,
    isPastSla: isPastSla(new Date(waitingSince), now),
  }
}

export function toMyPr(raw: RawPullRequest): MyPr {
  const pr = normalizePr(raw)
  return {
    ...pr,
    changesRequested: pr.reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length,
  }
}

export function toReleasePr(raw: RawPullRequest): ReleasePr {
  const pr = normalizePr(raw)
  return {
    title: pr.title,
    url: pr.url,
    repo: pr.repo,
    number: pr.number,
    isDraft: pr.isDraft,
    approvals: pr.approvals,
    requiredApprovals: pr.requiredApprovals,
    ciState: pr.ciState,
    mergedAt: raw.mergedAt ?? null,
  }
}

/**
 * The deadline's release: open canary → main PRs in the org, and those merged since
 * `sinceKey` ("YYYY-MM-DD", the deadline's start). Development Methodology: "A merge from
 * canary to main should be performed" by each deadline.
 */
export async function listReleaseStatus(
  token: string,
  org: string,
  sinceKey: string,
): Promise<ReleaseStatus> {
  const scope = `is:pr archived:false head:canary base:main org:${org}`
  const [open, merged] = await Promise.all([
    searchPullRequests(token, `${scope} is:open`),
    searchPullRequests(token, `${scope} is:merged merged:>=${sinceKey}`),
  ])
  return {
    open: open.map(toReleasePr),
    merged: merged
      .map(toReleasePr)
      .sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? '')),
  }
}

/** Open PRs in `org` waiting on my review, oldest request first. */
export async function listReviewQueue(
  token: string,
  org: string,
  login: string,
  now = new Date(),
): Promise<ReviewQueuePr[]> {
  const raw = await searchPullRequests(
    token,
    `is:pr is:open archived:false review-requested:@me org:${org}`,
  )
  return raw
    .map((pr) => toReviewQueuePr(pr, login, now))
    .sort((a, b) => a.waitingSince.localeCompare(b.waitingSince))
}

/** My open PRs in `org`, newest first. */
export async function listMyPrs(token: string, org: string): Promise<MyPr[]> {
  const raw = await searchPullRequests(token, `is:pr is:open archived:false author:@me org:${org}`)
  return raw.map(toMyPr).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
