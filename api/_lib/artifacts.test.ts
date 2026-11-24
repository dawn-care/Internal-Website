import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../artifacts.js'
import {
  ArtifactsError,
  CACHE_TTL_MS,
  clearArtifactsCache,
  fetchArtifacts,
  loadArtifacts,
} from './artifacts.js'

const TREE = {
  truncated: false,
  tree: [
    { path: 'Feature List.md', type: 'blob', size: 10, sha: 'a1' },
    { path: '02 Design', type: 'tree' },
    { path: '02 Design/01 Architecture.md', type: 'blob', size: 10, sha: 'b1' },
    { path: '01 Plan/Plan.md', type: 'blob', size: 10, sha: 'c1' },
    { path: 'diagrams/Domain Model.drawio', type: 'blob', size: 10, sha: 'd1' },
    { path: 'README.md', type: 'blob', size: 10, sha: 'r1' },
    { path: 'diagrams/model.png', type: 'blob', size: 2048 },
    { path: 'diagrams/huge.png', type: 'blob', size: 50 * 1024 * 1024 },
    { path: '.github/TEMPLATE.md', type: 'blob', size: 10 },
  ],
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/**
 * Answers the tree call, then GraphQL with each requested path's text and a date (with a
 * token), or raw.githubusercontent.com downloads (without one).
 */
function fakeGitHub(
  overrides: { tree?: Response; graphql?: Response; commits?: (path: string) => Response } = {},
) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url)
    if (href.includes('/git/trees/')) return overrides.tree ?? json(TREE)
    if (href.includes('/commits?')) {
      const path = new URL(href).searchParams.get('path')!
      if (overrides.commits) return overrides.commits(path)
      return json([{ commit: { committer: { date: `2026-11-0${path.length % 9}T12:00:00Z` } } }])
    }
    if (href.endsWith('/graphql')) {
      if (overrides.graphql) return overrides.graphql
      const { variables } = JSON.parse(String(init?.body)) as { variables: Record<string, string> }
      const repository: Record<string, unknown> = { ref: { target: {} } }
      const target = (repository.ref as { target: Record<string, unknown> }).target
      for (const [key, value] of Object.entries(variables)) {
        if (key.startsWith('p')) {
          const i = key.slice(1)
          repository[`f${i}`] = { text: `# ${value}`, isBinary: false, isTruncated: false }
          target[`h${i}`] = { nodes: [{ committedDate: '2026-11-20T15:00:00Z' }] }
        }
      }
      return json({ data: { repository } })
    }
    if (href.startsWith('https://raw.githubusercontent.com/dawn-care/Artifacts/main/')) {
      const path = decodeURIComponent(href.split('/main/')[1])
      if (path.endsWith('.png')) {
        return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 })
      }
      return new Response(`# raw ${path}`, { status: 200 })
    }
    return json({ message: 'Not Found' }, 404)
  })
}

