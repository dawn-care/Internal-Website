import {
  ACCESSORIES,
  BODIES,
  CROPS,
  FLOORS,
  FURNITURE,
  HAIR_COLORS,
  HAIR_STYLES,
  MAX_SLOTS,
  OUTFIT_COLORS,
  PANTS_COLORS,
  PLOT_H,
  PLOT_W,
  ROOM_FLOOR,
  ROOM_WALL,
  SKIN_TONES,
  START_COINS,
  WALLPAPERS,
  type Accessory,
  type Body,
  type HairStyle,
} from './catalog.js'

/*
 * The save format and its validation, shared by the game (to build saves) and the server (to
 * refuse malformed ones). The game is client-authoritative: the server only checks a save is
 * well-formed and within limits, not that every coin was earned honestly.
 */

export interface Look {
  /** Nickname shown above the character. */
  name: string
  /** Skirt or trousers, and a few face details. */
  body: Body
  skin: number
  hair: HairStyle
  hairColor: number
  outfit: number
  pants: number
  accessory: Accessory
}

/** One garden tile. s: 0 grass, 1 tilled. c: crop id. g: growth ms. w: watered until (epoch ms). t: last tick. */
export interface Tile {
  s: 0 | 1
  c?: string
  g?: number
  w?: number
  t?: number
}

/** A furniture piece the player owns. x < 0 means it's in storage, not placed. */
export interface RoomItem {
  k: string
  x: number
  y: number
}

export interface Room {
  wall: string
  floor: string
  items: RoomItem[]
  walls: string[]
  floors: string[]
}

export interface Save {
  v: 1
  look: Look
  coins: number
  /** "seed:<crop>" and "crop:<crop>" counts. */
  inv: Record<string, number>
  garden: Tile[]
  room: Room
  stats: { harvested: number; earned: number }
  /**
   * Nurse Ada's introduction: the step you're on (see INTRO), or absent once it's finished.
   * Saves from before the introduction existed have no field, so those players never see it.
   */
  intro?: IntroStep
  /** Garden plot and hallway door. Assigned by the server, never trusted from the client. */
  slot: number
  createdAt: number
  updatedAt: number
}

/** What other players can see of someone: their look, garden and room. */
export interface Profile {
  login: string
  look: Look
  slot: number
  garden: Tile[]
  room: { wall: string; floor: string; items: RoomItem[] }
}

/** Nurse Ada's introduction, in order. `done` is never stored: a finished intro has no field. */
export const INTRO = { greet: 0, plant: 1, sell: 2, buy: 3, done: 4 } as const
export type IntroStep = 0 | 1 | 2 | 3

export type MapId = 'grounds' | 'hall' | `room:${string}`
export type Dir = 0 | 1 | 2 | 3 // down, left, right, up

export interface PresenceIn {
  map: MapId
  x: number
  y: number
  dir: Dir
  moving: boolean
}

export interface Player extends PresenceIn {
  login: string
  look: Look
  t: number
}

export interface ChatMsg {
  id: number
  login: string
  name: string
  map: MapId
  text: string
  t: number
}

export const MAX_SAVE_BYTES = 32_000
export const MAX_CHAT_CHARS = 140
export const MAX_ROOM_ITEMS = 60

export class SaveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SaveError'
  }
}

export function defaultLook(name: string): Look {
  return {
    name: cleanName(name) || 'Friend',
    body: 'female',
    skin: 1,
    hair: 'bun',
    hairColor: 0,
    outfit: 5,
    pants: 0,
    accessory: 'glasses',
  }
}

export function newSave(look: Look, now: number): Save {
  return {
    v: 1,
    look,
    coins: START_COINS,
    inv: { 'seed:radish': 6, 'seed:carrot': 2 },
    garden: Array.from({ length: PLOT_W * PLOT_H }, () => ({ s: 0 as const })),
    room: {
      wall: 'cream',
      floor: 'oak',
      items: [
        { k: 'bed', x: 1, y: 3 },
        { k: 'nightstand', x: 3, y: 3 },
        { k: 'photos', x: 4, y: 1 },
      ],
      walls: ['cream'],
      floors: ['oak'],
    },
    stats: { harvested: 0, earned: 0 },
    intro: INTRO.greet,
    slot: -1,
    createdAt: now,
    updatedAt: now,
  }
}

export function toProfile(login: string, save: Save): Profile {
  return {
    login,
    look: save.look,
    slot: save.slot,
    garden: save.garden,
    room: {
      wall: save.room.wall,
      floor: save.room.floor,
      items: save.room.items.filter((i) => i.x >= 0),
    },
  }
}

// --- validation -------------------------------------------------------------------------

type Obj = Record<string, unknown>

function obj(v: unknown, what: string): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new SaveError(`${what} must be an object.`)
  return v as Obj
}

function int(v: unknown, what: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new SaveError(`${what} must be a whole number from ${min} to ${max}.`)
  }
  return v
}

function num(v: unknown, what: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new SaveError(`${what} is out of range.`)
  }
  return v
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], what: string): T {
  if (typeof v !== 'string' || !allowed.includes(v as T))
    throw new SaveError(`${what} is not a valid choice.`)
  return v as T
}

