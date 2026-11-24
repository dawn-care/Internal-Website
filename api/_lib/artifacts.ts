import {
  ARTIFACT_IMAGE_TYPES,
  compareArtifactPaths,
  extensionOf,
  folderForPath,
  isImagePath,
  isMarkdownPath,
  isPublishablePath,
  titleForPath,
  uniqueSlugs,
} from '../../src/lib/artifacts/paths.js'
import type { ArtifactDoc } from '../../src/lib/artifacts/types.js'
import { ARTIFACTS_REPOSITORY } from './config.js'
import { USER_AGENT } from './github/oauth.js'

/*
 * Reads the Markdown documents (and the images they embed) from the public
 * dawn-care/Artifacts repo. One GitHub API call per refresh lists the files (the git tree);
 * then:
 * - with ARTIFACTS_GITHUB_TOKEN: batched GraphQL queries return every document's text and
 *   last commit date (the token also lifts GitHub's limit of 60 anonymous API calls/hour);
 * - without it: the text comes from raw.githubusercontent.com (not rate limited), and each
 *   date from one REST commits call per file. Dates are remembered by the file's blob SHA
 *   (from the tree), so a file's date is only looked up again when its content changes:
 *   after the first load, a refresh is still a single API call. A date that can't be
 *   fetched (e.g. rate limited) falls back to the last known one, or null.
 * Images always come from raw.githubusercontent.com.
 *
 * Deliberately separate from /api/_lib/github, whose errors are about the signed-in user's
 * token (a 401 there signs the user out). A failure here is the site's own setup problem.
 */

export type ArtifactsErrorCode = 'artifacts-no-access' | 'artifacts-unavailable'

export class ArtifactsError extends Error {
  readonly code: ArtifactsErrorCode
  /** Status for our own response. */
  readonly status: number
  /** GitHub's status and message, for the logs only. */
  readonly detail: string

  constructor(code: ArtifactsErrorCode, detail: string) {
    super(
      code === 'artifacts-no-access'
        ? "The site can't read the Artifacts repository right now."
        : "GitHub isn't responding right now. Try again in a minute.",
    )
    this.name = 'ArtifactsError'
    this.code = code
    this.status = code === 'artifacts-no-access' ? 502 : 503
    this.detail = detail
  }
}

/** More than this many documents are cut off (and logged): one response must stay small. */
export const MAX_DOCUMENTS = 200
/** Vercel responses top out at 4.5 MB; bigger images aren't offered. */
export const MAX_ASSET_BYTES = 4 * 1024 * 1024
/** How long one function instance reuses what it read. The CDN caches responses on top. */
export const CACHE_TTL_MS = 5 * 60_000
/** Documents per GraphQL query, to keep each one well under GitHub's limits. */
const BATCH_SIZE = 40
/** Raw downloads in flight at once when there's no token. */
const RAW_BATCH_SIZE = 10

type Fetch = typeof fetch

export interface ArtifactsSnapshot {
  documents: ArtifactDoc[]
  /** Embeddable image paths → size in bytes. */
  assets: Map<string, number>
}

interface TreeResponse {
  truncated?: boolean
  tree?: { path: string; type: string; size?: number; sha?: string }[]
}

/** Path → the blob SHA a date was looked up for, and that date. */
const knownDates = new Map<string, { sha: string; date: string | null }>()

/** Anonymous date lookups in flight at once. */
const DATE_CONCURRENCY = 5

/** The last commit that touched `path` on the branch (anonymous REST call). */
async function fetchLastCommitDate(path: string, fetchImpl: Fetch): Promise<string | null> {
  const { branch } = ARTIFACTS_REPOSITORY
  const query = `?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(branch)}&per_page=1`
  const res = await call(fetchImpl, repoUrl(`/commits${query}`), { headers: headers(null) })
  if (!res.ok) throw await failure(res, `commits ${path}`)
  const commits = (await res.json()) as { commit?: { committer?: { date?: string } } }[]
  return commits[0]?.commit?.committer?.date ?? null
}

/**
 * Without a token: each document's last-commit date, looked up only for files whose blob SHA
 * changed since the last lookup. Never throws: a failed lookup keeps the old date (or null).
 */