beforeEach(() => {
  clearArtifactsCache()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('fetchArtifacts', () => {
  it('lists documents and diagrams in order with titles, folders, slugs and dates', async () => {
    const snapshot = await fetchArtifacts('tok', fakeGitHub())
    expect(snapshot.documents.map((d) => [d.path, d.kind, d.slug, d.title, d.folder])).toEqual([
      ['Feature List.md', 'markdown', 'feature-list', 'Feature List', null],
      ['01 Plan/Plan.md', 'markdown', 'plan/plan', 'Plan', 'Plan'],
      ['02 Design/01 Architecture.md', 'markdown', 'design/architecture', 'Architecture', 'Design'],
      [
        'diagrams/Domain Model.drawio',
        'diagram',
        'diagrams/domain-model',
        'Domain Model',
        'diagrams',
      ],
    ])
    expect(snapshot.documents[0]).toMatchObject({
      markdown: '# Feature List.md',
      updatedAt: '2026-11-20T15:00:00Z',
    })
    // Diagrams get a date but no text (the viewer loads them from GitHub).
    expect(snapshot.documents[3]).toMatchObject({ markdown: '', updatedAt: '2026-11-20T15:00:00Z' })
  })

  it('returns the root README as the index, not as an artifact', async () => {
    const fetchImpl = fakeGitHub()
    const snapshot = await fetchArtifacts('tok', fetchImpl)
    expect(snapshot.index).toBe('# README.md')
    expect(snapshot.documents.some((d) => d.path === 'README.md')).toBe(false)
    const { query } = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body)) as { query: string }
    // The diagram (4th artifact, alias f3) is looked up without downloading its blob.
    expect(query).toContain('f3: object(expression: $e3) { id }')

    const none = { ...TREE, tree: TREE.tree.filter((e) => e.path !== 'README.md') }
    expect((await fetchArtifacts('tok', fakeGitHub({ tree: json(none) }))).index).toBeNull()
  })

  it('offers only small-enough images, never other files', async () => {
    const snapshot = await fetchArtifacts('tok', fakeGitHub())
    expect([...snapshot.assets.keys()]).toEqual(['diagrams/model.png'])
  })

  it('sends the token and asks GraphQL with variables, not interpolated paths', async () => {
    const fetchImpl = fakeGitHub()
    await fetchArtifacts('tok', fetchImpl)
    const [, init] = fetchImpl.mock.calls[1]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    const body = JSON.parse(String(init?.body)) as {
      query: string
      variables: Record<string, string>
    }
    expect(body.query).not.toContain('Feature List')
    expect(body.variables.e0).toBe('main:Feature List.md')
  })

  it('reads text from raw.githubusercontent.com and dates from REST without a token', async () => {
    const fetchImpl = fakeGitHub()
    const snapshot = await fetchArtifacts(null, fetchImpl)
    expect(snapshot.documents.map((d) => [d.markdown, d.updatedAt])).toEqual([
      ['# raw Feature List.md', '2026-11-06T12:00:00Z'],
      ['# raw 01 Plan/Plan.md', '2026-11-06T12:00:00Z'],
      ['# raw 02 Design/01 Architecture.md', '2026-11-01T12:00:00Z'],
      ['', '2026-11-01T12:00:00Z'],
    ])
    expect(snapshot.index).toBe('# raw README.md')
    // The tree plus one commits lookup per artifact; no GraphQL (it needs a token).
    const apiCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes('api.github.com'))
    expect(apiCalls).toHaveLength(5)
    // Diagrams aren't downloaded.
    expect(fetchImpl.mock.calls.some(([url]) => String(url).endsWith('.drawio'))).toBe(false)
    expect(apiCalls.some(([url]) => String(url).endsWith('/graphql'))).toBe(false)
    for (const [, init] of apiCalls) {
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    }
  })

  it('looks a date up again only when that file changed', async () => {
    await fetchArtifacts(null, fakeGitHub())
    const changed = {
      ...TREE,
      tree: TREE.tree.map((e) => (e.path === 'Feature List.md' ? { ...e, sha: 'a2' } : e)),
    }
    const fetchImpl = fakeGitHub({ tree: json(changed) })
    await fetchArtifacts(null, fetchImpl)
    const lookups = fetchImpl.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/commits?'))
    expect(lookups).toHaveLength(1)
    expect(new URL(lookups[0]).searchParams.get('path')).toBe('Feature List.md')
  })

  it('keeps the last known date (or null) when a date lookup fails', async () => {
    await fetchArtifacts(null, fakeGitHub())
    const changed = { ...TREE, tree: TREE.tree.map((e) => ({ ...e, sha: `${e.sha}-new` })) }
    const limited = () =>
      json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' })
    const snapshot = await fetchArtifacts(
      null,
      fakeGitHub({ tree: json(changed), commits: limited }),
    )
    expect(snapshot.documents[0].updatedAt).toBe('2026-11-06T12:00:00Z')

    clearArtifactsCache()
    const fresh = await fetchArtifacts(null, fakeGitHub({ commits: limited }))
    expect(fresh.documents.map((d) => d.updatedAt)).toEqual([null, null, null, null])
    expect(fresh.documents[0].markdown).toBe('# raw Feature List.md')
  })

  it('reports a token that cannot see the repo as no-access', async () => {
    const fetchImpl = fakeGitHub({ tree: json({ message: 'Not Found' }, 404) })
    await expect(fetchArtifacts('tok', fetchImpl)).rejects.toMatchObject({
      code: 'artifacts-no-access',
      status: 502,
    })
  })

  it('reports rate limits and outages as unavailable', async () => {
    const limited = json({ message: 'API rate limit exceeded' }, 403, {
      'x-ratelimit-remaining': '0',
    })
    await expect(fetchArtifacts('tok', fakeGitHub({ tree: limited }))).rejects.toMatchObject({
      code: 'artifacts-unavailable',
      status: 503,
    })
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(fetchArtifacts('tok', down)).rejects.toBeInstanceOf(ArtifactsError)
  })

  it('treats GraphQL errors as failures', async () => {
    const graphql = json({ data: { repository: null }, errors: [{ type: 'NOT_FOUND' }] })
    await expect(fetchArtifacts('tok', fakeGitHub({ graphql }))).rejects.toMatchObject({
      code: 'artifacts-no-access',
    })
  })
})

