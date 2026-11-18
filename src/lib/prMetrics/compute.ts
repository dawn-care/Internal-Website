import { businessHoursBetween } from '../businessTime'
import { zonedDateKey } from '../teamTime'
import { balanceFlags } from './selectors'
import type {
  IterationMetrics,
  PrMetricsFile,
  PrMetricsRules,
  PullRequestsFile,
  RawPullRequest,
} from './types'

/*
 * Turns DAWN's raw metrics/pull-requests.json into the five PR metrics, using the rules in
 * src/config/prMetrics.ts. Pure: the caller passes `now`.
 */

/**
 * A PR's ticket labels: its linked issues' labels, else the labels of the issue its branch
 * starts with, plus the PR's own labels. De-duplicated.
 */
export function ticketLabels(pr: RawPullRequest): string[] {
  const labels = new Set(pr.labels)
  const issues =
    pr.closingIssues.length > 0 ? pr.closingIssues : pr.branchIssue ? [pr.branchIssue] : []
  for (const issue of issues) for (const label of issue.labels) labels.add(label)
  return [...labels]
}

/** Merged, authored by a team member (a person), and not a canary → main release merge. */
export function inScope(pr: RawPullRequest, rules: PrMetricsRules): boolean {
  if (pr.authorType !== 'User' || !pr.author || !rules.team.includes(pr.author)) return false
  return !(pr.head === 'canary' && pr.base === 'main')
}

/** The iteration whose inclusive dates contain the PR's merge date (America/New_York). */
export function iterationFor(
  mergedAt: string,
  iterations: PrMetricsRules['iterations'],
): PrMetricsRules['iterations'][number] | undefined {
  const key = zonedDateKey(new Date(mergedAt))
  return iterations.find((it) => it.start <= key && key <= it.end)
}

/** Lines (additions + deletions) and files changed, over files not matching `sizeExclude`. */
export function prSize(
  files: RawPullRequest['files'],
  sizeExclude: RegExp[],
): { lines: number; files: number } {
  const counted = files.filter((f) => !sizeExclude.some((re) => re.test(f.path)))
  return {
    lines: counted.reduce((n, f) => n + f.additions + f.deletions, 0),
    files: counted.length,
  }
}

/** Submitted reviews by people other than the PR's author (no bots). */
function peerReviews(pr: RawPullRequest) {
  return pr.reviews.filter(
    (r): r is typeof r & { author: string; submittedAt: string } =>
      r.authorType === 'User' && !!r.author && r.author !== pr.author && !!r.submittedAt,
  )
}

/** When the PR became reviewable: the last ready-for-review, else when it was opened. */
function reviewableAt(pr: RawPullRequest): Date {
  return new Date(pr.readyAt ?? pr.createdAt)
}

/** Business hours to the first peer review (any state), or null if nobody reviewed it. */
export function hoursToFirstReview(pr: RawPullRequest): number | null {
  const times = peerReviews(pr).map((r) => new Date(r.submittedAt).getTime())
  if (times.length === 0) return null
  return businessHoursBetween(reviewableAt(pr), new Date(Math.min(...times)))
}

export function hoursToMerge(pr: RawPullRequest): number {
  return businessHoursBetween(reviewableAt(pr), new Date(pr.mergedAt))
}

/** Team members who reviewed the PR (any state), once each, in team order. */
export function teamReviewers(pr: RawPullRequest, rules: PrMetricsRules): string[] {
  const logins = new Set(peerReviews(pr).map((r) => r.author))
  return rules.team.filter((login) => logins.has(login))
}

