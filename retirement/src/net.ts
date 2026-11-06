import { PLOT_H, PLOT_W } from '../shared/catalog'
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
}

export interface Net {
  readonly local: boolean
  me(): Promise<MeResult>
  world(): Promise<Profile[]>
  save(save: Save): Promise<{ slot: number }>
  /** Best-effort save while the page is closing. */
  saveOnExit(save: Save): void
  sync(body: SyncBody): Promise<SyncResult>
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
}

// --- offline stand-in -----------------------------------------------------------------------

const LS_KEY = 'sunset-acres-local-save'

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
  /** Her pet; `out` means it follows her around (else it's asleep in its bed at home). */
  pet?: PetLook & { out: boolean }
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

  constructor() {
    const ripe = (crop: string, i: number) =>
      i % 3 === 0
        ? { s: 0 as const }
        : { s: 1 as const, c: crop, g: 1e9, t: Date.now(), w: Date.now() + 60_000 }
    const garden = (crop: string) =>
      Array.from({ length: PLOT_W * PLOT_H }, (_, i) => ripe(crop, i))
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
        garden: garden('pumpkin'),
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
    return this.bots.map((b) => {
      const s = newSave(b.look, 0)
      s.slot = b.slot
      s.garden = b.garden
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

  async sync(body: SyncBody): Promise<SyncResult> {
    const now = Date.now()
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
    for (const b of this.bots) {
      const dx = b.tx - b.x
      const dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      if (d < 0.1) {
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
    if (this.chat.length > 50) this.chat.splice(0, this.chat.length - 50)
    const players: Player[] = this.bots.map((b) => ({
      login: b.login,
      look: b.look,
      map: 'grounds' as MapId,
      x: b.x,
      y: b.y,
      dir: b.dir,
      moving: Math.hypot(b.tx - b.x, b.ty - b.y) > 0.1,
      // Like real players' pets, hers stays home in bed at night (9 pm–6 am, game clock).
      ...(b.pet?.out && !petBedtime(((now % 1_440_000) / 1_440_000) * 24)
        ? { pet: { kind: b.pet.kind, coat: b.pet.coat, name: b.pet.name } }
        : {}),
      t: now,
    }))
    return { players, chat: this.chat.filter((m) => m.id > body.since), sent: !!body.msg, now }
  }
}

export { defaultLook }
