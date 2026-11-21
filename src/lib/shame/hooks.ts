import { useCallback, useEffect, useState } from 'react'
import { clearShamesCache, loadShames } from './data'
import type { ShameFile } from './types'

export interface ShamesQuery {
  /** undefined while loading; null when the shame bot hasn't logged anything yet. */
  data: ShameFile | null | undefined
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface Settled {
  attempt: number
  data?: ShameFile | null
  error: Error | null
}

/** Every mounted hook: a retry in one card reloads all of them (they share one fetch). */
const retryListeners = new Set<() => void>()

/** metrics/shame.json from dawn-care/Internal-Tools, fetched once and shared by every card. */
export function useShames(): ShamesQuery {
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
    loadShames().then(
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
    clearShamesCache()
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
