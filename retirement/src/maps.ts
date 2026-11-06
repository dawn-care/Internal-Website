import {
  FURNITURE,
  MAX_SLOTS,
  PLOT_H,
  PLOT_W,
  ROOM_DOOR_X,
  ROOM_H,
  ROOM_W,
} from '../shared/catalog'
import type { Dir, MapId, Room } from '../shared/schema'

/*
 * The three kinds of place: the outdoor grounds (home, kitchen, community garden, pond), the
 * hallway of the home (one door per player), and each player's room. Maps are tile grids of
 * ground types plus solid flags, objects (drawn y-sorted with the characters) and
 * interaction points.
 */

export const T = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  FLOWERS: 3,
  PLOT: 4,
  DIRT: 5,
  HALL_FLOOR: 6,
  HALL_WALL: 7,
  ROOM_FLOOR: 8,
  ROOM_WALL: 9,
  TRIM: 10,
  SAND: 11,
  STONE: 12,
} as const

export type ObjKind =
  | 'tree'
  | 'pine'
  | 'bush'
  | 'fence'
  | 'home'
  | 'kitchen'
  | 'bench'
  | 'lamp'
  | 'flowerbed'
  | 'sign'
  | 'pump'
  | 'mailbox'
  | 'hallDoor'
  | 'exitMat'
  | 'desk'
  | 'plant'
  | 'window'
  | 'chairs'
  | 'cart'
  | 'hallRug'

export interface Obj {
  k: ObjKind
  x: number
  y: number
  w?: number
  h?: number
  /** For hallDoor: the slot. */
  n?: number
}

export type Interact =
  | { kind: 'door'; x: number; y: number; to: MapId; tx: number; ty: number; dir: Dir }
  | { kind: 'roomDoor'; x: number; y: number; slot: number }
  | { kind: 'kitchen'; x: number; y: number }
  | { kind: 'nurse'; x: number; y: number }
  | { kind: 'sign'; x: number; y: number; text: string }

export interface Label {
  x: number
  y: number
  text: string
  /** Only shown when the player is within this many tiles. */
  near?: number
}

export interface Npc {
  id: string
  x: number
  y: number
  dir: Dir
  name: string
  look: import('../shared/schema').Look
}

export interface GameMap {
  id: MapId
  w: number
  h: number
  ground: Uint8Array
  solid: Uint8Array
  objects: Obj[]
  interacts: Interact[]
  labels: Label[]
  npcs: Npc[]
  outdoor: boolean
  spawn: { x: number; y: number; dir: Dir }
}

function blank(id: MapId, w: number, h: number, fill: number, outdoor: boolean): GameMap {
  return {
    id,
    w,
    h,
    ground: new Uint8Array(w * h).fill(fill),
    solid: new Uint8Array(w * h),
    objects: [],
    interacts: [],
    labels: [],
    npcs: [],
    outdoor,
    spawn: { x: w / 2, y: h / 2, dir: 0 },
  }
}

export function inBounds(m: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h
}
export function groundAt(m: GameMap, x: number, y: number): number {
  return inBounds(m, x, y) ? m.ground[y * m.w + x] : -1
}
function setGround(m: GameMap, x: number, y: number, t: number) {
  if (inBounds(m, x, y)) m.ground[y * m.w + x] = t
}
function setSolid(m: GameMap, x: number, y: number, v = 1) {
  if (inBounds(m, x, y)) m.solid[y * m.w + x] = v
}
function rect(m: GameMap, x0: number, y0: number, x1: number, y1: number, t: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setGround(m, x, y, t)
}
function solidRect(m: GameMap, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setSolid(m, x, y)
}

/** Deterministic noise so every player sees the same trees and flowers. */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// --- the grounds ---------------------------------------------------------------------------

export const GARDEN = { x0: 3, y0: 20, x1: 29, y1: 34, gateX: 16 } as const
export const HOME_DOOR = { x: 23, y: 9 } as const
export const KITCHEN_DOOR = { x: 40, y: 15 } as const

/** Top-left tile of the garden plot for `slot`. */
export function plotOrigin(slot: number): { x: number; y: number } {
  const c = slot % 4
  const r = Math.floor(slot / 4)
  return { x: 5 + c * 6, y: 22 + r * 4 }
}