/** Printable characters only, collapsed whitespace, trimmed. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return (
    v
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  )
}

export function cleanName(v: unknown): string {
  return cleanText(v, 20)
}

export function validateLook(v: unknown): Look {
  const o = obj(v, 'look')
  const name = cleanName(o.name)
  if (!name) throw new SaveError('Your character needs a name.')
  return {
    name,
    // Saves from before body types existed read as female.
    body: oneOf(o.body ?? 'female', BODIES, 'body'),
    skin: int(o.skin, 'skin', 0, SKIN_TONES.length - 1),
    hair: oneOf(o.hair, HAIR_STYLES, 'hair'),
    hairColor: int(o.hairColor, 'hairColor', 0, HAIR_COLORS.length - 1),
    outfit: int(o.outfit, 'outfit', 0, OUTFIT_COLORS.length - 1),
    pants: int(o.pants, 'pants', 0, PANTS_COLORS.length - 1),
    accessory: oneOf(o.accessory, ACCESSORIES, 'accessory'),
  }
}

const INV_KEYS = new Set(Object.keys(CROPS).flatMap((c) => [`seed:${c}`, `crop:${c}`]))
const MAX_TIME = 8_640_000_000_000_000 // the largest valid Date

function validateTile(v: unknown, i: number): Tile {
  const o = obj(v, `garden[${i}]`)
  const s = int(o.s, `garden[${i}].s`, 0, 1) as 0 | 1
  const tile: Tile = { s }
  if (o.c !== undefined) {
    if (s !== 1) throw new SaveError(`garden[${i}] has a crop on untilled ground.`)
    tile.c = oneOf(o.c, Object.keys(CROPS), `garden[${i}].c`)
    tile.g = num(o.g ?? 0, `garden[${i}].g`, 0, 1e9)
    tile.t = num(o.t ?? 0, `garden[${i}].t`, 0, MAX_TIME)
  }
  if (o.w !== undefined) tile.w = num(o.w, `garden[${i}].w`, 0, MAX_TIME)
  return tile
}

function validateRoom(v: unknown): Room {
  const o = obj(v, 'room')
  const walls = [
    ...new Set(
      arr(o.walls, 'room.walls', 20).map((w) => oneOf(w, Object.keys(WALLPAPERS), 'wallpaper')),
    ),
  ]
  const floors = [
    ...new Set(arr(o.floors, 'room.floors', 20).map((f) => oneOf(f, Object.keys(FLOORS), 'floor'))),
  ]
  const wall = oneOf(o.wall, walls, 'room.wall (must be owned)')
  const floor = oneOf(o.floor, floors, 'room.floor (must be owned)')
  const items = arr(o.items, 'room.items', MAX_ROOM_ITEMS).map((raw, i): RoomItem => {
    const it = obj(raw, `room.items[${i}]`)
    const k = oneOf(it.k, Object.keys(FURNITURE), `room.items[${i}].k`)
    const def = FURNITURE[k]
    const x = int(it.x, `room.items[${i}].x`, -1, 99)
    const y = int(it.y, `room.items[${i}].y`, -1, 99)
    if (x >= 0) {
      const area = def.wall ? ROOM_WALL : ROOM_FLOOR
      if (x < area.x0 || y < area.y0 || x + def.w - 1 > area.x1 || y + def.h - 1 > area.y1) {
        throw new SaveError(`${def.name} is placed outside the room.`)
      }
    }
    return { k, x, y }
  })
  return { wall, floor, items, walls, floors }
}

function arr(v: unknown, what: string, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max)
    throw new SaveError(`${what} must be a list of at most ${max}.`)
  return v
}

/** A well-formed copy of `v`, or a SaveError. `slot` is kept as given; the server overrides it. */
export function validateSave(v: unknown): Save {
  const o = obj(v, 'save')
  if (o.v !== 1) throw new SaveError('Unknown save version.')
  const invIn = obj(o.inv, 'inv')
  const inv: Record<string, number> = {}
  for (const [k, n] of Object.entries(invIn)) {
    if (!INV_KEYS.has(k)) throw new SaveError(`Unknown inventory item "${k.slice(0, 30)}".`)
    const count = int(n, `inv.${k}`, 0, 99_999)
    if (count > 0) inv[k] = count
  }
  const garden = arr(o.garden, 'garden', PLOT_W * PLOT_H).map(validateTile)
  if (garden.length !== PLOT_W * PLOT_H) throw new SaveError('garden has the wrong size.')
  const stats = obj(o.stats, 'stats')
  const intro =
    o.intro === undefined ? undefined : (int(o.intro, 'intro', 0, INTRO.done - 1) as IntroStep)
  return {
    v: 1,
    look: validateLook(o.look),
    coins: int(o.coins, 'coins', 0, 99_999_999),
    inv,
    garden,
    room: validateRoom(o.room),
    stats: {
      harvested: int(stats.harvested, 'stats.harvested', 0, 1e9),
      earned: int(stats.earned, 'stats.earned', 0, 1e12),
    },
    ...(intro === undefined ? {} : { intro }),
    slot: int(o.slot ?? -1, 'slot', -1, MAX_SLOTS - 1),
    createdAt: num(o.createdAt, 'createdAt', 0, MAX_TIME),
    updatedAt: num(o.updatedAt, 'updatedAt', 0, MAX_TIME),
  }
}

export function isMapId(v: unknown): v is MapId {
  return (
    v === 'grounds' ||
    v === 'hall' ||
    (typeof v === 'string' && /^room:[A-Za-z0-9-]{1,39}$/.test(v))
  )
}

export function validatePresence(v: unknown): PresenceIn {
  const o = obj(v, 'presence')
  if (!isMapId(o.map)) throw new SaveError('presence.map is not a place.')
  return {
    map: o.map,
    x: num(o.x, 'presence.x', -10, 200),
    y: num(o.y, 'presence.y', -10, 200),
    dir: int(o.dir, 'presence.dir', 0, 3) as Dir,
    moving: o.moving === true,
  }
}
