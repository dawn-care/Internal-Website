import { list, put } from '@vercel/blob'
import { MAX_SLOTS } from '../../../retirement/shared/catalog.js'
import {
  validateSave,
  type ChatMsg,
  type Look,
  type Player,
  type PresenceIn,
  type Save,
} from '../../../retirement/shared/schema.js'
import { parseTable, type TableState } from '../../../retirement/shared/tables.js'
import { readJsonBlob } from '../blob.js'
import { ConfigError } from '../env.js'

/*
 * Storage for the Sunset Acres game (/retirement).
 *
 * - With Upstash Redis configured (KV_REST_API_URL + KV_REST_API_TOKEN, or the
 *   UPSTASH_REDIS_REST_* names, as the Vercel Marketplace integration sets them), saves,
 *   presence and chat all live in Redis, so every function instance sees the same world.
 *   Spoken to over its REST API with fetch: no client package.
 * - Without it, saves go to the private Blob store (retirement/saves/<login>.json) and
 *   presence/chat live in this function instance's memory. That's fine locally, but on a
 *   deployment players served by different instances won't always see each other.
 * - With neither (local dev without a Blob token), everything is in memory.
 * - Board-game tables live with presence: in Redis (ret:tables, written with a compare-and-set on
 *   the state's version), else in this instance's memory.
 */

export const PRESENCE_TTL_MS = 15_000
const CHAT_KEEP = 50
const CHAT_GAP_MS = 1_200

export interface SyncResult {
  players: Player[]
  chat: ChatMsg[]
  /** Every table's state, when asked for (players on the grounds). */
  tables?: TableState[]
}

export interface PresenceEntry extends PresenceIn {
  login: string
  look: Look
  t: number
}

export interface Store {
  readonly kind: 'redis' | 'blob' | 'memory'
  getSave(login: string): Promise<Save | null>
  putSave(login: string, save: Save): Promise<void>
  allSaves(): Promise<Map<string, Save>>
  /** Records `me`, posts `msg` (rate-limited; returns false if dropped), lists others online. */
  sync(
    me: PresenceEntry,
    msg: ChatMsg | null,
    since: number,
    withTables?: boolean,
  ): Promise<SyncResult & { sent: boolean }>
  /** Table `id` and everyone's current presence (to see who is sitting at it). */
  tableContext(id: string): Promise<{ table: TableState | null; players: PresenceEntry[] }>
  /** Stores `t` only if the stored version is still `expect` (0: no state yet). */
  putTable(t: TableState, expect: number): Promise<boolean>
}

function parseSave(raw: unknown): Save | null {
  try {
    return validateSave(typeof raw === 'string' ? JSON.parse(raw) : raw)
  } catch {
    return null
  }
}

function parseJson<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// --- Redis (Upstash REST) -----------------------------------------------------------------

const K = {
  saves: 'ret:saves',
  presence: 'ret:presence',
  chat: 'ret:chat',
  tables: 'ret:tables',
  chatGate: (login: string) => `ret:chatgate:${login}`,
}

type Cmd = (string | number)[]

/** HSET a table only if its stored version (0 when absent) is still ARGV[2]. */
const PUT_TABLE_LUA = `local cur = redis.call('HGET', KEYS[1], ARGV[1])
local v = 0
if cur then v = tonumber(cjson.decode(cur).version) or 0 end
if v ~= tonumber(ARGV[2]) then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
return 1`

