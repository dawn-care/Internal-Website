import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { isSampleMode } from '../sampleMode'
import { TasksError } from '../tasks/api'
import type { StatusKey, Task } from '../tasks/types'
import { fetchDashboard } from './api'
import { mockDashboard } from './mock'
import { BOARD_COLUMNS, isWidgetError, type DashboardResponse, type MyWork } from './types'

/** Data older than this is refetched when the window regains focus (or the page mounts). */
export const DASHBOARD_STALE_MS = 60_000

/** A status set here ("Mark done") that the server's (cached) copy may not show yet. */
interface StatusOverride {
  status: string
  statusKey: StatusKey | null
  /** When it was set; server data generated after this already includes it. */
  at: number
}

interface Snapshot {
  data: DashboardResponse | undefined
  /** The first load failed: nothing to show. */
  error: TasksError | null
  /** A later refresh failed: the older data stays on screen. */
  refreshError: TasksError | null
  fetching: boolean
  fetchedAt: number
  overrides: ReadonlyMap<string, StatusOverride>
}

/*
 * One in-memory copy for the tab, like the tasks cache: leaving /dashboard and coming back
 * within a minute doesn't refetch. Signing in or out reloads the page, which clears it.
 */
const EMPTY: Snapshot = {
  data: undefined,
  error: null,
  refreshError: null,
  fetching: false,
  fetchedAt: 0,
  overrides: new Map(),
}
let snapshot = EMPTY
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function update(next: Partial<Snapshot>): void {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => snapshot

function isStale(now = Date.now()): boolean {
  return !snapshot.data || now - snapshot.fetchedAt > DASHBOARD_STALE_MS
}

const load = () => (isSampleMode() ? mockDashboard() : fetchDashboard())

/** Fetches (or joins the request in flight). Never rejects: errors land in state. */
export function loadDashboard(): Promise<void> {
  if (inFlight) return inFlight
  update({ fetching: true })
  inFlight = load()
    .then(
      (data) =>
        update({ data, error: null, refreshError: null, fetching: false, fetchedAt: Date.now() }),
      (err: unknown) => {
        const error =
          err instanceof TasksError
            ? err
            : new TasksError('unknown', "We couldn't load your dashboard right now.")
        if (error.needsSignIn || !snapshot.data) {
          // A dead session means the data isn't ours to show anymore.
          update({ data: undefined, error, refreshError: null, fetching: false })
        } else {
          update({ refreshError: error, fetching: false })
        }
      },
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Shows `status` on the task at once (optimistic "Mark done"); null removes the override. */
export function setStatusOverride(
  itemId: string,
  status: { name: string; key: StatusKey | null } | null,
): void {
  const overrides = new Map(snapshot.overrides)
  if (status) overrides.set(itemId, { status: status.name, statusKey: status.key, at: Date.now() })
  else overrides.delete(itemId)
  update({ overrides })
}

/** For tests. */
export function resetDashboardCache(): void {
  snapshot = EMPTY
  inFlight = null
}

/** The server's task lists with this tab's newer status changes laid on top. */
export function applyOverrides(
  data: DashboardResponse,
  overrides: ReadonlyMap<string, StatusOverride>,
): DashboardResponse {
  const generated = Date.parse(data.generatedAt)
  if (overrides.size === 0 || isWidgetError(data.work)) return data
  const patch = (task: Task): Task => {
    const o = overrides.get(task.itemId)
    return o && generated < o.at ? { ...task, status: o.status, statusKey: o.statusKey } : task
  }
  const columns = { ...data.work.columns }
  for (const column of BOARD_COLUMNS) columns[column] = columns[column].map(patch)
  const work: MyWork = { ...data.work, columns }
  return { ...data, work }
}

export interface DashboardQuery {
  data: DashboardResponse | undefined
  /** True until the first result (data or error) arrives. */
  loading: boolean
  /** The first load failed. */
  error: TasksError | null
  /** A refresh failed; `data` is the older copy. */
  refreshError: TasksError | null
  /** A request is in flight (possibly a background refresh). */
  fetching: boolean
  /** Date.now() of the last successful load. */
  fetchedAt: number
  refetch: () => void
}

/**
 * The signed-in user's dashboard (GET /api/dashboard, or the mock in sample mode). Refetched
 * when the page mounts or the window regains focus if older than 60 seconds.
 */
export function useDashboard(enabled = true): DashboardQuery {
  const current = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    if (!enabled) return
    if (isStale()) void loadDashboard()
    const revalidate = () => {
      if (document.visibilityState === 'visible' && isStale()) void loadDashboard()
    }
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', revalidate)
    return () => {
      window.removeEventListener('focus', revalidate)
      document.removeEventListener('visibilitychange', revalidate)
    }
  }, [enabled])

  const refetch = useCallback(() => void loadDashboard(), [])
  const data = useMemo(
    () => current.data && applyOverrides(current.data, current.overrides),
    [current.data, current.overrides],
  )

  return {
    data,
    loading: !data && !current.error,
    error: data ? null : current.error,
    refreshError: current.refreshError,
    fetching: current.fetching,
    fetchedAt: current.fetchedAt,
    refetch,
  }
}
