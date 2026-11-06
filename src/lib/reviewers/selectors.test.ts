import { describe, expect, it } from 'vitest'
import { rankReviewers } from './selectors'
import type { ReviewerMetrics } from './types'

function metrics(
  allTime: Record<string, number>,
  trailingWindow: Record<string, number>,
): ReviewerMetrics {
  return { generatedAt: '2026-11-05T05:00:00Z', windowDays: 14, allTime, trailingWindow }
}

describe('rankReviewers', () => {
  it('sorts by trailing-window count first, then all-time', () => {
    const rows = rankReviewers(metrics({ a: 10, b: 10, c: 1 }, { a: 2, b: 5, c: 0 }))
    expect(rows.map((r) => r.login)).toEqual(['b', 'a', 'c'])
  })

  it('includes logins that only appear in one window, defaulting the other to 0', () => {
    const rows = rankReviewers(metrics({ a: 4 }, { b: 1 }))
    expect(rows).toEqual(
      expect.arrayContaining([
        { login: 'a', allTime: 4, trailingWindow: 0 },
        { login: 'b', allTime: 0, trailingWindow: 1 },
      ]),
    )
  })

  it('breaks ties by login', () => {
    const rows = rankReviewers(metrics({ zed: 1, amy: 1 }, { zed: 1, amy: 1 }))
    expect(rows.map((r) => r.login)).toEqual(['amy', 'zed'])
  })

  it('returns an empty list when nobody has reviewed anything', () => {
    expect(rankReviewers(metrics({}, {}))).toEqual([])
  })
})