async function datesForChangedFiles(
  files: { path: string; sha: string }[],
  fetchImpl: Fetch,
): Promise<Map<string, string | null>> {
  const stale = files.filter(({ path, sha }) => knownDates.get(path)?.sha !== sha)
  for (let start = 0; start < stale.length; start += DATE_CONCURRENCY) {
    await Promise.all(
      stale.slice(start, start + DATE_CONCURRENCY).map(async ({ path, sha }) => {
        try {
          knownDates.set(path, { sha, date: await fetchLastCommitDate(path, fetchImpl) })
        } catch (err) {
          // Keep the last known date (if any) but not the SHA, so the next refresh retries.
          const detail = err instanceof ArtifactsError ? `${err.code} ${err.detail}` : String(err)
          console.warn(`[artifacts] no date for "${path}": ${detail}`)
        }
      }),
    )
  }
  return new Map(files.map(({ path }) => [path, knownDates.get(path)?.date ?? null]))
}

interface GraphQLResponse {
  data?: { repository: Record<string, unknown> | null } | null
  errors?: { type?: string; message?: string }[]
}

interface BlobNode {
  text?: string | null
  isBinary?: boolean
  isTruncated?: boolean
}

interface HistoryNode {
  nodes?: { committedDate?: string }[]
}

async function call(fetchImpl: Fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, init)
  } catch (err) {
    throw new ArtifactsError('artifacts-unavailable', `network: ${String(err)}`)
  }
}

async function failure(res: Response, what: string): Promise<ArtifactsError> {
  const { message } = (await res.json().catch(() => ({}))) as { message?: string }
  const detail = `${what}: ${res.status} ${message ?? ''}`.trim()
  const rateLimited =
    res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')
  // 401: the token expired or was revoked; 403/404: the repo (or branch) is gone, private,
  // or the token can't see it.
  if (!rateLimited && [401, 403, 404].includes(res.status)) {
    return new ArtifactsError('artifacts-no-access', detail)
  }
  return new ArtifactsError('artifacts-unavailable', detail)
}

