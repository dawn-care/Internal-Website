import { useCallback, useEffect, useState } from 'react'
import { clearReviewerMetricsCache, loadReviewerMetrics } from './data'
import type { ReviewerMetrics } from './types'

export interface ReviewerMetricsQuery {
  /** undefined while loading; null when the workflow hasn't generated the file yet. */
  data: ReviewerMetrics | null | undefined
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface Settled {
  attempt: number
  data?: ReviewerMetrics | null
  error: Error | null
}

/** metrics/reviewers.json from dawn-care/DAWN, fetched once and cached. */
export function useReviewerMetrics(): ReviewerMetricsQuery {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    let cancelled = false
    loadReviewerMetrics().then(
      (data) => {
        if (!cancelled) setSettled({ attempt, data, error: null })
      },
      (error: unknown) => {
        if (cancelled) return
        setSettled({ attempt, error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const refetch = useCallback(() => {
    clearReviewerMetricsCache()
    setAttempt((n) => n + 1)
  }, [])

  const current = settled?.attempt === attempt ? settled : null
  return {
    data: current?.data,
    loading: current === null,
    error: current?.error ?? null,
    refetch,
  }
}
