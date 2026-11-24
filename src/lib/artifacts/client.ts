import type { ArtifactsResponse } from './types'

export const ARTIFACTS_URL = '/api/artifacts'

/**
 * Dev-only override, e.g. VITE_ARTIFACTS_URL=/artifacts.local.json (a saved /api/artifacts
 * response in public/, gitignored), to preview real documents with `npm run dev`. It beats
 * mock data. Ignored in production builds.
 */
export const ARTIFACTS_URL_OVERRIDE: string | undefined = import.meta.env.PROD
  ? undefined
  : import.meta.env.VITE_ARTIFACTS_URL || undefined

export class ArtifactsError extends Error {
  /** HTTP status, or 0 when the request never got a usable response. */
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ArtifactsError'
    this.status = status
  }
}

/** Where a document's embedded image is served from (only images listed in `assets`). */
export function artifactAssetUrl(path: string): string {
  return `${ARTIFACTS_URL}?asset=${encodeURIComponent(path)}`
}

/**
 * Every document in dawn-care/Artifacts, via /api/artifacts. Public: no session needed, so
 * it's a plain fetch rather than the signed-in API helpers.
 */
export async function fetchArtifacts(url = ARTIFACTS_URL): Promise<ArtifactsResponse> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ArtifactsError("Couldn't reach the site. Check your connection.", 0)
  }
  // `npm run dev` has no /api and answers with index.html instead.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new ArtifactsError(
      'Artifacts are served by /api. Run `npx vercel dev`, or set VITE_TASKS_MOCK=true for sample data.',
      res.status,
    )
  }
  const body = (await res.json().catch(() => null)) as
    ArtifactsResponse | { error?: { message?: string } } | null
  if (!res.ok || !body || !('documents' in body)) {
    const message =
      (body && 'error' in body && body.error?.message) || `Request failed (${res.status}).`
    throw new ArtifactsError(message, res.status)
  }
  return body
}