function headers(
  token: string | null,
  accept = 'application/vnd.github+json',
): Record<string, string> {
  return {
    Accept: accept,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** A file's raw bytes on the branch. raw.githubusercontent.com has no API rate limit. */
function rawUrl(path: string): string {
  const { owner, name, branch } = ARTIFACTS_REPOSITORY
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${owner}/${name}/${encodeURIComponent(branch)}/${encoded}`
}

/** Without a token: each document's text from raw.githubusercontent.com (dates come separately). */
async function fetchRawBatch(
  paths: string[],
  fetchImpl: Fetch,
): Promise<{ text: string; updatedAt: string | null }[]> {
  return Promise.all(
    paths.map(async (path) => {
      const res = await call(fetchImpl, rawUrl(path), { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) throw await failure(res, `raw ${path}`)
      return { text: await res.text(), updatedAt: null }
    }),
  )
}

function repoUrl(path: string): string {
  const { owner, name } = ARTIFACTS_REPOSITORY
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${path}`
}

/** One batch of documents: their text and the date of the last commit that touched each. */
async function fetchBatch(
  token: string,
  paths: string[],
  fetchImpl: Fetch,
): Promise<{ text: string; updatedAt: string | null }[]> {
  const { owner, name, branch } = ARTIFACTS_REPOSITORY
  const variables: Record<string, string> = { owner, name, qualified: `refs/heads/${branch}` }
  const params = ['$owner: String!', '$name: String!', '$qualified: String!']
  const files: string[] = []
  const histories: string[] = []
  paths.forEach((path, i) => {
    variables[`e${i}`] = `${branch}:${path}`
    variables[`p${i}`] = path
    params.push(`$e${i}: String!`, `$p${i}: String!`)
    files.push(`f${i}: object(expression: $e${i}) { ... on Blob { text isBinary isTruncated } }`)
    histories.push(`h${i}: history(first: 1, path: $p${i}) { nodes { committedDate } }`)
  })
  const query = `query(${params.join(', ')}) {
    repository(owner: $owner, name: $name) {
      ref(qualifiedName: $qualified) { target { ... on Commit { ${histories.join('\n')} } } }
      ${files.join('\n')}
    }
  }`

  const res = await call(fetchImpl, 'https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers(token, 'application/json'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw await failure(res, 'graphql')
  const body = (await res.json().catch(() => ({}))) as GraphQLResponse
  const repository = body.data?.repository
  if (body.errors?.length || !repository) {
    const first = body.errors?.[0]
    const detail = `graphql: ${first?.type ?? 'ERROR'} ${first?.message ?? 'no repository'}`
    const noAccess = !repository || ['NOT_FOUND', 'FORBIDDEN'].includes(first?.type ?? '')
    throw new ArtifactsError(noAccess ? 'artifacts-no-access' : 'artifacts-unavailable', detail)
  }

  const commit = (repository.ref as { target?: Record<string, HistoryNode> } | null)?.target ?? {}
  return paths.map((path, i) => {
    const blob = repository[`f${i}`] as BlobNode | null
    if (blob?.isTruncated)
      console.warn(`[artifacts] "${path}" is too large; showing the start only`)
    return {
      text: blob && !blob.isBinary ? (blob.text ?? '') : '',
      updatedAt: commit[`h${i}`]?.nodes?.[0]?.committedDate ?? null,
    }
  })
}

/** Everything the Artifacts pages show, read fresh from GitHub. */
export async function fetchArtifacts(
  token: string | null,
  fetchImpl: Fetch = fetch,
): Promise<ArtifactsSnapshot> {
  const { branch } = ARTIFACTS_REPOSITORY
  const res = await call(
    fetchImpl,
    repoUrl(`/git/trees/${encodeURIComponent(branch)}?recursive=1`),
    { headers: headers(token) },
  )
  if (!res.ok) throw await failure(res, 'tree')
  const tree = (await res.json()) as TreeResponse
  if (tree.truncated) console.warn('[artifacts] the repository tree was truncated by GitHub')

  const blobs = (tree.tree ?? []).filter((e) => e.type === 'blob' && isPublishablePath(e.path))
  const markdown = blobs
    .filter((e) => isMarkdownPath(e.path))
    .map((e) => e.path)
    .sort(compareArtifactPaths)
  if (markdown.length > MAX_DOCUMENTS) {
    console.warn(`[artifacts] showing the first ${MAX_DOCUMENTS} of ${markdown.length} documents`)
  }
  const paths = markdown.slice(0, MAX_DOCUMENTS)
  const shaByPath = new Map(blobs.map((e) => [e.path, e.sha ?? '']))
  const assets = new Map(
    blobs
      .filter((e) => isImagePath(e.path) && (e.size ?? 0) <= MAX_ASSET_BYTES)
      .map((e) => [e.path, e.size ?? 0] as const),
  )

  const slugs = uniqueSlugs(paths)
  // Without a token, dates come from separate (cached) REST lookups.
  const dates = token
    ? null
    : await datesForChangedFiles(
        paths.map((path) => ({ path, sha: shaByPath.get(path) ?? '' })),
        fetchImpl,
      )
  const documents: ArtifactDoc[] = []
  const batchSize = token ? BATCH_SIZE : RAW_BATCH_SIZE
  for (let start = 0; start < paths.length; start += batchSize) {
    const batch = paths.slice(start, start + batchSize)
    const contents = token
      ? await fetchBatch(token, batch, fetchImpl)
      : await fetchRawBatch(batch, fetchImpl)
    batch.forEach((path, i) => {
      documents.push({
        path,
        slug: slugs.get(path)!,
        title: titleForPath(path),
        folder: folderForPath(path),
        updatedAt: dates ? (dates.get(path) ?? null) : contents[i].updatedAt,
        markdown: contents[i].text,
      })
    })
  }
  return { documents, assets }
}

let cached: { snapshot: ArtifactsSnapshot; at: number } | undefined
let inflight: Promise<ArtifactsSnapshot> | undefined

/**
 * fetchArtifacts, reused for CACHE_TTL_MS per function instance; concurrent requests share
 * one refresh. If a refresh fails, the last good copy is served (and the failure logged).
 */
export async function loadArtifacts(
  token: string | null,
  fetchImpl: Fetch = fetch,
  now: () => number = Date.now,
): Promise<ArtifactsSnapshot> {
  if (cached && now() - cached.at < CACHE_TTL_MS) return cached.snapshot
  if (!inflight) {
    inflight = fetchArtifacts(token, fetchImpl)
      .then((snapshot) => {
        cached = { snapshot, at: now() }
        return snapshot
      })
      .finally(() => {
        inflight = undefined
      })
  }
  try {
    return await inflight
  } catch (err) {
    if (cached && err instanceof ArtifactsError) {
      console.warn(`[artifacts] serving the last good copy: ${err.code} ${err.detail}`)
      return cached.snapshot
    }
    throw err
  }
}

export function clearArtifactsCache(): void {
  knownDates.clear()
  cached = undefined
  inflight = undefined
}

/**
 * One image from the repo, as bytes. Callers check the path against the snapshot first.
 * Proxied (rather than linked straight to raw.githubusercontent.com) because GitHub serves
 * SVGs there as text/plain, which browsers won't show in an <img>.
 */
export async function fetchArtifactAsset(
  path: string,
  fetchImpl: Fetch = fetch,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await call(fetchImpl, rawUrl(path), { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw await failure(res, 'asset')
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: ARTIFACT_IMAGE_TYPES[extensionOf(path)] ?? 'application/octet-stream',
  }
}
