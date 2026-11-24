import { describe, expect, it } from 'vitest'
import { zonedInstant } from '../../../src/lib/teamTime.js'
import {
  ciStateOf,
  normalizePr,
  toMyPr,
  toReleasePr,
  toReviewQueuePr,
  waitingSinceFor,
  type RawPullRequest,
} from './pulls.js'

function rawPr(overrides: Partial<RawPullRequest> = {}): RawPullRequest {
  return {
    __typename: 'PullRequest',
    id: 'PR_1',
    title: 'Bigger clock font',
    url: 'https://github.com/dawn/app/pull/12',
    number: 12,
    isDraft: false,
    createdAt: '2026-09-25T14:00:00Z',
    baseRefName: 'canary',
    headRefName: 'feature/clock-font',
    body: null,
    repository: { nameWithOwner: 'dawn/app' },
    author: { login: 'ada' },
    reviewRequests: null,
    latestReviews: null,
    timelineItems: null,
    commits: null,
    ...overrides,
  }
}

describe('normalizePr', () => {
  it('handles a PR with no reviews, requests, or checks', () => {
    expect(normalizePr(rawPr())).toEqual({
      id: 'PR_1',
      title: 'Bigger clock font',
      url: 'https://github.com/dawn/app/pull/12',
      repo: 'dawn/app',
      number: 12,
      author: 'ada',
      authorAvatarUrl: null,
      isDraft: false,
      createdAt: '2026-09-25T14:00:00Z',
      baseRefName: 'canary',
      headRefName: 'feature/clock-font',
      requestedReviewers: [],
      reviews: [],
      reviewerCount: 0,
      approvals: 0,
      requiredApprovals: 1,
      isRelease: false,
      ciState: null,
      targetsCorrectBase: true,
      ticket: null,
      missingFocusLabel: false,
      size: { lines: 0, files: 0, over: false },
      needsMedia: false,
      hasMedia: false,
    })
  })

  it('counts requested and submitted reviewers once each, never the author', () => {
    const pr = normalizePr(
      rawPr({
        body: 'Demo: https://www.loom.com/share/abc123',
        reviewRequests: {
          nodes: [
            { requestedReviewer: { __typename: 'User', login: 'grace' } },
            {
              requestedReviewer: {
                __typename: 'Team',
                slug: 'reviewers',
                organization: { login: 'dawn' },
              },
            },
            null,
          ],
        },
        latestReviews: {
          nodes: [
            { state: 'APPROVED', submittedAt: '2026-09-26T10:00:00Z', author: { login: 'linus' } },
            { state: 'COMMENTED', submittedAt: '2026-09-26T11:00:00Z', author: { login: 'Grace' } },
            { state: 'COMMENTED', submittedAt: '2026-09-26T12:00:00Z', author: { login: 'ada' } },
          ],
        },
        commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] },
      }),
    )
    expect(pr.requestedReviewers).toEqual(['grace', 'dawn/reviewers'])
    // grace (requested + commented), dawn/reviewers, linus. The author's own comment doesn't count.
    expect(pr.reviewerCount).toBe(3)
    expect(pr.reviews).toHaveLength(3)
    expect(pr.approvals).toBe(1)
    expect(pr.hasMedia).toBe(true)
    expect(pr.ciState).toBe('SUCCESS')
  })

  it('needs one approval into canary and two from canary into main', () => {
    expect(normalizePr(rawPr()).requiredApprovals).toBe(1)
    const release = normalizePr(rawPr({ headRefName: 'canary', baseRefName: 'main' }))
    expect(release).toMatchObject({ requiredApprovals: 2, isRelease: true, ticket: null })
  })

  it('never counts the author approving their own PR', () => {
    const pr = normalizePr(
      rawPr({
        latestReviews: {
          nodes: [{ state: 'APPROVED', submittedAt: null, author: { login: 'ada' } }],
        },
      }),
    )
    expect(pr.approvals).toBe(0)
  })

  it('finds the ticket: a linked issue first, else the branch number', () => {
    const linked = normalizePr(
      rawPr({
        headRefName: '121-clock-font',
        closingIssuesReferences: {
          nodes: [{ number: 120, labels: { nodes: [{ name: 'Carepartner' }] } }],
        },
      }),
    )
    expect(linked.ticket).toEqual({ number: 120, linked: true, labels: ['Carepartner'] })
    expect(linked.missingFocusLabel).toBe(false)

    const fromBranch = normalizePr(rawPr({ headRefName: '121-clock-font' }))
    expect(fromBranch.ticket).toEqual({ number: 121, linked: false, labels: null })
    // Labels unknown: never flagged.
    expect(fromBranch.missingFocusLabel).toBe(false)
  })

  it('flags a linked ticket without a focus-area label (the PR’s own labels count too)', () => {
    const ticket = (labels: string[], prLabels: string[] = []) =>
      normalizePr(
        rawPr({
          labels: { nodes: prLabels.map((name) => ({ name })) },
          closingIssuesReferences: {
            nodes: [{ number: 7, labels: { nodes: labels.map((name) => ({ name })) } }],
          },
        }),
      ).missingFocusLabel
    expect(ticket(['bug'])).toBe(true)
    expect(ticket(['bug'], ['Server'])).toBe(false)
    expect(ticket(['ui/ux'])).toBe(false)
  })

  it('counts size like the PR Size metric, and flags PRs over it', () => {
    const files = (list: [string, number][]) => ({
      nodes: list.map(([path, additions]) => ({ path, additions, deletions: 0 })),
    })
    const small = normalizePr(
      rawPr({
        changedFiles: 3,
        files: files([
          ['app/Clock.tsx', 100],
          ['app/Clock.test.tsx', 900],
          ['README.md', 50],
        ]),
      }),
    )
    expect(small.size).toEqual({ lines: 100, files: 1, over: false })

    const big = normalizePr(rawPr({ changedFiles: 1, files: files([['server/a.go', 751]]) }))
    expect(big.size.over).toBe(true)
    // More files than GitHub listed (it lists 100): over, whatever they are.
    const many = normalizePr(rawPr({ changedFiles: 140, files: files([['a.go', 1]]) }))
    expect(many.size.over).toBe(true)
  })

  it('needs a photo or video only for UI changes', () => {
    const ui = rawPr({
      files: { nodes: [{ path: 'caregiver/src/Clock.tsx', additions: 5, deletions: 1 }] },
    })
    expect(normalizePr(ui)).toMatchObject({ needsMedia: true, hasMedia: false })
    expect(normalizePr({ ...ui, body: '![before](https://x.test/a.png)' }).hasMedia).toBe(true)

    const server = rawPr({
      files: { nodes: [{ path: 'server/clock.go', additions: 5, deletions: 1 }] },
    })
    expect(normalizePr(server).needsMedia).toBe(false)

    const labeled = rawPr({
      closingIssuesReferences: { nodes: [{ number: 3, labels: { nodes: [{ name: 'UI/UX' }] } }] },
    })
    expect(normalizePr(labeled).needsMedia).toBe(true)
  })

  it('flags a feature branch that targets main', () => {
    expect(normalizePr(rawPr({ baseRefName: 'main' })).targetsCorrectBase).toBe(false)
    expect(
      normalizePr(rawPr({ headRefName: 'canary', baseRefName: 'main' })).targetsCorrectBase,
    ).toBe(true)
  })

  it('never exposes the PR body', () => {
    const pr = normalizePr(rawPr({ body: 'secret staging password: hunter2' }))
    expect(JSON.stringify(pr)).not.toContain('hunter2')
  })
})