/** The slot and tile index of the plot tile at (x, y), if any. */
export function plotAt(x: number, y: number): { slot: number; i: number } | null {
  for (let s = 0; s < MAX_SLOTS; s++) {
    const o = plotOrigin(s)
    if (x >= o.x && x < o.x + PLOT_W && y >= o.y && y < o.y + PLOT_H) {
      return { slot: s, i: (y - o.y) * PLOT_W + (x - o.x) }
    }
  }
  return null
}

function buildGrounds(): GameMap {
  const W = 48
  const H = 38
  const m = blank('grounds', W, H, T.GRASS, true)
  m.spawn = { x: 23.5, y: 11.2, dir: 0 }

  // Wildflower patches.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (hash(x, y, 7) < 0.06) setGround(m, x, y, T.FLOWERS)

  // Paths.
  rect(m, 2, 17, 45, 18, T.PATH)
  rect(m, 23, 10, 24, 18, T.PATH)
  rect(m, 18, 10, 29, 13, T.STONE)
  rect(m, 40, 16, 40, 18, T.PATH)
  rect(m, GARDEN.gateX, 19, GARDEN.gateX, 19, T.PATH)
  rect(m, 34, 19, 35, 24, T.PATH)

  // The home.
  solidRect(m, 14, 2, 33, 9)
  m.objects.push({ k: 'home', x: 14, y: 2, w: 20, h: 8 })
  m.interacts.push({
    kind: 'door',
    x: HOME_DOOR.x,
    y: HOME_DOOR.y,
    to: 'hall',
    tx: 13.5,
    ty: 6.2,
    dir: 3,
  })
  m.interacts.push({
    kind: 'door',
    x: HOME_DOOR.x + 1,
    y: HOME_DOOR.y,
    to: 'hall',
    tx: 14.5,
    ty: 6.2,
    dir: 3,
  })
  for (const x of [15, 17, 19, 21, 26, 28, 30, 32]) {
    m.objects.push({ k: 'flowerbed', x, y: 10 })
    setSolid(m, x, 10)
  }

  // The community kitchen.
  solidRect(m, 36, 9, 44, 15)
  m.objects.push({ k: 'kitchen', x: 36, y: 9, w: 9, h: 7 })
  m.interacts.push({ kind: 'kitchen', x: KITCHEN_DOOR.x, y: KITCHEN_DOOR.y })
  m.npcs.push({
    id: 'chef',
    x: 42.5,
    y: 16.9,
    dir: 0,
    name: 'Chef Rosa',
    look: {
      name: 'Chef Rosa',
      body: 'female',
      skin: 3,
      hair: 'bun',
      hairColor: 5,
      outfit: 0,
      pants: 0,
      accessory: 'scarf',
    },
  })
  m.interacts.push({ kind: 'kitchen', x: 42, y: 16 })
  setSolid(m, 42, 16)
  m.objects.push({ k: 'cart', x: 37, y: 16 })
  setSolid(m, 37, 16)
  setSolid(m, 38, 16)

  // The community garden: fence, dirt paths, plots.
  rect(m, GARDEN.x0 + 1, GARDEN.y0 + 1, GARDEN.x1 - 1, GARDEN.y1 - 1, T.DIRT)
  for (let s = 0; s < MAX_SLOTS; s++) {
    const o = plotOrigin(s)
    rect(m, o.x, o.y, o.x + PLOT_W - 1, o.y + PLOT_H - 1, T.PLOT)
  }
  for (let x: number = GARDEN.x0; x <= GARDEN.x1; x++) {
    for (const y of [GARDEN.y0, GARDEN.y1]) {
      if (y === GARDEN.y0 && x === GARDEN.gateX) continue
      m.objects.push({ k: 'fence', x, y })
      setSolid(m, x, y)
    }
  }
  for (let y: number = GARDEN.y0 + 1; y < GARDEN.y1; y++) {
    for (const x of [GARDEN.x0, GARDEN.x1]) {
      m.objects.push({ k: 'fence', x, y })
      setSolid(m, x, y)
    }
  }
  m.objects.push({ k: 'pump', x: GARDEN.x1 - 1, y: GARDEN.y0 + 1 })
  setSolid(m, GARDEN.x1 - 1, GARDEN.y0 + 1)
  m.objects.push({ k: 'sign', x: GARDEN.gateX - 2, y: 19 })
  setSolid(m, GARDEN.gateX - 2, 19)
  m.interacts.push({
    kind: 'sign',
    x: GARDEN.gateX - 2,
    y: 19,
    text: 'Community Garden. Till, plant, water, harvest. Sell your produce at the Kitchen!',
  })
  m.labels.push({ x: GARDEN.gateX - 1.5, y: 18.2, text: 'Community Garden', near: 6 })

  // The pond.
  const pc = { x: 40, y: 29 }
  for (let y = 22; y < 37; y++)
    for (let x = 32; x < 47; x++) {
      const d = ((x - pc.x) / 5.6) ** 2 + ((y - pc.y) / 3.8) ** 2
      if (d < 1) {
        setGround(m, x, y, T.WATER)
        setSolid(m, x, y)
      } else if (d < 1.45) setGround(m, x, y, T.SAND)
    }

  // Benches, lamps, mailbox.
  const benches: [number, number][] = [
    [19, 14],
    [27, 14],
    [38, 24],
    [43, 34],
    [7, 15],
  ]
  for (const [x, y] of benches) {
    m.objects.push({ k: 'bench', x, y, w: 2 })
    setSolid(m, x, y)
    setSolid(m, x + 1, y)
  }
  for (const [x, y] of [
    [17, 13],
    [30, 13],
    [10, 16],
    [33, 16],
    [45, 16],
    [22, 19],
    [26, 19],
  ] as const) {
    m.objects.push({ k: 'lamp', x, y })
    setSolid(m, x, y)
  }
  m.objects.push({ k: 'mailbox', x: 26, y: 15 })
  setSolid(m, 26, 15)
  m.interacts.push({
    kind: 'sign',
    x: 26,
    y: 15,
    text: 'The mailbox. Nothing today, but the grandkids promised to write!',
  })

  // Trees: a border, then scattered where there's open grass.
  const tree = (x: number, y: number, k: 'tree' | 'pine' = 'tree') => {
    m.objects.push({ k, x, y })
    setSolid(m, x, y)
  }
  for (let x = 0; x < W; x += 2) {
    tree(x, 0, hash(x, 0) < 0.5 ? 'tree' : 'pine')
    tree(x + (x % 4 === 0 ? 1 : 0), H - 1, hash(x, 1) < 0.5 ? 'tree' : 'pine')
  }
  for (let y = 2; y < H - 1; y += 2) {
    tree(0, y, hash(0, y) < 0.5 ? 'tree' : 'pine')
    tree(W - 1, y, hash(1, y) < 0.5 ? 'tree' : 'pine')
  }
  const open = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const g = groundAt(m, x + dx, y + dy)
        if (g !== T.GRASS && g !== T.FLOWERS) return false
        if (m.solid[(y + dy) * W + x + dx]) return false
      }
    return true
  }
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      const r = hash(x, y, 3)
      if (r < 0.07 && open(x, y) && !(y > 9 && y < 21 && x > 12 && x < 36)) {
        tree(x, y, hash(x, y, 5) < 0.4 ? 'pine' : 'tree')
      } else if (r > 0.975 && open(x, y)) {
        m.objects.push({ k: 'bush', x, y })
        setSolid(m, x, y)
      }
    }

  m.labels.push({ x: 24, y: 4.1, text: 'Sunset Acres', near: 12 })
  m.labels.push({ x: 40.5, y: 9.8, text: 'Community Kitchen', near: 8 })
  return m
}

