import { useCallback, useEffect, useState } from 'react'
import { clearPrMetricsCache, loadPrMetrics } from './data'
import type { PrMetricsFile } from './types'

export interface PrMetricsQuery {
  /** undefined while loading; null when the workflow hasn't generated the file yet. */
  data: PrMetricsFile | null | undefined
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface Settled {
  attempt: number
  data?: PrMetricsFile | null
  error: Error | null
}

/** Every mounted hook: a retry in one widget reloads all of them (they share one fetch). */
const retryListeners = new Set<() => void>()

/** metrics/pr-metrics.json from dawn-care/DAWN, fetched once and shared by every widget. */
export function usePrMetrics(): PrMetricsQuery {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const retry = () => setAttempt((n) => n + 1)
    retryListeners.add(retry)
    return () => {
      retryListeners.delete(retry)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadPrMetrics().then(
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
    clearPrMetricsCache()
    for (const retry of retryListeners) retry()
  }, [])

  const current = settled?.attempt === attempt ? settled : null
  return {
    data: current?.data,
    loading: current === null,
    error: current?.error ?? null,
    refetch,
  }
}
