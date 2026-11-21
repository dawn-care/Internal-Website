import type { ShameEntry, ShameFile } from './types'

const TESS = 'saltyypanda'
const ALEX = 'AJBruno23'
const ASHTON = 'ashton-michelstein'
const JAY = 'jmd9268'
const HAROON = 'ha4716'
const DAVID = 'dgh4572'

const DAY = 24 * 60 * 60 * 1000

type Fact = Omit<ShameEntry, 'at'> & { daysAgo: number }

/** Made-up shames, newest last; `daysAgo` is relative to when the mock is built. */
const FACTS: Fact[] = [
  { daysAgo: 52, login: JAY, category: 'pr_size', type: 'behemoth', pr: 301 },
  { daysAgo: 49, login: TESS, category: 'sleep', type: 'late_night', pr: 305 },
  { daysAgo: 47, login: DAVID, category: 'reviews', type: 'slow_review', pr: 305 },
  { daysAgo: 44, login: TESS, category: 'sleep', type: 'late_night', pr: 312 },
  { daysAgo: 40, login: ALEX, category: 'follow_through', type: 'idle_author', pr: 318 },
  { daysAgo: 37, login: JAY, category: 'reviews', type: 'slow_review', pr: 322 },
  { daysAgo: 33, login: ASHTON, category: 'pr_size', type: 'behemoth', pr: 330 },
  {
    daysAgo: 31,
    login: ASHTON,
    category: 'meetings',
    type: 'manual',
    reason: 'joined the sponsor meeting 20 minutes late',
    by: TESS,
    endorsedBy: [ALEX, JAY],
  },
  { daysAgo: 29, login: TESS, category: 'sleep', type: 'late_night', pr: 335 },
  { daysAgo: 26, login: DAVID, category: 'reviews', type: 'slow_review', pr: 338 },
  { daysAgo: 26, login: DAVID, category: 'reviews', type: 'slow_review', pr: 339 },
  {
    daysAgo: 24,
    login: JAY,
    category: 'broke_something',
    type: 'manual',
    reason: 'merged to canary and the login screen went blank',
    by: HAROON,
    endorsedBy: [TESS, DAVID],
  },
  { daysAgo: 20, login: ALEX, category: 'follow_through', type: 'idle_author', pr: 344 },
  { daysAgo: 17, login: HAROON, category: 'sleep', type: 'late_night', pr: 350 },
  {
    daysAgo: 15,
    login: DAVID,
    category: 'communication',
    type: 'manual',
    reason: 'went quiet in Discord for three days during the deadline week',
    by: JAY,
    endorsedBy: [ASHTON, ALEX],
  },
  { daysAgo: 12, login: TESS, category: 'pr_size', type: 'behemoth', pr: 356 },
  { daysAgo: 10, login: JAY, category: 'reviews', type: 'slow_review', pr: 356 },
  {
    daysAgo: 8,
    login: TESS,
    category: 'deadlines',
    type: 'manual',
    reason: 'said "done by Friday", it was Tuesday',
    by: ALEX,
    endorsedBy: [HAROON, DAVID],
  },
  { daysAgo: 6, login: ASHTON, category: 'follow_through', type: 'idle_author', pr: 360 },
  { daysAgo: 4, login: TESS, category: 'sleep', type: 'late_night', pr: 362 },
  {
    daysAgo: 2,
    login: HAROON,
    category: 'other',
    type: 'manual',
    reason: 'renamed every variable in the PR to a fruit',
    by: DAVID,
    endorsedBy: [JAY, ASHTON],
  },
  { daysAgo: 1, login: DAVID, category: 'reviews', type: 'slow_review', pr: 365 },
]

/** Fake metrics/shame.json for VITE_TASKS_MOCK=true, so local dev needs no network. */
export function mockShames(now = new Date()): ShameFile {
  const shames = FACTS.map(({ daysAgo, ...fact }) => ({
    at: new Date(now.getTime() - daysAgo * DAY).toISOString(),
    ...fact,
  }))
  return {
    categories: {
      reviews: 'Reviews',
      follow_through: 'Follow-through',
      pr_size: 'PR size',
      sleep: 'Sleep',
      meetings: 'Meetings',
      deadlines: 'Deadlines',
      broke_something: 'Broke something',
      communication: 'Communication',
      other: 'Something else',
    },
    shames,
    updatedAt: shames[shames.length - 1].at,
  }
}
