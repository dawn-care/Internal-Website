import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/session.js'

const NOT_FOUND_HTML = '<!doctype html><title>Not found</title><p>Not found.</p>'
const GAME_INDEX_PATH = join(process.cwd(), 'dist/game/index.html')

/**
 * GET /game and /game/. Gated so only signed-in team members (the only people with a
 * `dawn_session` cookie) reach the jumpscare game; everyone else gets a plain 404,
 * same as any other unknown path. The game's hashed asset files under /game/assets
 * stay public static files (served directly by Vercel, not through this function) —
 * meaningless without this page, so they don't need their own gate.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET')
    res.status(405).end()
    return
  }

  const session = await getSession(req)
  if (!session) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').end(NOT_FOUND_HTML)
    return
  }

  const html = await readFile(GAME_INDEX_PATH, 'utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(html)
}
