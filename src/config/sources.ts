/**
 * Content sources. This is the only module that reads VITE_ env vars; pages, hooks, and
 * src/lib/drive read everything from here.
 *
 * Adding a dated feed (e.g. sprint artifacts) only takes a new entry below: useFeed,
 * the shared per-folder cache, and filename parsing all pick it up from this object.
 *
 * Published artifacts aren't a Drive source any more: they're Markdown files in the
 * dawn-care/Artifacts repo, served by /api/artifacts (src/lib/artifacts).
 */

export type SourceKind = 'dated-feed'

interface BaseSource {
  key: string
  label: string
  kind: SourceKind
  /** Drive folder ID, or undefined when not configured (the source's UI is hidden). */
  folderId: string | undefined
}

/** Recurring files named "YYYY-MM-DD <suffix>" in a working folder. */
export interface DatedFeedSource extends BaseSource {
  kind: 'dated-feed'
  suffix: string
}

export type Source = DatedFeedSource

const env = import.meta.env

export const GOOGLE_API_KEY: string | undefined = env.VITE_GOOGLE_API_KEY || undefined

/** With no API key the site runs on mock data from src/lib/drive/mock.ts. */
export const USE_MOCK_DATA = !GOOGLE_API_KEY

// Stand-in folder ID used in mock mode (mock.ts serves listings for it).
export const MOCK_AGENDAS_FOLDER_ID = 'mock-agendas-folder'

function folder(envValue: string | undefined, mockId: string): string | undefined {
  return USE_MOCK_DATA ? mockId : envValue || undefined
}

const AGENDAS_FOLDER_ID = folder(env.VITE_AGENDAS_FOLDER_ID, MOCK_AGENDAS_FOLDER_ID)

export const SOURCES = {
  agendas: {
    key: 'agendas',
    label: 'Agendas',
    kind: 'dated-feed',
    suffix: 'Agenda',
    folderId: AGENDAS_FOLDER_ID,
  },
  fourUps: {
    key: 'fourUps',
    label: '4Ups',
    kind: 'dated-feed',
    suffix: '4Up',
    folderId: AGENDAS_FOLDER_ID,
  },
  // Planned: sprint artifacts, e.g. "2026-10-06 Sprint Review" in their own folder.
  // Add VITE_SPRINT_FOLDER_ID to .env.example, then uncomment:
  // sprintArtifacts: {
  //   key: 'sprintArtifacts',
  //   label: 'Sprint artifacts',
  //   kind: 'dated-feed',
  //   suffix: 'Sprint Review',
  //   folderId: folder(env.VITE_SPRINT_FOLDER_ID, MOCK_AGENDAS_FOLDER_ID),
  // },
} as const satisfies Record<string, Source>

export type SourceKey = keyof typeof SOURCES

export type FeedKey = {
  [K in SourceKey]: (typeof SOURCES)[K] extends { kind: 'dated-feed' } ? K : never
}[SourceKey]

/** False when the source's folder ID is missing; callers hide that source's UI. */
export function isSourceConfigured(key: SourceKey): boolean {
  return Boolean((SOURCES[key] as Source).folderId)
}