// --- the hallway ---------------------------------------------------------------------------

export const HALL_W = 28
export const HALL_H = 9
export function hallDoorX(slot: number): number {
  return 2 + slot * 2
}

function buildHall(): GameMap {
  const m = blank('hall', HALL_W, HALL_H, T.HALL_FLOOR, false)
  m.spawn = { x: 14, y: 7.2, dir: 3 }
  rect(m, 0, 0, HALL_W - 1, 0, T.TRIM)
  rect(m, 0, 1, HALL_W - 1, 2, T.HALL_WALL)
  rect(m, 0, HALL_H - 1, HALL_W - 1, HALL_H - 1, T.TRIM)
  rect(m, 0, 0, 0, HALL_H - 1, T.TRIM)
  rect(m, HALL_W - 1, 0, HALL_W - 1, HALL_H - 1, T.TRIM)
  solidRect(m, 0, 0, HALL_W - 1, 2)
  solidRect(m, 0, HALL_H - 1, HALL_W - 1, HALL_H - 1)
  solidRect(m, 0, 0, 0, HALL_H - 1)
  solidRect(m, HALL_W - 1, 0, HALL_W - 1, HALL_H - 1)
  for (let s = 0; s < MAX_SLOTS; s++) {
    const x = hallDoorX(s)
    m.objects.push({ k: 'hallDoor', x, y: 1, n: s })
    m.interacts.push({ kind: 'roomDoor', x, y: 2, slot: s })
  }
  for (const x of [3, 7, 11, 15, 19, 23]) m.objects.push({ k: 'window', x, y: 1 })
  for (const x of [13, 14]) {
    m.ground[(HALL_H - 1) * HALL_W + x] = T.HALL_FLOOR
    m.interacts.push({
      kind: 'door',
      x,
      y: HALL_H - 1,
      to: 'grounds',
      tx: x === 13 ? 23.5 : 24.5,
      ty: 10.8,
      dir: 0,
    })
  }
  m.objects.push({ k: 'exitMat', x: 13, y: HALL_H - 1, w: 2 })
  m.objects.push({ k: 'desk', x: 2, y: 5, w: 3 })
  solidRect(m, 2, 5, 4, 5)
  m.npcs.push({
    id: 'nurse',
    x: 3.5,
    y: 4.6,
    dir: 0,
    name: 'Nurse Ada',
    look: {
      name: 'Nurse Ada',
      body: 'female',
      skin: 4,
      hair: 'short',
      hairColor: 5,
      outfit: 4,
      pants: 2,
      accessory: 'none',
    },
  })
  setSolid(m, 3, 4)
  m.interacts.push({ kind: 'nurse', x: 3, y: 5 }, { kind: 'nurse', x: 3, y: 4 })
  m.objects.push(
    { k: 'plant', x: 1, y: 3 },
    { k: 'plant', x: HALL_W - 2, y: 3 },
    { k: 'plant', x: HALL_W - 2, y: 7 },
  )
  setSolid(m, 1, 3)
  setSolid(m, HALL_W - 2, 3)
  setSolid(m, HALL_W - 2, 7)
  m.objects.push({ k: 'chairs', x: 20, y: 7, w: 3 })
  solidRect(m, 20, 7, 22, 7)
  m.objects.push({ k: 'hallRug', x: 9, y: 6, w: 4 })
  return m
}

