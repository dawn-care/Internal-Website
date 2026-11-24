import { useCallback, useEffect, useState } from 'react'
import type { FeedKey } from '../../config/sources'
import { clearDriveCache, loadFeed, loadMeetings } from './data'
import type { FeedItem, Meeting } from './types'

export interface DriveQuery<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface Settled<T> {
  load: () => Promise<T>
  attempt: number
  data?: T
  error: Error | null
}

/**
 * Runs `load` (which must be stable) and tracks its result. A result only counts if it
 * came from the current `load` and attempt, so switching inputs shows loading, not stale data.
 */
function useDriveQuery<T>(load: () => Promise<T>): DriveQuery<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setSettled({ load, attempt, data, error: null })
      },
      (error: unknown) => {
        if (cancelled) return
        setSettled({
          load,
          attempt,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [load, attempt])

  const refetch = useCallback(() => {
    clearDriveCache()
    setAttempt((n) => n + 1)
  }, [])

  const current = settled?.load === load && settled.attempt === attempt ? settled : null
  return {
    data: current?.data,
    loading: current === null,
    error: current?.error ?? null,
    refetch,
  }
}

/** Items for a dated feed from src/config/sources.ts, newest first. */
export function useFeed(sourceKey: FeedKey): DriveQuery<FeedItem[]> {
  const load = useCallback(() => loadFeed(sourceKey), [sourceKey])
  return useDriveQuery(load)
}

/** Agendas and 4Ups paired by date, newest first. */
export function useMeetings(): DriveQuery<Meeting[]> {
  return useDriveQuery(loadMeetings)
}
