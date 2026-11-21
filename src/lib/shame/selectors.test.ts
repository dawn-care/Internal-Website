import { describe, expect, it } from 'vitest'
import {
  categoryIds,
  categoryTotals,
  mondayOf,
  personRows,
  recentShames,
  shameSummary,
  weeklyCounts,
} from './selectors'
import type { ShameFile } from './types'

const FILE: ShameFile = {
  categories: { reviews: 'Reviews', sleep: 'Sleep', meetings: 'Meetings' },
  shames: [
    {
      at: '2026-11-02T15:00:00.000Z',
      login: 'bob',
      category: 'reviews',
      type: 'slow_review',
      pr: 1,
    },
    { at: '2026-11-03T15:00:00.000Z', login: 'bob', category: 'sleep', type: 'late_night', pr: 2 },
    {
      at: '2026-11-04T15:00:00.000Z',
      login: 'Bob',
      category: 'reviews',
      type: 'slow_review',
      pr: 3,
    },
    {
      at: '2026-11-05T15:00:00.000Z',
      login: 'carol',
      category: 'sleep',
      type: 'late_night',
      pr: 4,
    },
    // Sunday 11pm in New York is Monday 04:00 UTC: still the week of Nov 9.
    { at: '2026-11-16T04:00:00.000Z', login: 'carol', category: 'reviews', type: 'slow_review' },
    {
      at: '2026-11-17T15:00:00.000Z',
      login: 'alice',
      category: 'meetings',
      type: 'manual',
      reason: 'late to standup',
      by: 'bob',
      endorsedBy: ['carol', 'dave'],
    },
    { at: '2026-11-18T15:00:00.000Z', login: 'carol', category: 'legacy', type: 'late_night' },
  ],
}

describe('categoryIds', () => {
  it("keeps the file's order and appends ids it doesn't list", () => {
    expect(categoryIds(FILE)).toEqual(['reviews', 'sleep', 'meetings', 'legacy'])
  })
})

describe('categoryTotals', () => {
  it('counts per category, most first, with labels and zeros', () => {
    expect(categoryTotals(FILE)).toEqual([
      { category: 'reviews', label: 'Reviews', count: 3 },
      { category: 'sleep', label: 'Sleep', count: 2 },
      { category: 'meetings', label: 'Meetings', count: 1 },
      { category: 'legacy', label: 'legacy', count: 1 },
    ])
  })
})

describe('personRows', () => {
  it('breaks each person down by category and finds what they are shamed for most', () => {
    const rows = personRows(FILE, ['alice', 'dave'])
    expect(rows.map((r) => [r.login, r.total])).toEqual([
      ['bob', 3],
      ['carol', 3],
      ['alice', 1],
      ['dave', 0],
    ])
    expect(rows[0].counts).toEqual([2, 1, 0, 0])
    expect(rows[0].top).toEqual(['reviews'])
    // A tie lists every top category.
    expect(rows[1].top).toEqual(['reviews', 'sleep', 'legacy'])
    expect(rows[3].top).toEqual([])
  })
})

describe('weeklyCounts', () => {
  it('buckets by Monday-to-Sunday team weeks through now, including empty weeks', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02')
    expect(mondayOf('2026-11-09')).toBe('2026-11-09')
    expect(weeklyCounts(FILE, new Date('2026-12-01T12:00:00Z'))).toEqual([
      { weekStart: '2026-11-02', count: 4, manual: 0 },
      { weekStart: '2026-11-09', count: 1, manual: 0 },
      { weekStart: '2026-11-16', count: 2, manual: 1 },
      { weekStart: '2026-11-23', count: 0, manual: 0 },
      { weekStart: '2026-11-30', count: 0, manual: 0 },
    ])
  })
  it('is empty with no shames', () => {
    expect(weeklyCounts({ categories: {}, shames: [] }, new Date())).toEqual([])
  })
})

describe('recentShames and shameSummary', () => {
  it('lists the newest first', () => {
    expect(recentShames(FILE, 2).map((s) => s.at)).toEqual([
      '2026-11-18T15:00:00.000Z',
      '2026-11-17T15:00:00.000Z',
    ])
  })
  it('totals manual and automatic shames and people', () => {
    expect(shameSummary(FILE)).toEqual({ total: 7, manual: 1, automatic: 6, people: 3 })
  })
})

describe('format', () => {
  it('pluralizes and picks whole-number ticks', async () => {
    const { niceTicks, plural } = await import('./format')
    expect(plural(1, 'shame')).toBe('1 shame')
    expect(plural(2, 'person', 'people')).toBe('2 people')
    expect(niceTicks(1)).toEqual([0, 1])
    expect(niceTicks(4)).toEqual([0, 1, 2, 3, 4])
    expect(niceTicks(9)).toEqual([0, 3, 6, 9])
  })
})