// --- a room ---------------------------------------------------------------------------------

export function roomId(login: string): MapId {
  return `room:${login}`
}

export function buildRoom(login: string, room: Pick<Room, 'items'>): GameMap {
  const m = blank(roomId(login), ROOM_W, ROOM_H, T.ROOM_FLOOR, false)
  m.spawn = { x: ROOM_DOOR_X + 0.5, y: ROOM_H - 1.8, dir: 3 }
  rect(m, 0, 0, ROOM_W - 1, 0, T.TRIM)
  rect(m, 0, 1, ROOM_W - 1, 2, T.ROOM_WALL)
  rect(m, 0, 0, 0, ROOM_H - 1, T.TRIM)
  rect(m, ROOM_W - 1, 0, ROOM_W - 1, ROOM_H - 1, T.TRIM)
  rect(m, 0, ROOM_H - 1, ROOM_W - 1, ROOM_H - 1, T.TRIM)
  solidRect(m, 0, 0, ROOM_W - 1, 2)
  solidRect(m, 0, 0, 0, ROOM_H - 1)
  solidRect(m, ROOM_W - 1, 0, ROOM_W - 1, ROOM_H - 1)
  solidRect(m, 0, ROOM_H - 1, ROOM_W - 1, ROOM_H - 1)
  m.ground[(ROOM_H - 1) * ROOM_W + ROOM_DOOR_X] = T.ROOM_FLOOR
  m.interacts.push({
    kind: 'door',
    x: ROOM_DOOR_X,
    y: ROOM_H - 1,
    to: 'hall',
    tx: 0,
    ty: 3.6,
    dir: 0,
  })
  m.objects.push({ k: 'exitMat', x: ROOM_DOOR_X, y: ROOM_H - 1, w: 1 })
  for (const it of room.items) {
    const def = FURNITURE[it.k]
    if (!def || it.x < 0 || def.wall || def.flat) continue
    solidRect(m, it.x, it.y, it.x + def.w - 1, it.y + def.h - 1)
  }
  return m
}

let grounds: GameMap | null = null
let hall: GameMap | null = null
export function getGrounds(): GameMap {
  return (grounds ??= buildGrounds())
}
export function getHall(): GameMap {
  return (hall ??= buildHall())
}