class RedisStore implements Store {
  readonly kind = 'redis'
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async pipeline(cmds: Cmd[]): Promise<unknown[]> {
    const res = await fetch(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    })
    if (!res.ok) throw new Error(`[retirement] redis responded ${res.status}`)
    const out = (await res.json()) as { result?: unknown; error?: string }[]
    return out.map((r) => {
      if (r.error) throw new Error(`[retirement] redis error: ${r.error}`)
      return r.result
    })
  }

  async getSave(login: string) {
    const [raw] = await this.pipeline([['HGET', K.saves, login]])
    return raw ? parseSave(raw) : null
  }

  async putSave(login: string, save: Save) {
    await this.pipeline([['HSET', K.saves, login, JSON.stringify(save)]])
  }

  async allSaves() {
    const [flat] = await this.pipeline([['HGETALL', K.saves]])
    return pairs(flat, parseSave)
  }

  async sync(me: PresenceEntry, msg: ChatMsg | null, since: number, withTables = false) {
    let sent = false
    if (msg) {
      const [gate] = await this.pipeline([
        ['SET', K.chatGate(me.login), '1', 'PX', CHAT_GAP_MS, 'NX'],
      ])
      if (gate === 'OK') {
        await this.pipeline([
          ['LPUSH', K.chat, JSON.stringify(msg)],
          ['LTRIM', K.chat, 0, CHAT_KEEP - 1],
        ])
        sent = true
      }
    }
    const [, flat, chatRaw, tablesRaw] = await this.pipeline([
      ['HSET', K.presence, me.login, JSON.stringify(me)],
      ['HGETALL', K.presence],
      ['LRANGE', K.chat, 0, CHAT_KEEP - 1],
      ...(withTables ? [['HGETALL', K.tables]] : []),
    ])
    const all = pairs(flat, (v) => parseJson<PresenceEntry>(v))
    const stale = [...all].filter(([, p]) => me.t - p.t > PRESENCE_TTL_MS * 4).map(([l]) => l)
    if (stale.length) void this.pipeline([['HDEL', K.presence, ...stale]]).catch(() => {})
    const chat = (Array.isArray(chatRaw) ? chatRaw : [])
      .map((m) => parseJson<ChatMsg>(m))
      .filter((m): m is ChatMsg => !!m && m.id > since)
      .reverse()
    return {
      players: online(all.values(), me),
      chat,
      sent,
      ...(withTables ? { tables: [...pairs(tablesRaw, readTable).values()] } : {}),
    }
  }

  async tableContext(id: string) {
    const [raw, flat] = await this.pipeline([
      ['HGET', K.tables, id],
      ['HGETALL', K.presence],
    ])
    const players = [...pairs(flat, (v) => parseJson<PresenceEntry>(v)).values()]
    return { table: readTable(raw), players: fresh(players) }
  }

  async putTable(t: TableState, expect: number) {
    const [ok] = await this.pipeline([
      ['EVAL', PUT_TABLE_LUA, 1, K.tables, t.id, expect, JSON.stringify(t)],
    ])
    return ok === 1
  }
}

function readTable(raw: unknown): TableState | null {
  return parseTable(parseJson<unknown>(raw))
}

/** Presence entries recent enough to count as online. */
function fresh(entries: PresenceEntry[]): PresenceEntry[] {
  const now = Date.now()
  return entries.filter((p) => now - p.t <= PRESENCE_TTL_MS)
}

function pairs<T>(flat: unknown, parse: (v: unknown) => T | null): Map<string, T> {
  const out = new Map<string, T>()
  if (!Array.isArray(flat)) return out
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const v = parse(flat[i + 1])
    if (v) out.set(String(flat[i]), v)
  }
  return out
}

function online(entries: Iterable<PresenceEntry>, me: PresenceEntry): Player[] {
  const out: Player[] = []
  for (const p of entries) {
    if (p.login === me.login || me.t - p.t > PRESENCE_TTL_MS) continue
    out.push({
      login: p.login,
      look: p.look,
      map: p.map,
      x: p.x,
      y: p.y,
      dir: p.dir,
      moving: p.moving,
      ...(p.pet ? { pet: p.pet } : {}),
      ...(p.sit ? { sit: p.sit, sitAt: p.sitAt } : {}),
      t: p.t,
    })
  }
  return out
}

// --- Blob / memory fallback ------------------------------------------------------------------

const SAVE_PREFIX = 'retirement/saves/'
const ALL_CACHE_MS = 20_000

class LocalStore implements Store {
  readonly kind: 'blob' | 'memory'
  private saves = new Map<string, Save>()
  private loadedAll = 0
  private presence = new Map<string, PresenceEntry>()
  private chat: ChatMsg[] = []
  private lastMsg = new Map<string, number>()
  private tables = new Map<string, TableState>()

