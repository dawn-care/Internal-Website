import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { ArtifactsResponse } from '../src/lib/artifacts/types.js'
import { ArtifactsError, fetchArtifactAsset, loadArtifacts } from './_lib/artifacts.js'
import { getArtifactsToken } from './_lib/env.js'
import { ARTIFACTS_REPOSITORY } from './_lib/config.js'
import { sendError, withErrors } from './_lib/http.js'

/*
 * GET /api/artifacts           → ArtifactsResponse (every document, with its Markdown)
 * GET /api/artifacts?asset=<p> → one image from the repo, for documents that embed it
 *
 * PUBLIC: no session needed. The documents come from the public dawn-care/Artifacts repo,
 * read through the server (rather than by each browser) so GitHub sees one cached reader
 * instead of every visitor. The optional ARTIFACTS_GITHUB_TOKEN never leaves the server.
 */

/** Browsers keep a copy for a minute; Vercel's CDN for five, then refreshes in the background. */
const DOCUMENTS_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
const ASSET_CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
/** Images (SVGs especially) are inert even if opened directly: no scripts, no requests. */
const ASSET_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"

export default withErrors(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET')
    return sendError(res, 405, 'method-not-allowed', 'Use GET for this endpoint.')
  }

  const asset = single(req.query.asset)
  const token = getArtifactsToken()

  try {
    const snapshot = await loadArtifacts(token)
    if (asset !== undefined) {
      // Only images listed in the repo's tree, so this can't fetch arbitrary repo files.
      if (!snapshot.assets.has(asset)) return sendError(res, 404, 'not-found', 'No such image.')
      return await sendAsset(res, asset)
    }
    res.setHeader('Cache-Control', DOCUMENTS_CACHE)
    res.status(200).json({
      source: {
        url: `https://github.com/${ARTIFACTS_REPOSITORY.owner}/${ARTIFACTS_REPOSITORY.name}`,
        branch: ARTIFACTS_REPOSITORY.branch,
      },
      documents: snapshot.documents,
      assets: [...snapshot.assets.keys()],
      generatedAt: new Date().toISOString(),
    } satisfies ArtifactsResponse)
  } catch (err) {
    if (!(err instanceof ArtifactsError)) throw err
    // GitHub's status and message go to the logs only.
    console.error(`[artifacts] ${err.code} ${err.detail}`)
    sendError(res, err.status, err.code, err.message)
  }
})

async function sendAsset(res: VercelResponse, path: string): Promise<void> {
  const { body, contentType } = await fetchArtifactAsset(path)
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', ASSET_CACHE)
  res.setHeader('Content-Security-Policy', ASSET_CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(200).send(body)
}

function single(value: VercelRequest['query'][string]): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
