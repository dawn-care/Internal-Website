// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchReviewerMetrics } from './client'
import { clearReviewerMetricsCache } from './data'
import { useReviewerMetrics } from './hooks'

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  fetchReviewerMetrics: vi.fn(),
}))

afterEach(() => {
  clearReviewerMetricsCache()
  vi.mocked(fetchReviewerMetrics).mockReset()
})

describe('useReviewerMetrics', () => {
  it('loads metrics once and shares the cache across hook instances', async () => {
    vi.mocked(fetchReviewerMetrics).mockResolvedValue({
      generatedAt: '2026-11-05T05:00:00Z',
      windowDays: 14,
      allTime: { ada: 3 },
      trailingWindow: { ada: 1 },
    })

    const { result } = renderHook(() => useReviewerMetrics())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.allTime.ada).toBe(3)

    renderHook(() => useReviewerMetrics())
    expect(fetchReviewerMetrics).toHaveBeenCalledTimes(1)
  })

  it('treats a 404 (null) as "not generated yet", not an error', async () => {
    vi.mocked(fetchReviewerMetrics).mockResolvedValue(null)

    const { result } = renderHook(() => useReviewerMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('reports errors and recovers on refetch', async () => {
    vi.mocked(fetchReviewerMetrics)
      .mockRejectedValueOnce(new Error('Request failed (500): error'))
      .mockResolvedValue({
        generatedAt: '2026-11-05T05:00:00Z',
        windowDays: 14,
        allTime: {},
        trailingWindow: {},
      })

    const { result } = renderHook(() => useReviewerMetrics())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toContain('500')

    result.current.refetch()
    await waitFor(() => expect(result.current.data).not.toBeUndefined())
    expect(result.current.error).toBeNull()
  })
})
