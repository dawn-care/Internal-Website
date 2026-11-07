import { CROP_IDS, CROPS, HAIR_STYLES, MAX_SLOTS, PLOT_SIZES, plotSize } from '../shared/catalog'
import { getGrounds, seatsOf, type Seat } from './maps'
import { petBedtime } from './pets'
import {
  defaultLook,
  newSave,
  toProfile,
  type ChatMsg,
  type Look,
  type MapId,
  type PetLook,
  type Player,
  type PresenceIn,
  type Profile,
  type Save,
} from '../shared/schema'
import {
  C4_COLS,
  TABLES,
  applyTableAction,
  c4Drop,
  c4Line,
  CK,
  ckMoves,
  seatedAt,
  tableOfSeat,
  tableSeat,
  type Side,
  type TableAction,
  type TableState,
} from '../shared/tables'

/*
 * Talking to /api/retirement. RemoteNet is the real thing. LocalNet is for `npm run
 * dev:retirement` (no API): it saves to localStorage and invents two neighbours who wander
 * the grounds and chat, so the multiplayer bits can be seen without a server.
 */

export interface MeResult {
  user: { login: string; name: string; avatarUrl: string }
  save: Save | null
  slot: number
  storage: string
}

export interface SyncBody {
  p: PresenceIn
  look: Look
  msg?: string
  since: number
}

export interface SyncResult {
  players: Player[]
  chat: ChatMsg[]
  sent: boolean
  now: number
  /** Someone else was already sitting on the seat you sent. */
  seatTaken?: boolean
  /** The board-game tables (sent while you're on the grounds). */
  tables?: TableState[]
}

export interface TableBody {
  id: string
  version: number
  action: TableAction
}

export interface Net {
  readonly local: boolean
  me(): Promise<MeResult>
  world(): Promise<Profile[]>
  save(save: Save): Promise<{ slot: number }>
  /** Best-effort save while the page is closing. */
  saveOnExit(save: Save): void
  sync(body: SyncBody): Promise<SyncResult>
  /** An action at a board-game table; a NetError with status 409 if the board has moved on. */
  table(body: TableBody): Promise<{ table: TableState }>
}

export class NetError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const API = '/api/retirement'

async function call<T>(op: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}?op=${op}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('application/json'))
    throw new NetError(res.status, 'no-api', 'The game server is not reachable.')
  const data = (await res.json()) as T & { error?: { code: string; message: string } }
  if (!res.ok || data.error) {
    throw new NetError(
      res.status,
      data.error?.code ?? 'error',
      data.error?.message ?? `Request failed (${res.status}).`,
    )
  }
  return data
}

export class RemoteNet implements Net {
  readonly local = false
  me() {
    return call<MeResult>('me')
  }
  async world() {
    return (await call<{ profiles: Profile[] }>('world')).profiles
  }
  save(save: Save) {
    return call<{ slot: number }>('save', { save })
  }
  saveOnExit(save: Save) {
    void fetch(`${API}?op=save`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save }),
      keepalive: true,
    }).catch(() => {})
  }
  sync(body: SyncBody) {
    return call<SyncResult>('sync', body)
  }
  table(body: TableBody) {
    return call<{ table: TableState }>('table', body)
  }
}

// --- offline stand-in -----------------------------------------------------------------------

const LS_KEY = 'sunset-acres-local-save'
const STRESS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('stress')

interface Bot {
  login: string
  look: Look
  x: number
  y: number
  tx: number
  ty: number
  dir: 0 | 1 | 2 | 3
  slot: number
  garden: Profile['garden']
  plot?: number
  /** Her pet; `out` means it follows her around (else it's asleep in its bed at home). */
  pet?: PetLook & { out: boolean }
  /** Likes a sit-down on a bench now and then. */
  sitter?: boolean
  /** On the way to a seat, or sitting on it until `until`. */
  bench?: { seat: Seat; at: number; until: number; sitting: boolean }
  /** Plays board games: comes to sit opposite you when you sit at a table. */
  player?: boolean
}

const BOT_LINES = [
  'Lovely weather for the tomatoes!',
  'Has anyone seen my reading glasses?',
  "Bingo is at 3 o'clock, dear.",
  'My pumpkins are coming along nicely.',
  'Chef Rosa pays a fair price for radishes.',
  'Back in my day we watered by hand. Uphill!',
  'Would you like a butterscotch?',
]

