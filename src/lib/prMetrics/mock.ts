import type { PrMetricsFile } from './types'

const TESS = 'saltyypanda'
const ALEX = 'AJBruno23'
const ASHTON = 'ashton-michelstein'
const JAY = 'jmd9268'
const HAROON = 'ha4716'
const DAVID = 'dgh4572'

const PR_URL = 'https://github.com/dawn-care/DAWN/pull/'

/**
 * Fake metrics/pr-metrics.json for VITE_TASKS_MOCK=true, so local dev needs no network.
 * Also the reference example of the schema in ./types.ts. "Deadline 2" (current) is 60 PRs:
 * size 39/60, reviewed 53/60, merged 53/60, Tess over-authoring, Haroon under-authoring,
 * David over-reviewing, coverage 59/60 with one miss, breadth 6/6 at 5+ labels.
 */
export function mockPrMetrics(): PrMetricsFile {
  return {
    generatedAt: new Date().toISOString(),
    repo: 'dawn-care/DAWN',
    targets: {
      size: { maxLines: 750, maxFiles: 15, share: 0.9 },
      speed: { firstReviewHours: 24, mergeHours: 48, share: 0.9 },
      balance: { minFactor: 0.4, maxFactor: 1.6 },
      coverage: { share: 0.95 },
      breadth: { minLabels: 5 },
    },
    breadthLabels: ['Caregiver', 'Carepartner', 'Staff Member', 'Frontend', 'UI/UX', 'Server'],
    focusOwners: {
      Caregiver: [ALEX],
      Carepartner: [TESS],
      'Staff Member': [HAROON],
      Frontend: [TESS, HAROON],
      'UI/UX': [ALEX, HAROON],
      Server: [JAY],
      Cloud: [ASHTON],
      Security: [DAVID],
    },
    team: [TESS, ALEX, ASHTON, JAY, HAROON, DAVID],
    iterations: [
      {
        name: 'Deadline 1',
        start: '2026-09-27',
        end: '2026-10-20',
        current: false,
        prCount: 42,
        size: {
          total: 42,
          within: 30,
          overLinesOnly: 7,
          overFilesOnly: 2,
          overBoth: 3,
          byAuthor: {
            [TESS]: { within: 7, total: 11 },
            [ALEX]: { within: 7, total: 9 },
            [ASHTON]: { within: 4, total: 6 },
            [JAY]: { within: 6, total: 8 },
            [HAROON]: { within: 3, total: 4 },
            [DAVID]: { within: 3, total: 4 },
          },
        },
        speed: { total: 42, reviewedWithin: 36, mergedWithin: 34 },
        balance: {
          evenShare: 7,
          min: 2.8,
          max: 11.2,
          people: {
            [TESS]: { authored: 11, reviewed: 5, flags: [] },
            [ALEX]: { authored: 9, reviewed: 9, flags: [] },
            [ASHTON]: { authored: 6, reviewed: 6, flags: [] },
            [JAY]: { authored: 8, reviewed: 8, flags: [] },
            [HAROON]: { authored: 4, reviewed: 10, flags: [] },
            [DAVID]: { authored: 4, reviewed: 12, flags: ['over-reviewing'] },
          },
        },
        coverage: {
          labeled: 40,
          covered: 37,
          unlabeled: 2,
          misses: [
            {
              number: 402,
              title: 'Caregiver check-in reminders',
              url: `${PR_URL}402`,
              labels: ['Caregiver'],
              author: JAY,
              reviewers: [DAVID],
            },
            {
              number: 417,
              title: 'Import the staff roster from CSV',
              url: `${PR_URL}417`,
              labels: ['Staff Member'],
              author: TESS,
              reviewers: [ASHTON],
            },
            {
              number: 431,
              title: 'Fix header contrast on the tablet home screen',
              url: `${PR_URL}431`,
              labels: ['Frontend'],
              author: ALEX,
              reviewers: [DAVID],
            },
          ],
        },
        breadth: {
          people: {
            [TESS]: breadth([4, 8, 1, 5, 2, 3]),
            [ALEX]: breadth([9, 1, 0, 3, 2, 2]),
            [ASHTON]: breadth([1, 0, 0, 2, 0, 8]),
            [JAY]: breadth([2, 1, 1, 3, 0, 11]),
            [HAROON]: breadth([1, 2, 6, 9, 7, 0]),
            [DAVID]: breadth([0, 2, 1, 4, 1, 3]),
          },
        },
      },
      {
        name: 'Deadline 2',
        start: '2026-10-21',
        end: '2026-12-03',
        current: true,
        prCount: 60,
        size: {
          total: 60,
          within: 39,
          overLinesOnly: 12,
          overFilesOnly: 3,
          overBoth: 6,
          byAuthor: {
            [TESS]: { within: 9, total: 17 },
            [ALEX]: { within: 9, total: 12 },
            [ASHTON]: { within: 7, total: 9 },
            [JAY]: { within: 7, total: 12 },
            [HAROON]: { within: 2, total: 3 },
            [DAVID]: { within: 5, total: 7 },
          },
        },
        speed: { total: 60, reviewedWithin: 53, mergedWithin: 53 },
        balance: {
          evenShare: 10,
          min: 4,
          max: 16,
          people: {
            [TESS]: { authored: 17, reviewed: 8, flags: ['over-authoring'] },
            [ALEX]: { authored: 12, reviewed: 12, flags: [] },
            [ASHTON]: { authored: 9, reviewed: 9, flags: [] },
            [JAY]: { authored: 12, reviewed: 12, flags: [] },
            [HAROON]: { authored: 3, reviewed: 14, flags: ['under-authoring'] },
            [DAVID]: { authored: 7, reviewed: 18, flags: ['over-reviewing'] },
          },
        },
        coverage: {
          labeled: 60,
          covered: 59,
          unlabeled: 0,
          misses: [
            {
              number: 512,
              title: 'Animate the weather card transitions',
              url: `${PR_URL}512`,
              labels: ['Frontend', 'UI/UX'],
              author: ASHTON,
              reviewers: [JAY],
            },
          ],
        },
        breadth: {
          people: {
            [TESS]: breadth([6, 9, 3, 7, 2, 5]),
            [ALEX]: breadth([11, 2, 0, 6, 4, 3]),
            [ASHTON]: breadth([2, 3, 1, 4, 0, 9]),
            [JAY]: breadth([3, 2, 2, 5, 1, 14]),
            [HAROON]: breadth([3, 4, 9, 13, 10, 0]),
            [DAVID]: breadth([4, 5, 3, 8, 3, 6]),
          },
        },
      },
    ],
  }
}

const BREADTH_ORDER = ['Caregiver', 'Carepartner', 'Staff Member', 'Frontend', 'UI/UX', 'Server']

/** Counts in BREADTH_ORDER → a BreadthPerson. */
function breadth(values: number[]) {
  const counts = Object.fromEntries(BREADTH_ORDER.map((label, i) => [label, values[i]]))
  return { counts, labelsCovered: values.filter((n) => n > 0).length }
}
