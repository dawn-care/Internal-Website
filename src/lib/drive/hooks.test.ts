// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeedKey } from '../../config/sources'
import { listFolder } from './client'
import { clearDriveCache } from './data'
import { useFeed, useMeetings } from './hooks'
import type { DriveFile } from './types'

// Simulates adding a new dated feed: the ONLY change is one extra entry in the sources
// config. The hooks, cache, and parser are the real, unmodified modules.
vi.mock('../../config/sources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/sources')>()
  return {
    ...actual,
    GOOGLE_API_KEY: 'test-key',
    USE_MOCK_DATA: false,
    SOURCES: {
      agendas: { ...actual.SOURCES.agendas, folderId: 'working-folder' },
      fourUps: { ...actual.SOURCES.fourUps, folderId: 'working-folder' },
      sprintArtifacts: {
        key: 'sprintArtifacts',
        label: 'Sprint artifacts',
        kind: 'dated-feed',
        suffix: 'Sprint Review',
        folderId: 'working-folder',
      },
    },
  }
})

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  listFolder: vi.fn(),
}))

function file(name: string): DriveFile {
  return {
    id: name,
    name,
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: '2026-09-01T12:00:00.000Z',
    webViewLink: `https://drive.google.com/${encodeURIComponent(name)}`,
    iconLink: '',
  }
}

const WORKING_FOLDER = [
  file('2026-09-22 Agenda'),
  file('2026-09-29 Agenda'),
  file('2026-09-29 4Up'),
  file('2026-09-23 Sprint Review'),
  file('2026-10-07 sprint review'),
  file('notes'),
]

// A real config entry would extend FeedKey automatically; the mocked one needs a cast.
const SPRINT = 'sprintArtifacts' as FeedKey

afterEach(() => {
  clearDriveCache()
  vi.mocked(listFolder).mockReset()
})

describe('useFeed', () => {
  it('serves a newly configured dated feed with no other code changes', async () => {
    vi.mocked(listFolder).mockResolvedValue(WORKING_FOLDER)

    const { result } = renderHook(() => useFeed(SPRINT))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data?.map((i) => i.file.name)).toEqual([
      '2026-10-07 sprint review',
      '2026-09-23 Sprint Review',
    ])
    expect(result.current.data?.every((i) => i.sourceKey === 'sprintArtifacts')).toBe(true)
  })

  it('shares one request per folder across feeds, and keeps feeds separate', async () => {
    vi.mocked(listFolder).mockResolvedValue(WORKING_FOLDER)

    const { result } = renderHook(() => ({
      agendas: useFeed('agendas'),
      fourUps: useFeed('fourUps'),
      sprint: useFeed(SPRINT),
    }))
    await waitFor(() => expect(result.current.sprint.loading).toBe(false))

    expect(listFolder).toHaveBeenCalledTimes(1)
    expect(listFolder).toHaveBeenCalledWith('working-folder', { filesOnly: true })
    expect(result.current.agendas.data?.map((i) => i.file.name)).toEqual([
      '2026-09-29 Agenda',
      '2026-09-22 Agenda',
    ])
    expect(result.current.fourUps.data?.map((i) => i.file.name)).toEqual(['2026-09-29 4Up'])
    expect(result.current.sprint.data).toHaveLength(2)
  })

  it('reports errors and recovers on refetch', async () => {
    vi.mocked(listFolder)
      .mockRejectedValueOnce(new Error('Google Drive request failed (403): quota'))
      .mockResolvedValue(WORKING_FOLDER)

    const { result } = renderHook(() => useFeed('agendas'))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toContain('403')

    result.current.refetch()
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.error).toBeNull()
  })
})

describe('useMeetings', () => {
  it('pairs agendas and 4Ups from a single folder request', async () => {
    vi.mocked(listFolder).mockResolvedValue(WORKING_FOLDER)

    const { result } = renderHook(() => useMeetings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(listFolder).toHaveBeenCalledTimes(1)
    const [latest, earlier] = result.current.data ?? []
    expect(latest.agenda?.file.name).toBe('2026-09-29 Agenda')
    expect(latest.fourUp?.file.name).toBe('2026-09-29 4Up')
    expect(earlier.agenda?.file.name).toBe('2026-09-22 Agenda')
    expect(earlier.fourUp).toBeUndefined()
  })
})