export class LocalNet implements Net {
  readonly local = true
  private chat: ChatMsg[] = []
  private bots: Bot[]
  private last = Date.now()
  private tables = new Map<string, TableState>()
  /** Your presence as of the last sync, to know whether you're sitting at a table. */
  private you: Player | null = null
  /** When Walt may next move in a game, so he seems to think about it. */
  private botThinkUntil = 0

  constructor() {
    const ripe = (crop: string, i: number) =>
      i % 3 === 0
        ? { s: 0 as const }
        : { s: 1 as const, c: crop, g: 1e9, t: Date.now(), w: Date.now() + 60_000 }
    const garden = (crop: string, level = 0) => {
      const { w, h } = plotSize(level)
      return Array.from({ length: w * h }, (_, i) => ripe(crop, i))
    }
    this.bots = [
      {
        login: 'walt-bot',
        look: {
          name: 'Grandpa Walt',
          body: 'male',
          skin: 2,
          hair: 'bald',
          hairColor: 1,
          outfit: 3,
          pants: 1,
          accessory: 'cane',
        },
        x: 20,
        y: 15,
        tx: 20,
        ty: 15,
        dir: 0,
        slot: 1,
        sitter: true,
        player: true,
        // Walt has bought the middle-sized plot.
        plot: 1,
        garden: garden('pumpkin', 1),
        pet: { kind: 'dog', coat: 0, name: 'Duke', out: false },
      },
      {
        login: 'june-bot',
        look: {
          name: 'Nana June',
          body: 'female',
          skin: 0,
          hair: 'perm',
          hairColor: 3,
          outfit: 7,
          pants: 0,
          accessory: 'pearls',
        },
        x: 28,
        y: 17,
        tx: 28,
        ty: 17,
        dir: 0,
        slot: 2,
        garden: garden('sunflower'),
        pet: { kind: 'cat', coat: 3, name: 'Pickles', out: true },
      },
    ]
    if (STRESS) this.addStress()
  }

  /**
   * `?stress`: the worst case, for checking performance (see src/perf.ts). Every free allotment is
   * a full 9 × 5 plot of crops at all stages, ten more neighbours (with pets) wander the grounds,
   * and every games table has a game on.
   */
  private addStress() {
    const top = PLOT_SIZES.length - 1
    const now = Date.now()
    const full = () =>
      Array.from({ length: plotSize(top).w * plotSize(top).h }, (_, i) => {
        const c = CROP_IDS[i % CROP_IDS.length]
        return {
          s: 1 as const,
          c,
          g: (CROPS[c].growMs * ((i * 7) % 11)) / 10,
          t: now,
          w: now + 9e9,
        }
      })
    for (const b of this.bots) {
      b.plot = top
      b.garden = full()
    }
    for (let i = 0; i < 10; i++) {
      this.bots.push({
        login: `stress-${i}`,
        look: {
          name: `Neighbour ${i + 1}`,
          body: i % 2 ? 'male' : 'female',
          skin: i % 5,
          hair: HAIR_STYLES[i % HAIR_STYLES.length],
          hairColor: i % 6,
          outfit: i % 8,
          pants: i % 4,
          accessory: 'none',
        },
        x: 12 + i * 2,
        y: 17.5,
        tx: 12 + i * 2,
        ty: 17.5,
        dir: 0,
        slot: 3 + i < MAX_SLOTS ? 3 + i : -1,
        garden: full(),
        plot: top,
        ...(i % 2
          ? { pet: { kind: i % 4 === 1 ? 'dog' : 'cat', coat: i % 4, name: `Pet ${i}`, out: true } }
          : {}),
      } as Bot)
    }
    TABLES.forEach((t, i) => {
      const seated: [{ login: string; name: string }, { login: string; name: string }] = [
        { login: `stress-${i * 2}`, name: 'A' },
        { login: `stress-${i * 2 + 1}`, name: 'B' },
      ]
      const game = i % 2 ? 'checkers' : 'connect4'
      let st = applyTableAction(t.id, null, { type: 'start', game }, seated[0].login, seated, now)
      if (game === 'connect4')
        for (let k = 0; k < 9; k++)
          st = applyTableAction(
            t.id,
            st,
            { type: 'move', path: [(k * 3) % 7] },
            st.players[st.turn],
            seated,
            now,
          )
      this.tables.set(t.id, st)
    })
  }