/** One iteration's metrics from its in-scope PRs. */
export function computeIteration(
  iteration: PrMetricsRules['iterations'][number],
  prs: RawPullRequest[],
  rules: PrMetricsRules,
  today: string,
): IterationMetrics {
  const { team, targets: t } = rules
  const focusLabels = new Set(Object.keys(rules.focusOwners))
  const perPerson = <T>(make: () => T) =>
    Object.fromEntries(team.map((login) => [login, make()])) as Record<string, T>

  const size = { total: prs.length, within: 0, overLinesOnly: 0, overFilesOnly: 0, overBoth: 0 }
  const byAuthor = perPerson(() => ({ within: 0, total: 0 }))
  const speed = { total: prs.length, reviewedWithin: 0, mergedWithin: 0 }
  const authored = perPerson(() => 0)
  const reviewed = perPerson(() => 0)
  const coverage: IterationMetrics['coverage'] = {
    labeled: 0,
    covered: 0,
    unlabeled: 0,
    misses: [],
  }
  const breadth = perPerson(
    () => Object.fromEntries(rules.breadthLabels.map((l) => [l, 0])) as Record<string, number>,
  )

  for (const pr of prs) {
    const author = pr.author!
    // 1. Size
    const { lines, files } = prSize(pr.files, rules.sizeExclude)
    const overLines = lines > t.size.maxLines
    const overFiles = files > t.size.maxFiles
    if (overLines && overFiles) size.overBoth += 1
    else if (overLines) size.overLinesOnly += 1
    else if (overFiles) size.overFilesOnly += 1
    else size.within += 1
    byAuthor[author].total += 1
    if (!overLines && !overFiles) byAuthor[author].within += 1

    // 2. Speed
    const firstReview = hoursToFirstReview(pr)
    if (firstReview !== null && firstReview <= t.speed.firstReviewHours) speed.reviewedWithin += 1
    if (hoursToMerge(pr) <= t.speed.mergeHours) speed.mergedWithin += 1

    // 3. Balance
    const reviewers = teamReviewers(pr, rules)
    authored[author] += 1
    for (const login of reviewers) reviewed[login] += 1

    // 4. Coverage: each PR once; unlabeled PRs skip coverage and breadth.
    const labels = ticketLabels(pr)
    const prFocus = labels.filter((label) => focusLabels.has(label))
    if (prFocus.length === 0) {
      coverage.unlabeled += 1
      continue
    }
    coverage.labeled += 1
    const people = new Set([author, ...reviewers])
    const covered = prFocus.some((label) =>
      rules.focusOwners[label].some((owner) => people.has(owner)),
    )
    if (covered) coverage.covered += 1
    else {
      coverage.misses.push({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        labels: prFocus,
        author,
        reviewers,
      })
    }

    // 5. Breadth
    for (const label of rules.breadthLabels) {
      if (!labels.includes(label)) continue
      for (const login of people) breadth[login][label] += 1
    }
  }

  const evenShare = team.length > 0 ? prs.length / team.length : 0
  const min = t.balance.minFactor * evenShare
  const max = t.balance.maxFactor * evenShare

  return {
    name: iteration.name,
    start: iteration.start,
    end: iteration.end,
    current: iteration.start <= today && today <= iteration.end,
    prCount: prs.length,
    size: { ...size, byAuthor },
    speed,
    balance: {
      evenShare,
      min,
      max,
      people: perPersonFrom(team, (login) => ({
        authored: authored[login],
        reviewed: reviewed[login],
        flags: balanceFlags(authored[login], reviewed[login], min, max),
      })),
    },
    coverage,
    breadth: {
      people: perPersonFrom(team, (login) => ({
        counts: breadth[login],
        labelsCovered: Object.values(breadth[login]).filter((n) => n > 0).length,
      })),
    },
  }
}

function perPersonFrom<T>(team: string[], make: (login: string) => T): Record<string, T> {
  return Object.fromEntries(team.map((login) => [login, make(login)]))
}

/** The metrics for every iteration that has started by `now`, oldest first. */
export function computePrMetrics(
  raw: PullRequestsFile,
  rules: PrMetricsRules,
  now: Date,
): PrMetricsFile {
  const today = zonedDateKey(now)
  const scoped = raw.pullRequests.filter((pr) => inScope(pr, rules))
  return {
    generatedAt: raw.generatedAt,
    repo: raw.repo,
    targets: rules.targets,
    breadthLabels: rules.breadthLabels,
    focusOwners: rules.focusOwners,
    team: rules.team,
    iterations: rules.iterations
      .filter((it) => it.start <= today)
      .map((it) =>
        computeIteration(
          it,
          scoped.filter((pr) => iterationFor(pr.mergedAt, rules.iterations) === it),
          rules,
          today,
        ),
      ),
  }
}
