import { useCallback, useEffect, useState } from 'react'
import { clearArtifactsCache, loadArtifacts } from './data'
import type { ArtifactsResponse } from './types'

export interface ArtifactsQuery {
  /** undefined while loading or after an error. */
  data: ArtifactsResponse | undefined
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface Settled {
  attempt: number
  data?: ArtifactsResponse
  error: Error | null
}

/** Every mounted hook: a retry in one place reloads all of them (they share one fetch). */
const retryListeners = new Set<() => void>()

/** All documents from dawn-care/Artifacts, fetched once and shared. */
export function useArtifacts(): ArtifactsQuery {
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
    loadArtifacts().then(
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
    clearArtifactsCache()
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