describe('loadArtifacts', () => {
  it('reuses a fresh copy and serves the last good one when a refresh fails', async () => {
    let now = 0
    const clock = () => now
    const ok = fakeGitHub()
    const first = await loadArtifacts('tok', ok, clock)
    await loadArtifacts('tok', ok, clock)
    expect(ok).toHaveBeenCalledTimes(2) // one tree + one GraphQL batch

    now = CACHE_TTL_MS + 1
    const failing = fakeGitHub({ tree: json({ message: 'boom' }, 500) })
    expect(await loadArtifacts('tok', failing, clock)).toBe(first)
  })
})

interface FakeRes {
  statusCode: number
  headers: Record<string, string>
  body: unknown
}

async function call(query: Record<string, string> = {}, method = 'GET'): Promise<FakeRes> {
  const req = { method, query, cookies: {}, headers: { host: 'localhost:3000' } }
  const out: FakeRes = { statusCode: 200, headers: {}, body: undefined }
  const res = {
    headersSent: false,
    setHeader(name: string, value: string) {
      out.headers[name.toLowerCase()] = value
      return res
    },
    status(code: number) {
      out.statusCode = code
      return res
    },
    json(body: unknown) {
      out.body = body
      return res
    },
    send(body: unknown) {
      out.body = body
      return res
    },
    end() {
      return res
    },
  }
  await handler(req as unknown as VercelRequest, res as unknown as VercelResponse)
  return out
}

describe('GET /api/artifacts', () => {
  it('works without a token or a session', async () => {
    vi.stubEnv('ARTIFACTS_GITHUB_TOKEN', '')
    vi.stubGlobal('fetch', fakeGitHub())
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      source: {
        url: 'https://github.com/dawn-care/Artifacts',
        rawUrl: 'https://raw.githubusercontent.com/dawn-care/Artifacts',
        branch: 'main',
      },
      index: '# raw README.md',
      assets: ['diagrams/model.png'],
    })
    expect((res.body as { documents: unknown[] }).documents).toHaveLength(4)
  })

  it('returns every document to a signed-out visitor, cacheable by the CDN', async () => {
    vi.stubEnv('ARTIFACTS_GITHUB_TOKEN', 'tok')
    vi.stubGlobal('fetch', fakeGitHub())
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toContain('s-maxage=300')
    const body = res.body as { documents: unknown[]; assets: string[] }
    expect(body.documents).toHaveLength(4)
    expect(body.assets).toEqual(['diagrams/model.png'])
    expect(JSON.stringify(body)).not.toContain('tok')
  })

  it('serves listed images sandboxed, and nothing else from the repo', async () => {
    vi.stubEnv('ARTIFACTS_GITHUB_TOKEN', 'tok')
    vi.stubGlobal('fetch', fakeGitHub())
    const image = await call({ asset: 'diagrams/model.png' })
    expect(image.statusCode).toBe(200)
    expect(image.headers['content-type']).toBe('image/png')
    expect(image.headers['content-security-policy']).toContain('sandbox')

    for (const asset of ['diagrams/Domain Model.drawio', 'Feature List.md', '../etc/passwd']) {
      expect((await call({ asset })).statusCode).toBe(404)
    }
  })

  it("returns a clean JSON error when GitHub refuses, without GitHub's message", async () => {
    vi.stubEnv('ARTIFACTS_GITHUB_TOKEN', 'tok')
    vi.stubGlobal('fetch', fakeGitHub({ tree: json({ message: 'Bad credentials' }, 401) }))
    const res = await call()
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({
      error: {
        code: 'artifacts-no-access',
        message: "The site can't read the Artifacts repository right now.",
      },
    })
  })

  it('rejects other methods', async () => {
    expect((await call({}, 'POST')).statusCode).toBe(405)
  })
})
