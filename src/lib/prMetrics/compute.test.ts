import { describe, expect, it } from 'vitest'
import { PR_METRICS_RULES as rules } from '../../config/prMetrics'
import { computePrMetrics, inScope, iterationFor, prSize, ticketLabels } from './compute'
import type { RawPullRequest } from './types'

const TESS = 'saltyypanda'
const ALEX = 'AJBruno23'
const ASHTON = 'ashton-michelstein'
const JAY = 'jmd9268'
const HAROON = 'ha4716'
const DAVID = 'dgh4572'

type Review = RawPullRequest['reviews'][number]

function review(author: string, submittedAt: string, extra: Partial<Review> = {}): Review {
  return { author, authorType: 'User', state: 'APPROVED', submittedAt, ...extra }
}

let nextNumber = 1
/** An in-scope PR merged in Deadline 2 (Mon Nov 2 → Tue Nov 3 2026), with overrides. */
function pr(overrides: Partial<RawPullRequest> = {}): RawPullRequest {
  const number = nextNumber++
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/dawn-care/DAWN/pull/${number}`,
    author: TESS,
    authorType: 'User',
    base: 'canary',
    head: `${number}-feature`,
    createdAt: '2026-11-02T15:00:00Z',
    readyAt: null,
    mergedAt: '2026-11-03T15:00:00Z',
    labels: ['Frontend'],
    closingIssues: [],
    branchIssue: null,
    reviews: [review(ALEX, '2026-11-02T20:00:00Z')],
    files: [{ path: 'caregiver/src/a.ts', additions: 10, deletions: 5 }],
    ...overrides,
  }
}

const NOW = new Date('2026-11-18T17:00:00Z')

function compute(prs: RawPullRequest[], now = NOW) {
  return computePrMetrics(
    {
      schemaVersion: 1,
      generatedAt: '2026-11-18T05:00:00Z',
      repo: 'dawn-care/DAWN',
      pullRequests: prs,
    },
    rules,
    now,
  )
}

function deadline2(prs: RawPullRequest[]) {
  return compute(prs).iterations.find((it) => it.name === 'Deadline 2')!
}

describe('ticketLabels', () => {
  it('uses linked issues, else the branch issue, plus the PR’s own labels', () => {
    expect(
      ticketLabels(
        pr({
          labels: ['UI/UX'],
          closingIssues: [{ number: 9, labels: ['Frontend'] }],
          branchIssue: null,
        }),
      ).sort(),
    ).toEqual(['Frontend', 'UI/UX'])
    expect(
      ticketLabels(
        pr({ labels: [], branchIssue: { number: 481, labels: ['Caregiver', 'Server'] } }),
      ).sort(),
    ).toEqual(['Caregiver', 'Server'])
  })
})

describe('scope', () => {
  it('counts team authors only and skips canary → main release merges', () => {
    expect(inScope(pr(), rules)).toBe(true)
    expect(inScope(pr({ author: 'someone-else' }), rules)).toBe(false)
    expect(inScope(pr({ authorType: 'Bot' }), rules)).toBe(false)
    expect(inScope(pr({ base: 'main', head: 'canary' }), rules)).toBe(false)
    expect(inScope(pr({ base: 'main', head: 'dev-setup-fixes' }), rules)).toBe(true)
  })

  it('places a PR by its America/New_York merge date, inclusive', () => {
    // Oct 21 01:00 UTC is still Oct 20 in New York.
    expect(iterationFor('2026-10-21T01:00:00Z', rules.iterations)?.name).toBe('Deadline 1')
    expect(iterationFor('2026-10-21T05:00:00Z', rules.iterations)?.name).toBe('Deadline 2')
    expect(iterationFor('2026-09-26T12:00:00Z', rules.iterations)).toBeUndefined()
  })
})

describe('PR size', () => {
  it('ignores tests, docs and lockfiles', () => {
    expect(
      prSize(
        [
          { path: 'server/a.go', additions: 600, deletions: 100 },
          { path: 'server/a_test.go', additions: 900, deletions: 0 },
          { path: 'CLAUDE.md', additions: 50, deletions: 0 },
          { path: 'caregiver/package-lock.json', additions: 3000, deletions: 0 },
          { path: 'carepartner/src/x/__tests__/x.test.tsx', additions: 80, deletions: 0 },
        ],
        rules.sizeExclude,
      ),
    ).toEqual({ lines: 700, files: 1 })
  })

  it('buckets PRs and tracks each author', () => {
    const big = (lines: number, files: number) =>
      Array.from({ length: files }, (_, i) => ({
        path: `server/f${i}.go`,
        additions: Math.ceil(lines / files),
        deletions: 0,
      }))
    const it = deadline2([
      pr(),
      pr({ files: big(800, 2) }),
      pr({ files: big(100, 20), author: ALEX }),
      pr({ files: big(2000, 20) }),
    ])
    expect(it.size).toMatchObject({
      total: 4,
      within: 1,
      overLinesOnly: 1,
      overFilesOnly: 1,
      overBoth: 1,
    })
    expect(it.size.byAuthor[TESS]).toEqual({ within: 1, total: 3 })
    expect(it.size.byAuthor[ALEX]).toEqual({ within: 0, total: 1 })
  })
})

describe('review and merge time', () => {
  it('counts from ready-for-review, ignores self and bot reviews, skips weekends', () => {
    const it = deadline2([
      pr(), // reviewed after 5h, merged after 24h
      pr({
        // Ready Friday 4pm EST; first real review Monday 3pm; merged Tuesday 4pm.
        readyAt: '2026-11-06T21:00:00Z',
        reviews: [
          review(TESS, '2026-11-06T21:30:00Z', { state: 'COMMENTED' }), // the author
          review('copilot-pull-request-reviewer', '2026-11-06T21:10:00Z', { authorType: 'Bot' }),
          review(JAY, '2026-11-09T20:00:00Z', { state: 'CHANGES_REQUESTED' }),
        ],
        mergedAt: '2026-11-10T21:00:00Z',
      }),
      pr({ reviews: [] }), // never reviewed
      pr({ mergedAt: '2026-11-06T16:00:00Z' }), // merged 4 business days later
    ])
    expect(it.speed).toEqual({ total: 4, reviewedWithin: 3, mergedWithin: 3 })
  })
})

describe('author and review balance', () => {
  it('counts distinct PRs reviewed by team members and flags each number on its own', () => {
    const it = deadline2([
      ...Array.from({ length: 10 }, () =>
        pr({
          author: TESS,
          reviews: [review(DAVID, '2026-11-02T20:00:00Z'), review(DAVID, '2026-11-02T21:00:00Z')],
        }),
      ),
      pr({
        author: ALEX,
        reviews: [
          review(TESS, '2026-11-02T20:00:00Z'),
          review('old-teammate', '2026-11-02T20:00:00Z'),
        ],
      }),
      pr({ author: JAY }),
    ])
    expect(it.balance.evenShare).toBe(2)
    expect(it.balance.min).toBeCloseTo(0.8)
    expect(it.balance.max).toBeCloseTo(3.2)
    expect(it.balance.people[TESS]).toEqual({
      authored: 10,
      reviewed: 1,
      flags: ['over-authoring'],
    })
    expect(it.balance.people[DAVID]).toEqual({
      authored: 0,
      reviewed: 10,
      flags: ['under-authoring', 'over-reviewing'],
    })
    expect(it.balance.people[ALEX].reviewed).toBe(1)
    expect(it.balance.people['old-teammate']).toBeUndefined()
  })
})

describe('focus-area coverage', () => {
  it('counts each PR once, covered by an expert for any one of its labels', () => {
    const it = deadline2([
      // Haroon (a Frontend expert) reviews Ashton's Server + Frontend PR → covered.
      pr({
        author: ASHTON,
        labels: ['Server', 'Frontend'],
        reviews: [review(HAROON, '2026-11-02T20:00:00Z')],
      }),
      // Ashton authors UI/UX, Jay reviews: neither is a UI/UX expert → miss.
      pr({
        author: ASHTON,
        labels: ['UI/UX', 'Documentation'],
        reviews: [review(JAY, '2026-11-02T20:00:00Z')],
      }),
      pr({ labels: ['Documentation'] }), // no focus label → unlabeled
    ])
    expect(it.coverage).toMatchObject({ labeled: 2, covered: 1, unlabeled: 1 })
    expect(it.coverage.misses).toHaveLength(1)
    expect(it.coverage.misses[0]).toMatchObject({ labels: ['UI/UX'], reviewers: [JAY] })
  })
})

describe('breadth of knowledge', () => {
  it('counts PRs authored or reviewed per focus area', () => {
    const it = deadline2([
      pr({
        author: ALEX,
        labels: ['Caregiver', 'Frontend'],
        reviews: [review(JAY, '2026-11-02T20:00:00Z')],
      }),
      pr({ author: JAY, labels: ['Server'], reviews: [review(ALEX, '2026-11-02T20:00:00Z')] }),
    ])
    expect(it.breadth.people[ALEX].counts).toEqual({
      Caregiver: 1,
      Carepartner: 0,
      'Staff Member': 0,
      Frontend: 1,
      'UI/UX': 0,
      Server: 1,
    })
    expect(it.breadth.people[ALEX].labelsCovered).toBe(3)
    expect(it.breadth.people[DAVID].labelsCovered).toBe(0)
  })
})

describe('computePrMetrics', () => {
  it('includes started iterations only, marks the current one, and drops out-of-scope PRs', () => {
    const file = compute([
      pr(),
      pr({ author: 'someone-else' }),
      pr({ mergedAt: '2026-10-01T15:00:00Z' }),
    ])
    expect(file.team).toEqual([TESS, ASHTON, JAY, HAROON, ALEX, DAVID])
    expect(file.iterations.map((it) => [it.name, it.current, it.prCount])).toEqual([
      ['Deadline 1', false, 1],
      ['Deadline 2', true, 1],
    ])
    expect(compute([], new Date('2026-10-01T12:00:00Z')).iterations.map((it) => it.name)).toEqual([
      'Deadline 1',
    ])
  })
})