describe('ciStateOf', () => {
  it.each([
    ['SUCCESS', 'SUCCESS'],
    ['FAILURE', 'FAILURE'],
    ['ERROR', 'FAILURE'],
    ['PENDING', 'PENDING'],
    ['EXPECTED', 'PENDING'],
    [null, null],
    [undefined, null],
  ])('%s → %s', (rollup, state) => {
    expect(ciStateOf(rollup)).toBe(state)
  })
})

describe('review queue', () => {
  const requested = (login: string, createdAt: string) => ({
    createdAt,
    requestedReviewer: { __typename: 'User', login },
  })

  it('waits since my latest review request', () => {
    const raw = rawPr({
      timelineItems: {
        nodes: [
          requested('me', '2026-09-26T13:00:00Z'),
          requested('someone', '2026-09-28T09:00:00Z'),
          requested('ME', '2026-09-28T15:00:00Z'), // re-requested
        ],
      },
    })
    expect(waitingSinceFor(raw, 'me')).toBe('2026-09-28T15:00:00Z')
  })

  it('falls back to the PR creation time (e.g. requested via a team)', () => {
    expect(waitingSinceFor(rawPr(), 'me')).toBe('2026-09-25T14:00:00Z')
  })

  it('is past the SLA a full business day after the request', () => {
    // Requested Friday 2026-10-02 at 4pm Eastern.
    const raw = rawPr({ timelineItems: { nodes: [requested('me', '2026-10-02T20:00:00Z')] } })
    expect(toReviewQueuePr(raw, 'me', zonedInstant('2026-10-05', 15, 59)).isPastSla).toBe(false)
    expect(toReviewQueuePr(raw, 'me', zonedInstant('2026-10-05', 16)).isPastSla).toBe(true)
  })
})

describe('toMyPr', () => {
  it('counts approvals and change requests', () => {
    const pr = toMyPr(
      rawPr({
        isDraft: true,
        latestReviews: {
          nodes: [
            { state: 'APPROVED', submittedAt: null, author: { login: 'grace' } },
            { state: 'CHANGES_REQUESTED', submittedAt: null, author: { login: 'linus' } },
            { state: 'APPROVED', submittedAt: null, author: { login: 'margaret' } },
          ],
        },
        commits: { nodes: [{ commit: { statusCheckRollup: { state: 'FAILURE' } } }] },
      }),
    )
    expect(pr).toMatchObject({
      isDraft: true,
      approvals: 2,
      changesRequested: 1,
      reviewerCount: 3,
      ciState: 'FAILURE',
    })
  })

  it('has zero counts with no reviews', () => {
    expect(toMyPr(rawPr())).toMatchObject({ approvals: 0, changesRequested: 0 })
  })
})

describe('toReleasePr', () => {
  it('keeps what the Deadline card shows, with the merge time', () => {
    const pr = toReleasePr(
      rawPr({
        headRefName: 'canary',
        baseRefName: 'main',
        mergedAt: '2026-10-20T21:00:00Z',
        latestReviews: {
          nodes: [{ state: 'APPROVED', submittedAt: null, author: { login: 'grace' } }],
        },
      }),
    )
    expect(pr).toEqual({
      title: 'Bigger clock font',
      url: 'https://github.com/dawn/app/pull/12',
      repo: 'dawn/app',
      number: 12,
      isDraft: false,
      approvals: 1,
      requiredApprovals: 2,
      ciState: null,
      mergedAt: '2026-10-20T21:00:00Z',
    })
  })
})
