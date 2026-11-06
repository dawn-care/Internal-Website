import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  MAX_CHAT_CHARS,
  MAX_SAVE_BYTES,
  SaveError,
  cleanText,
  toProfile,
  validateLook,
  validatePresence,
  seatTaken,
  validateSave,
  type ChatMsg,
} from '../retirement/shared/schema.js'
import { requireSameOrigin, sendError, sendJson, withErrors } from './_lib/http.js'
import { freeSlot, getStore } from './_lib/retirement/store.js'
import { getSession, getValidAuth } from './_lib/session.js'

// Moved here from dist/retirement/index.html by scripts/finalize-game-build.mjs, so the page
// is only reachable through this function (see api/game.ts for why).
const INDEX_PATH = join(process.cwd(), 'api/_retirement/index.html')

const SIGN_IN_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sunset Acres</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#2b2440;color:#fff8ef;font:16px/1.5 system-ui,sans-serif;text-align:center">
<main><h1 style="font-size:28px">Sunset Acres</h1><p>Sign in with GitHub to visit the home, tend your garden and see your neighbours.</p>
<p><a style="display:inline-block;padding:10px 18px;border-radius:8px;background:#e07a5f;color:#1e2140;font-weight:700;text-decoration:none" href="/api/auth/login?returnTo=%2Fretirement">Sign in with GitHub</a></p></main></body>`

/**
 * Sunset Acres, the shared nursing-home garden game. One function (Vercel Hobby allows 12):
 *
 *   GET  /retirement          → the game page (rewritten to ?page=1), or a sign-in page
 *   GET  ?op=me               → { user, save | null, slot, storage, now }
 *   GET  ?op=world            → { profiles, now }   everyone's look, garden and room
 *   POST ?op=save   { save }  → { slot, now }
 *   POST ?op=sync   { p, look, msg?, since } → { players, chat, sent, now }
 *
 * Signed-in only. Saves are keyed by GitHub login from the session, never from the body.
 */
export default withErrors(async (req, res) => {
  if (req.query.page !== undefined) return page(req, res)
  const op = typeof req.query.op === 'string' ? req.query.op : ''
  try {
    if (op === 'me' && req.method === 'GET') return await me(req, res)
    if (op === 'world' && req.method === 'GET') return await world(req, res)
    if (op === 'save' && req.method === 'POST') return await save(req, res)
    if (op === 'sync' && req.method === 'POST') return await sync(req, res)
  } catch (err) {
    if (err instanceof SaveError) return sendError(res, 400, 'invalid-input', err.message)
    throw err
  }
  return sendError(res, 404, 'not-found', 'Unknown game request.')
})

async function page(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!(await getSession(req))) {
    res.status(200).end(SIGN_IN_HTML)
    return
  }
  res.status(200).end(await readFile(INDEX_PATH, 'utf-8'))
}

async function me(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { user } = await getValidAuth(req, res)
  const store = getStore()
  const saved = await store.getSave(user.login)
  const slot = saved && saved.slot >= 0 ? saved.slot : freeSlot(await store.allSaves(), user.login)
  sendJson(res, 200, {
    user: { login: user.login, name: user.name, avatarUrl: user.avatarUrl },
    save: saved,
    slot,
    storage: store.kind,
    now: Date.now(),
  })
}

async function world(req: VercelRequest, res: VercelResponse): Promise<void> {
  await getValidAuth(req, res)
  const saves = await getStore().allSaves()
  const profiles = [...saves].map(([login, s]) => toProfile(login, s))
  sendJson(res, 200, { profiles, now: Date.now() })
}

function body(req: VercelRequest): Record<string, unknown> {
  const b: unknown = req.body
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new SaveError('Send a JSON object.')
  return b as Record<string, unknown>
}

async function save(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireSameOrigin(req, res)) return
  const { user } = await getValidAuth(req, res)
  const b = body(req)
  if (JSON.stringify(b.save ?? null).length > MAX_SAVE_BYTES)
    throw new SaveError('That save is too large.')
  const next = validateSave(b.save)
  const store = getStore()
  const prev = await store.getSave(user.login)
  const now = Date.now()
  // The plot/door is the server's to hand out: keep the stored one, else take a free one.
  next.slot = prev && prev.slot >= 0 ? prev.slot : freeSlot(await store.allSaves(), user.login)
  next.createdAt = prev?.createdAt ?? now
  next.updatedAt = now
  await store.putSave(user.login, next)
  sendJson(res, 200, { slot: next.slot, now })
}

async function sync(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireSameOrigin(req, res)) return
  const { user } = await getValidAuth(req, res)
  const b = body(req)
  const presence = validatePresence(b.p)
  const look = validateLook(b.look)
  const since = typeof b.since === 'number' && Number.isFinite(b.since) ? b.since : 0
  const now = Date.now()
  const text = cleanText(b.msg, MAX_CHAT_CHARS)
  const msg: ChatMsg | null = text
    ? {
        id: now * 100 + Math.floor(Math.random() * 100),
        login: user.login,
        name: look.name,
        map: presence.map,
        text,
        t: now,
      }
    : null
  const result = await getStore().sync({ ...presence, login: user.login, look, t: now }, msg, since)
  // Two people can't share a seat: whoever sat down first keeps it.
  const taken = seatTaken({ ...presence, login: user.login }, result.players)
  sendJson(res, 200, { ...result, ...(taken ? { seatTaken: true } : {}), now })
}