  constructor(private blobToken: string | undefined) {
    this.kind = blobToken ? 'blob' : 'memory'
  }

  async getSave(login: string) {
    if (!this.blobToken) return this.saves.get(login) ?? null
    const blob = await readJsonBlob(`${SAVE_PREFIX}${login}.json`)
    const save = blob ? parseSave(blob.data) : null
    if (save) this.saves.set(login, save)
    return save
  }

  async putSave(login: string, save: Save) {
    this.saves.set(login, save)
    if (!this.blobToken) return
    await put(`${SAVE_PREFIX}${login}.json`, JSON.stringify(save), {
      access: 'private',
      token: this.blobToken,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    })
  }

  async allSaves() {
    if (this.blobToken && Date.now() - this.loadedAll > ALL_CACHE_MS) {
      const logins: string[] = []
      let cursor: string | undefined
      do {
        const page = await list({ prefix: SAVE_PREFIX, token: this.blobToken, cursor, limit: 1000 })
        for (const b of page.blobs) {
          const m = /^retirement\/saves\/([A-Za-z0-9-]+)\.json$/.exec(b.pathname)
          if (m) logins.push(m[1])
        }
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      await Promise.all(logins.map((l) => this.getSave(l)))
      this.loadedAll = Date.now()
    }
    return new Map(this.saves)
  }

  async sync(me: PresenceEntry, msg: ChatMsg | null, since: number, withTables = false) {
    this.presence.set(me.login, me)
    for (const [l, p] of this.presence)
      if (me.t - p.t > PRESENCE_TTL_MS * 4) this.presence.delete(l)
    let sent = false
    if (msg && me.t - (this.lastMsg.get(me.login) ?? 0) >= CHAT_GAP_MS) {
      this.lastMsg.set(me.login, me.t)
      this.chat.push(msg)
      if (this.chat.length > CHAT_KEEP) this.chat.splice(0, this.chat.length - CHAT_KEEP)
      sent = true
    }
    return {
      players: online(this.presence.values(), me),
      chat: this.chat.filter((m) => m.id > since),
      sent,
      ...(withTables ? { tables: [...this.tables.values()] } : {}),
    }
  }

  async tableContext(id: string) {
    return { table: this.tables.get(id) ?? null, players: fresh([...this.presence.values()]) }
  }

  async putTable(t: TableState, expect: number) {
    if ((this.tables.get(t.id)?.version ?? 0) !== expect) return false
    this.tables.set(t.id, t)
    return true
  }
}

// --- choosing one -------------------------------------------------------------------------------

let store: Store | null = null

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

export function getStore(): Store {
  if (store) return store
  const url = env('KV_REST_API_URL') ?? env('UPSTASH_REDIS_REST_URL')
  const token = env('KV_REST_API_TOKEN') ?? env('UPSTASH_REDIS_REST_TOKEN')
  if (url && !token)
    throw new ConfigError('Missing required environment variable(s): KV_REST_API_TOKEN.')
  if (token && !url)
    throw new ConfigError('Missing required environment variable(s): KV_REST_API_URL.')
  if (url && token) {
    store = new RedisStore(url, token)
  } else {
    const blob = env('BLOB_READ_WRITE_TOKEN')
    if (!blob && process.env.VERCEL_ENV === 'production') {
      throw new ConfigError(
        'Missing required environment variable(s): KV_REST_API_URL and KV_REST_API_TOKEN (or BLOB_READ_WRITE_TOKEN).',
      )
    }
    store = new LocalStore(blob)
  }
  return store
}

/** For tests. */
export function setStore(next: Store | null): void {
  store = next
}

export function createMemoryStore(): Store {
  return new LocalStore(undefined)
}

/** The lowest plot/door not taken by someone else, or -1 if they're all taken. */
export function freeSlot(saves: Map<string, Save>, login: string): number {
  const taken = new Set<number>()
  for (const [l, s] of saves) if (l !== login && s.slot >= 0) taken.add(s.slot)
  for (let i = 0; i < MAX_SLOTS; i++) if (!taken.has(i)) return i
  return -1
}