  async me(): Promise<MeResult> {
    let save: Save | null = null
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) save = JSON.parse(raw) as Save
    } catch {
      save = null
    }
    return { user: { login: 'you', name: 'You', avatarUrl: '' }, save, slot: 0, storage: 'local' }
  }

  async world(): Promise<Profile[]> {
    return this.bots
      .filter((b) => b.slot >= 0)
      .map((b) => {
        const s = newSave(b.look, 0)
        s.slot = b.slot
        s.garden = b.garden
        if (b.plot) s.plot = b.plot
        s.room.items.push(
          { k: 'rocker', x: 6, y: 4 },
          { k: 'rug', x: 5, y: 5 },
          { k: 'catbed', x: 10, y: 3 },
          { k: 'petbed', x: 12, y: 5 },
        )
        if (b.pet)
          s.pet = { kind: b.pet.kind, coat: b.pet.coat, name: b.pet.name, adoptedAt: 0, hearts: 5 }
        return toProfile(b.login, s)
      })
  }

  async save(save: Save) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...save, slot: 0 }))
    } catch {
      // Storage may be unavailable (private window); progress just won't persist.
    }
    return { slot: 0 }
  }

  saveOnExit(save: Save) {
    void this.save(save)
  }

  /** The same rules as the server, with Walt and you as the people at the tables. */
  async table(body: TableBody): Promise<{ table: TableState }> {
    const t = this.tables.get(body.id) ?? null
    if ((t?.version ?? 0) !== body.version)
      throw new NetError(409, 'changed', 'The board changed just now. Have another look!')
    let next: TableState
    try {
      next = applyTableAction(body.id, t, body.action, 'you', this.seated(body.id), Date.now())
    } catch (err) {
      throw new NetError(400, 'invalid-input', err instanceof Error ? err.message : String(err))
    }
    this.tables.set(body.id, next)
    this.botThinkUntil = Date.now() + 1200 + Math.random() * 1500
    return { table: next }
  }

  private seated(id: string) {
    const ps = this.bots.map((b) => this.botPlayer(b, Date.now()))
    return seatedAt(id, this.you ? [...ps, this.you] : ps)
  }

  /** Walt's turn at a table he's sitting at: win if he can, block you if he must, else a guess. */
  private botMove(b: Bot, now: number) {
    const seat = tableOfSeat(b.bench?.sitting ? b.bench.seat.id : undefined)
    const t = seat && this.tables.get(seat.id)
    if (!seat || !t || t.result || now < this.botThinkUntil) return
    if (t.players[seat.side] !== b.login || t.turn !== seat.side) return
    const path = t.game === 'connect4' ? [c4Pick(t.board, seat.side)] : ckPick(t.board, seat.side)
    try {
      const next = applyTableAction(
        t.id,
        t,
        { type: 'move', path },
        b.login,
        this.seated(t.id),
        now,
      )
      this.tables.set(t.id, next)
    } catch {
      // No move (shouldn't happen): leave it to you to resign or start again.
    }
  }

  private botPlayer(b: Bot, now: number): Player {
    return {
      login: b.login,
      look: b.look,
      map: 'grounds' as MapId,
      x: b.x,
      y: b.y,
      dir: b.dir,
      moving: !b.bench?.sitting && Math.hypot(b.tx - b.x, b.ty - b.y) > 0.1,
      ...(b.bench?.sitting ? { sit: b.bench.seat.id, sitAt: b.bench.at } : {}),
      // Like real players' pets, hers stays home in bed at night (9 pm–6 am, game clock).
      ...(b.pet?.out && !petBedtime(((now % 1_440_000) / 1_440_000) * 24)
        ? { pet: { kind: b.pet.kind, coat: b.pet.coat, name: b.pet.name } }
        : {}),
      t: now,
    }
  }

  async sync(body: SyncBody): Promise<SyncResult> {
    const now = Date.now()
    this.you = { ...body.p, login: 'you', look: body.look, t: now }
    const yourTable = body.p.map === 'grounds' ? tableOfSeat(body.p.sit) : null
    const dt = (now - this.last) / 1000
    this.last = now
    if (body.msg)
      this.chat.push({
        id: now * 100,
        login: 'you',
        name: body.look.name,
        map: body.p.map,
        text: body.msg,
        t: now,
      })
    const chatMaybe = (b: Bot) => {
      if (Math.random() < 0.012) {
        const text = BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]
        this.chat.push({
          id: now * 100 + 1 + this.bots.indexOf(b),
          login: b.login,
          name: b.look.name,
          map: 'grounds',
          text,
          t: now,
        })
      }
    }
    for (const b of this.bots) {
      // You sat at a table: Walt comes over to sit opposite (and gets up again when you leave).
      if (b.player) {
        const atTable = tableOfSeat(b.bench?.seat.id)
        if (yourTable && !atTable) {
          const seat = seatsOf(getGrounds()).find(
            (s) => s.id === tableSeat(yourTable.id, (1 - yourTable.side) as Side),
          )
          if (seat) {
            b.bench = { seat, at: 0, until: Infinity, sitting: false }
            b.tx = seat.x
            b.ty = seat.y + 0.8
          }
        } else if (atTable && (!yourTable || yourTable.id !== atTable.id) && b.bench) {
          b.bench.until = Math.min(b.bench.until, now + 2500)
          if (!b.bench.sitting) {
            b.bench = undefined
            b.tx = b.x
            b.ty = b.y
          }
        }
        if (atTable && b.bench?.sitting) this.botMove(b, now)
      }
      // Walt's bench breaks: walk up to a free seat on the plaza, sit 20–60s, get up again.
      if (b.bench?.sitting) {
        if (now < b.bench.until) {
          chatMaybe(b)
          continue
        }
        b.y = b.bench.seat.y + 0.8
        b.tx = b.x
        b.ty = b.y
        b.bench = undefined
      }
      const dx = b.tx - b.x
      const dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      if (d < 0.1 && b.bench) {
        b.x = b.bench.seat.x
        b.y = b.bench.seat.y
        b.dir = 0
        b.bench = {
          ...b.bench,
          sitting: true,
          at: now,
          until: tableOfSeat(b.bench.seat.id)
            ? b.bench.until
            : now + 20_000 + Math.random() * 40_000,
        }
        continue
      }
      if (d < 0.1) {
        if (b.sitter && Math.random() < 0.25) {
          const seats = seatsOf(getGrounds()).filter(
            (s) => s.y < 16 && s.x > 15 && s.x < 32 && s.id !== body.p.sit && !tableOfSeat(s.id),
          )
          const seat = seats[Math.floor(Math.random() * seats.length)]
          if (seat) {
            b.bench = { seat, at: 0, until: 0, sitting: false }
            b.tx = seat.x
            b.ty = seat.y + 0.8
            continue
          }
        }
        if (Math.random() < 0.3) {
          b.tx = 12 + Math.random() * 22
          b.ty = 14 + Math.random() * 4.5
        }
      } else {
        const s = Math.min(d, 2.2 * dt)
        b.x += (dx / d) * s
        b.y += (dy / d) * s
        b.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
      }
      chatMaybe(b)
    }
    if (this.chat.length > 50) this.chat.splice(0, this.chat.length - 50)
    const players = this.bots.map((b) => this.botPlayer(b, now))
    return {
      players,
      chat: this.chat.filter((m) => m.id > body.since),
      sent: !!body.msg,
      now,
      ...(body.p.map === 'grounds' ? { tables: [...this.tables.values()] } : {}),
    }
  }
}

/** Connect 4 for Walt: take a win, block yours, else favour the middle. */
function c4Pick(board: number[], side: Side): number {
  const open = [...Array(C4_COLS).keys()].filter((c) => c4Drop(board, c) >= 0)
  const wins = (who: number) =>
    open.find((c) => {
      const b = board.slice()
      const r = c4Drop(b, c)
      b[r * C4_COLS + c] = who
      return c4Line(b, r, c) !== null
    })
  const win = wins(side + 1) ?? wins(2 - side)
  if (win !== undefined) return win
  const weights = open.map((c) => 4 - Math.abs(3 - c) + Math.random() * 2.5)
  return open[weights.indexOf(Math.max(...weights))]
}

/** Checkers for Walt: the longest capture, else any move, preferring not to leave the back row. */
function ckPick(board: number[], side: Side): number[] {
  const moves = ckMoves(board, side)
  const longest = Math.max(...moves.map((m) => m.length))
  const best = moves.filter((m) => m.length === longest)
  const backRow = side === 0 ? CK - 1 : 0
  const keep = best.filter((m) => Math.floor(m[0] / CK) !== backRow)
  const pool = keep.length ? keep : best
  return pool[Math.floor(Math.random() * pool.length)]
}

export { defaultLook }
