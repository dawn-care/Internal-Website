import {
  CLOSET,
  KEY_HOOK,
  FURNITURE,
  MAX_SLOTS,
  PLOT_MAX,
  ROOM_DOOR_X,
  ROOM_H,
  ROOM_W,
} from '../shared/catalog'
import { EST, EST_H, EST_W, GROUNDS_H, GROUNDS_W, OUTSKIRTS, TREELINE } from '../shared/grounds'
import { seatId, type Dir, type MapId, type Room } from '../shared/schema'
import { TABLES, tableSeat, type Side } from '../shared/tables'

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
  | 'coop'
  | 'gametable'
  | 'stool'
  | 'noticeboard'
  /** Undergrowth you can push through (a gap in the treeline). Looks like a bush. */
  | 'brush'
  | 'sickbed'
  /** Out in the far outskirts, where the land dies off towards the treeline. */
  | 'deadtree'
  | 'stump'
  /** The treeline: the forest's own dark trees and undergrowth, at the edge of the grounds. */
  | 'edgepine'
  | 'edgetree'
  | 'edgebush'
  | 'screen'
  | 'infirmaryDoor'
  /** The locked closet door in every room (STORY.md "Act I"). */
  | 'closet'
  /** The key hook beside it: `n` keys hanging on it (only drawn in your own room). */
  | 'keyhook'

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
  | { kind: 'closet'; x: number; y: number }
  | { kind: 'keyhook'; x: number; y: number }
  | { kind: 'nest'; x: number; y: number }
  | { kind: 'noticeboard'; x: number; y: number }

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
  /**
   * The grounds only: how far out each tile is (0 in the established area, 1 at the treeline),
   * which drains the grass (see FOREST.md "The outskirts").
   */
  wild?: Float32Array
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

/** A place to sit: where you sit (x, y at the feet), and the tile you face to sit there. */
export interface Seat {
  id: string
  x: number
  y: number
  tx: number
  ty: number
  /** Seats on the same bench or row of chairs share a group (a table's stools: the table id). */
  group: string
  /** Which way you face sitting there (a table's stools face the table); else towards you. */
  face?: Dir
}

/**
 * Every seat on a map: two per bench, one per hallway chair, the two stools at each games table,
 * and the armchairs and rocking chairs placed in a room (pass the room's items).
 */
export function seatsOf(m: GameMap, items?: { k: string; x: number; y: number }[]): Seat[] {
  const out: Seat[] = []
  for (const o of m.objects) {
    if (o.k === 'gametable') {
      const id = `table:${o.x},${o.y}`
      for (const side of [0, 1] as Side[])
        out.push({
          id: tableSeat(id, side),
          x: o.x + (side === 0 ? -0.5 : 1.5),
          y: o.y + 0.7,
          tx: o.x + (side === 0 ? -1 : 1),
          ty: o.y,
          group: id,
          face: side === 0 ? 2 : 1,
        })
      continue
    }
    if (o.k !== 'bench' && o.k !== 'chairs') continue
    const n = o.k === 'bench' ? 2 : (o.w ?? 3)
    for (let i = 0; i < n; i++)
      out.push({
        id: seatId(o.k, o.x, o.y, i),
        x: o.x + i + 0.5,
        y: o.y + (o.k === 'bench' ? 0.7 : 0.75),
        tx: o.x + i,
        ty: o.y,
        group: `${o.k}:${o.x},${o.y}`,
      })
  }
  for (const it of items ?? []) {
    if ((it.k !== 'armchair' && it.k !== 'rocker') || it.x < 0) continue
    out.push({
      id: seatId(it.k, it.x, it.y, 0),
      x: it.x + 0.5,
      y: it.y + 0.75,
      tx: it.x,
      ty: it.y,
      group: `${it.k}:${it.x},${it.y}`,
    })
  }
  return out
}

/** Deterministic noise so every player sees the same trees and flowers. */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// --- the grounds ---------------------------------------------------------------------------

/**
 * The community garden: a fenced plot of dirt paths with twelve allotments (3 across, 4 down),
 * each with room for the largest plot size. The gate is two tiles wide, in line with the home's
 * front walk.
 */
const GARDEN_L = { x0: 3, y0: 20, x1: 35, y1: 46, gateX: 23 } as const
/** The pond, east of the garden: its centre and radii (water inside, a sandy shore round it). */
const POND_L = { x: 41.6, y: 32, rx: 4.6, ry: 4.9 } as const
const HOME_DOOR_L = { x: 23, y: 9 } as const
const KITCHEN_DOOR_L = { x: 40, y: 15 } as const
/**
 * The henhouse in the north-west corner: a fenced dirt run (fence on its edge tiles, a gate in the
 * bottom side) with the coop building along the top. The nest boxes are on the coop's front.
 */
const HENHOUSE_L = {
  run: { x0: 3, y0: 4, x1: 11, y1: 11 },
  coop: { x: 4, y: 3, w: 4, h: 4 },
  gateX: 7,
  /** Where the hens wander (inside the run, below the coop). */
  yard: { x0: 4.3, y0: 7.6, x1: 10.7, y1: 10.8 },
} as const

// The same places on the grounds map (the established area sits at EST, see shared/grounds.ts).
const ex = (x: number) => x + EST.x
const ey = (y: number) => y + EST.y
export const GARDEN = {
  x0: ex(GARDEN_L.x0),
  y0: ey(GARDEN_L.y0),
  x1: ex(GARDEN_L.x1),
  y1: ey(GARDEN_L.y1),
  gateX: ex(GARDEN_L.gateX),
} as const
export const POND = { ...POND_L, x: ex(POND_L.x), y: ey(POND_L.y) } as const
export const HOME_DOOR = { x: ex(HOME_DOOR_L.x), y: ey(HOME_DOOR_L.y) } as const
export const KITCHEN_DOOR = { x: ex(KITCHEN_DOOR_L.x), y: ey(KITCHEN_DOOR_L.y) } as const
export const HENHOUSE = {
  run: {
    x0: ex(HENHOUSE_L.run.x0),
    y0: ey(HENHOUSE_L.run.y0),
    x1: ex(HENHOUSE_L.run.x1),
    y1: ey(HENHOUSE_L.run.y1),
  },
  coop: { ...HENHOUSE_L.coop, x: ex(HENHOUSE_L.coop.x), y: ey(HENHOUSE_L.coop.y) },
  gateX: ex(HENHOUSE_L.gateX),
  yard: {
    x0: ex(HENHOUSE_L.yard.x0),
    y0: ey(HENHOUSE_L.yard.y0),
    x1: ex(HENHOUSE_L.yard.x1),
    y1: ey(HENHOUSE_L.yard.y1),
  },
} as const
/** Chef Rosa's spot by the Kitchen's cart, on the grounds map. */
export const ROSA_SPOT = { x: ex(42.5), y: ey(16.9) } as const
/** Where the grounds' front walk meets the home's door, for coming out of the hallway. */
export const FRONT_STEP = { x: ex(23.5), y: ey(10.8) } as const

function plotOriginL(slot: number): { x: number; y: number } {
  const c = slot % 3
  const r = Math.floor(slot / 3)
  return { x: GARDEN_L.x0 + 2 + c * (PLOT_MAX.w + 1), y: GARDEN_L.y0 + 2 + r * (PLOT_MAX.h + 1) }
}

/** Top-left tile of the allotment (and so the plot) for `slot`. */
export function plotOrigin(slot: number): { x: number; y: number } {
  const o = plotOriginL(slot)
  return { x: ex(o.x), y: ey(o.y) }
}

/**
 * The allotment tile at (x, y), if any: its slot and the column and row within it. Whether that's
 * part of the plot depends on the plot's size (see plotSize).
 */
export function allotmentAt(x: number, y: number): { slot: number; dx: number; dy: number } | null {
  for (let s = 0; s < MAX_SLOTS; s++) {
    const o = plotOrigin(s)
    if (x >= o.x && x < o.x + PLOT_MAX.w && y >= o.y && y < o.y + PLOT_MAX.h)
      return { slot: s, dx: x - o.x, dy: y - o.y }
  }
  return null
}

/** The established area, in its own coordinates (placed on the grounds by buildGrounds). */
function buildEstablished(): GameMap {
  const W = EST_W
  const H = EST_H
  const m = blank('grounds', W, H, T.GRASS, true)
  m.spawn = { x: 23.5, y: 11.2, dir: 0 }
  const GARDEN = GARDEN_L
  const POND = POND_L
  const HOME_DOOR = HOME_DOOR_L
  const KITCHEN_DOOR = KITCHEN_DOOR_L
  const HENHOUSE = HENHOUSE_L
  const plotOrigin = plotOriginL

  // Wildflower patches.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (hash(x, y, 7) < 0.06) setGround(m, x, y, T.FLOWERS)

  // Paths.
  rect(m, 2, 17, 45, 18, T.PATH)
  rect(m, 23, 10, 24, 18, T.PATH)
  rect(m, 18, 10, 29, 13, T.STONE)
  rect(m, 40, 16, 40, 18, T.PATH)
  rect(m, GARDEN.gateX, 19, GARDEN.gateX + 1, 19, T.PATH)
  // Down to the pond, along the garden fence.
  rect(m, 36, 19, 36, 26, T.PATH)

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

  // The community garden: fence, dirt paths, and an allotment of grass for each plot.
  rect(m, GARDEN.x0 + 1, GARDEN.y0 + 1, GARDEN.x1 - 1, GARDEN.y1 - 1, T.DIRT)
  for (let s = 0; s < MAX_SLOTS; s++) {
    const o = plotOrigin(s)
    rect(m, o.x, o.y, o.x + PLOT_MAX.w - 1, o.y + PLOT_MAX.h - 1, T.PLOT)
  }
  for (let x: number = GARDEN.x0; x <= GARDEN.x1; x++) {
    for (const y of [GARDEN.y0, GARDEN.y1]) {
      if (y === GARDEN.y0 && (x === GARDEN.gateX || x === GARDEN.gateX + 1)) continue
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
  // The noticeboard by the gate (plot upgrades), with a tub of flowers on the other side.
  m.objects.push({ k: 'noticeboard', x: GARDEN.gateX - 1, y: 19 })
  setSolid(m, GARDEN.gateX - 1, 19)
  m.interacts.push({ kind: 'noticeboard', x: GARDEN.gateX - 1, y: 19 })
  m.objects.push({ k: 'flowerbed', x: GARDEN.gateX + 2, y: 19 })
  setSolid(m, GARDEN.gateX + 2, 19)
  m.labels.push({ x: GARDEN.gateX + 1, y: 18.2, text: 'Community Garden', near: 6 })

  // The pond.
  for (let y = Math.floor(POND.y - POND.ry * 1.3); y <= POND.y + POND.ry * 1.3; y++)
    for (let x = Math.floor(POND.x - POND.rx * 1.3); x <= POND.x + POND.rx * 1.3; x++) {
      const d = ((x + 0.5 - POND.x) / POND.rx) ** 2 + ((y + 0.5 - POND.y) / POND.ry) ** 2
      if (d < 1) {
        setGround(m, x, y, T.WATER)
        setSolid(m, x, y)
      } else if (d < 1.45) setGround(m, x, y, T.SAND)
    }

  // The henhouse: a dirt run with a picket fence, the coop along the top, a gate and a path.
  const run = HENHOUSE.run
  const coop = HENHOUSE.coop
  rect(m, run.x0 + 1, run.y0 + 1, run.x1 - 1, run.y1 - 1, T.DIRT)
  rect(m, HENHOUSE.gateX, run.y1, HENHOUSE.gateX, 16, T.PATH)
  for (let x: number = run.x0; x <= run.x1; x++)
    for (const y of [run.y0, run.y1]) {
      if (y === run.y1 && x === HENHOUSE.gateX) continue
      if (y === run.y0 && x >= coop.x && x < coop.x + coop.w) continue
      m.objects.push({ k: 'fence', x, y })
      setSolid(m, x, y)
    }
  for (let y: number = run.y0 + 1; y < run.y1; y++)
    for (const x of [run.x0, run.x1]) {
      m.objects.push({ k: 'fence', x, y })
      setSolid(m, x, y)
    }
  solidRect(m, coop.x, coop.y, coop.x + coop.w - 1, coop.y + coop.h - 1)
  m.objects.push({ k: 'coop', x: coop.x, y: coop.y, w: coop.w, h: coop.h })
  // The nest boxes: face the front of the coop from inside the run.
  for (let x: number = coop.x; x < coop.x + coop.w; x++)
    m.interacts.push({ kind: 'nest', x, y: coop.y + coop.h - 1 })
  m.labels.push({ x: coop.x + coop.w / 2, y: coop.y - 0.6, text: 'Henhouse', near: 7 })

  // Board-game tables, a stool either side (see shared/tables.ts).
  for (const { x: wx, y: wy } of TABLES) {
    const t = { x: wx - EST.x, y: wy - EST.y }
    m.objects.push({ k: 'gametable', x: t.x, y: t.y })
    m.objects.push({ k: 'stool', x: t.x - 1, y: t.y }, { k: 'stool', x: t.x + 1, y: t.y })
    solidRect(m, t.x - 1, t.y, t.x + 1, t.y)
  }

  // Benches, lamps and the mailbox, laid out round the home's centre line (between x 23 and 24):
  // the plaza, its lawns and the front walk are mirrored left and right, and the other benches come
  // in pairs facing what there is to look at.
  const benches: [number, number][] = [
    // Facing out over the plaza.
    [19, 14],
    [27, 14],
    // On the verge above the garden, either side of its gate (and its noticeboard and flowers).
    [19, 19],
    [27, 19],
    // On the pond's north shore.
    [37, 24],
    [41, 24],
  ]
  for (const [x, y] of benches) {
    m.objects.push({ k: 'bench', x, y, w: 2 })
    setSolid(m, x, y)
    setSolid(m, x + 1, y)
  }
  for (const [x, y] of [
    // The plaza's front corners.
    [17, 13],
    [30, 13],
    // Either side of the front walk where it meets the main path.
    [22, 16],
    [25, 16],
    // Each end of the main path (the Kitchen's lit windows and the tables' lawns keep the rest).
    [6, 16],
    [45, 16],
  ] as const) {
    m.objects.push({ k: 'lamp', x, y })
    setSolid(m, x, y)
  }
  // The mailbox at the roadside, beside the front walk's east lamp.
  m.objects.push({ k: 'mailbox', x: 26, y: 16 })
  setSolid(m, 26, 16)
  m.interacts.push({
    kind: 'sign',
    x: 26,
    y: 16,
    text: 'The mailbox. Nothing today, but the grandkids promised to write!',
  })

  // Trees: a border all round, then planted (not scattered): an orchard of apple trees behind the
  // Kitchen, a little wood below the pond, a pair either side of the henhouse path, and one to
  // shade the pond's games table. Bushes frame the front of the home.
  const tree = (x: number, y: number, k: 'tree' | 'pine' = 'tree') => {
    m.objects.push({ k, x, y })
    setSolid(m, x, y)
  }
  // (The established area used to have a border of trees here; now the outskirts open out round
  // it and the treeline is at the edge of the grounds. A few trees mark its old corners.)
  for (const [x, y] of [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
    [1, 24],
    [W - 2, 30],
  ])
    tree(x, y, hash(x, y) < 0.5 ? 'tree' : 'pine')
  for (const y of [3, 6]) for (const x of [37, 40, 43]) tree(x, y)
  // A little wood in the south-east corner, below the pond.
  for (const [j, y] of [40, 43, 46].entries())
    for (const [i, x] of [38, 41, 44].entries()) tree(x, y, (i + j) % 2 ? 'pine' : 'tree')
  tree(4, 14)
  tree(10, 14)
  tree(44, 21)
  for (const x of [13, 34]) {
    m.objects.push({ k: 'bush', x, y: 9 })
    setSolid(m, x, 9)
  }

  m.labels.push({ x: 24, y: 4.1, text: 'Sunset Acres', near: 12 })
  m.labels.push({ x: 40.5, y: 9.8, text: 'Community Kitchen', near: 8 })
  return m
}

// --- the outskirts and the treeline -----------------------------------------------------------

/** How far out (0–1) the land starts to die off: dead trees, stumps, grey earth. */
export const DEAD_FROM = 0.5

/** Which way out of the grounds a gap in the treeline leads (its outward direction). */
export type Edge = 'n' | 's' | 'w' | 'e'
export interface Gap {
  side: Edge
  /** The gap's first tile along its edge (it's GAP_W tiles wide). */
  at: number
}
const GAP_W = 2
/**
 * The hidden gaps in the treeline (FOREST.md "The treeline"), in grounds coordinates along their
 * edge. Nothing marks them: they're undergrowth you can push through, among bushes you can't.
 */
export const GAPS: readonly Gap[] = [
  { side: 'n', at: ex(6) },
  { side: 'n', at: ex(43) },
  { side: 's', at: ex(1) },
  { side: 's', at: ex(36) },
  { side: 'w', at: ey(33) },
  { side: 'e', at: ey(10) },
]

/** Tiles out from the established area's outline (0 inside it), rounded at the corners. */
export function outDistance(x: number, y: number): number {
  const dx = Math.max(EST.x - x, 0, x - (EST.x + EST_W - 1))
  const dy = Math.max(EST.y - y, 0, y - (EST.y + EST_H - 1))
  return Math.hypot(dx, dy)
}

/** How far out you are: 0 in the established area, 1 at the treeline (FOREST.md). */
export function outskirts(x: number, y: number): number {
  return Math.min(1, outDistance(x, y) / OUTSKIRTS)
}

/** Tiles from (x, y) to the treeline's inner edge (0 or less: in the treeline). */
export function toTreeline(x: number, y: number): number {
  return Math.min(x, y, GROUNDS_W - x, GROUNDS_H - y) - TREELINE
}

/** The gap tiles (x, y) is in, if any. */
export function gapAt(tx: number, ty: number): Gap | null {
  for (const g of GAPS) {
    const along = g.side === 'n' || g.side === 's' ? tx : ty
    const across =
      g.side === 'n'
        ? ty
        : g.side === 's'
          ? GROUNDS_H - 1 - ty
          : g.side === 'w'
            ? tx
            : GROUNDS_W - 1 - tx
    if (along >= g.at && along < g.at + GAP_W && across >= 0 && across < TREELINE) return g
  }
  return null
}

/** How close (x, y) is to the nearest gap, in tiles. */
export function gapDistance(x: number, y: number): number {
  let best = Infinity
  for (const g of GAPS) {
    const c = g.at + GAP_W / 2
    const gx =
      g.side === 'n' || g.side === 's' ? c : g.side === 'w' ? TREELINE : GROUNDS_W - TREELINE
    const gy =
      g.side === 'w' || g.side === 'e' ? c : g.side === 'n' ? TREELINE : GROUNDS_H - TREELINE
    best = Math.min(best, Math.hypot(x - gx, y - gy))
  }
  return best
}

/** Where you come back onto the grounds from a gap: just inside it, facing in. */
export function gapReturn(g: Gap): { x: number; y: number; dir: Dir } {
  const c = g.at + GAP_W / 2
  switch (g.side) {
    case 'n':
      return { x: c, y: TREELINE + 0.9, dir: 0 }
    case 's':
      return { x: c, y: GROUNDS_H - TREELINE - 0.2, dir: 3 }
    case 'w':
      return { x: TREELINE + 0.7, y: c + 0.4, dir: 2 }
    case 'e':
      return { x: GROUNDS_W - TREELINE - 0.7, y: c + 0.4, dir: 1 }
  }
}

/**
 * The whole grounds: the established area in the middle, open outskirts round it (thinning grass,
 * the odd tree and fence post, a path that peters out), and the treeline at the edge.
 */
function buildGrounds(): GameMap {
  const W = GROUNDS_W
  const H = GROUNDS_H
  const est = buildEstablished()
  const m = blank('grounds', W, H, T.GRASS, true)
  m.wild = new Float32Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const w = outskirts(x, y)
      m.wild[y * W + x] = w
      // Wildflowers thin out with the grass.
      if (w > 0 && hash(x, y, 7) < 0.06 * (1 - w) ** 2) setGround(m, x, y, T.FLOWERS)
    }
  // The established area, shifted into place.
  for (let y = 0; y < EST_H; y++)
    for (let x = 0; x < EST_W; x++) {
      const i = (y + EST.y) * W + x + EST.x
      m.ground[i] = est.ground[y * EST_W + x]
      m.solid[i] = est.solid[y * EST_W + x]
    }
  for (const o of est.objects) m.objects.push({ ...o, x: ex(o.x), y: ey(o.y) })
  for (const it of est.interacts) {
    const moved = { ...it, x: ex(it.x), y: ey(it.y) }
    m.interacts.push(moved)
  }
  for (const l of est.labels) m.labels.push({ ...l, x: ex(l.x), y: ey(l.y) })
  for (const n of est.npcs) m.npcs.push({ ...n, x: ex(n.x), y: ey(n.y) })
  m.spawn = { ...est.spawn, x: ex(est.spawn.x), y: ey(est.spawn.y) }

  const put = (k: ObjKind, x: number, y: number, solid = true) => {
    m.objects.push({ k, x, y })
    if (solid) setSolid(m, x, y)
  }
  const free = (x: number, y: number) =>
    groundAt(m, x, y) === T.GRASS || groundAt(m, x, y) === T.FLOWERS

  // The main path runs on past the Kitchen and the henhouse, breaking up, then peters out.
  const pathY = ey(17)
  for (let i = 1; i < 16; i++) {
    for (const [x, dir] of [
      [ex(2) - i, -1],
      [ex(45) + i, 1],
    ] as const) {
      // Fewer and fewer stones, and the path wanders a little.
      if (hash(x, pathY, 611) > 1 - i / 17) continue
      const y = pathY + (hash(Math.floor(i / 4), dir, 612) < 0.5 ? 0 : 1)
      setGround(m, x, y, T.PATH)
      if (i < 6) setGround(m, x, y + (y === pathY ? 1 : -1), T.PATH)
    }
  }

  // Open country: a lone tree here and there, and old fence posts in broken lines.
  for (let y = TREELINE + 2; y < H - TREELINE - 2; y++)
    for (let x = TREELINE + 2; x < W - TREELINE - 2; x++) {
      const d = outDistance(x, y)
      if (d < 3 || !free(x, y) || toTreeline(x, y) < 3) continue
      const r = hash(x, y, 620)
      // The far outskirts die off: dead trees and stumps instead of green ones, a little more of
      // them the closer you get to the treeline.
      const dying = outskirts(x, y) > DEAD_FROM
      if (dying) {
        if (r < 0.007) put('deadtree', x, y)
        else if (r < 0.011) put('stump', x, y)
      } else if (r < 0.006) put(hash(x, y, 621) < 0.5 ? 'tree' : 'pine', x, y)
      else if (r < 0.009) put('bush', x, y)
    }
  // Fence posts: a few short runs of what was once a fence, gaps where posts have gone.
  for (const [x0, y0, dx, dy, n] of [
    [ex(-14), ey(6), 0, 1, 9],
    [ex(EST_W + 10), ey(30), 0, 1, 11],
    [ex(10), ey(-12), 1, 0, 12],
    [ex(26), ey(EST_H + 12), 1, 0, 10],
  ] as const)
    for (let i = 0; i < n; i++) {
      const x = x0 + dx * i * 2
      const y = y0 + dy * i * 2
      if (hash(x, y, 630) < 0.3 || !free(x, y)) continue
      put('fence', x, y)
    }

  // The treeline: three rows of trees all round, staggered, with bushes along its inner edge (so
  // the undergrowth in the gaps looks like more of the same).
  const treeAt = (x: number, y: number) => {
    const r = hash(x, y, 640)
    const k: ObjKind = r < 0.55 ? 'edgepine' : r < 0.85 ? 'edgetree' : 'deadtree'
    m.objects.push({ k, x, y })
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (toTreeline(x + 0.5, y + 0.5) > 0) continue
      const g = gapAt(x, y)
      if (g) {
        // The gap: undergrowth, walkable, and a tree either side of it so it closes over.
        m.objects.push({ k: 'brush', x, y })
        continue
      }
      setSolid(m, x, y)
      if ((x + y * 2) % 3 === 0 || hash(x, y, 641) < 0.12) treeAt(x, y)
    }
  // Bushes along the inner edge (some solid, in the treeline; the gap's are brush).
  for (let i = TREELINE; i < Math.max(W, H) - TREELINE; i++) {
    for (const [x, y] of [
      [i, TREELINE - 1],
      [i, H - TREELINE],
      [TREELINE - 1, i],
      [W - TREELINE, i],
    ]) {
      if (!inBounds(m, x, y) || gapAt(x, y) || hash(x, y, 650) > 0.35) continue
      m.objects.push({ k: 'edgebush', x, y })
    }
  }
  return m
}

// --- the infirmary --------------------------------------------------------------------------

export const INFIRMARY_W = 12
export const INFIRMARY_H = 8
/** Where you wake up: beside the first bed. */
export const INFIRMARY_WAKE = { x: 3.5, y: 5.6, dir: 0 as Dir }

/**
 * The home's infirmary, off the hallway: where you wake up after the forest (FOREST.md "Getting
 * lost for real"). Three beds with screens, a cabinet, and Nurse Ada.
 */
function buildInfirmary(): GameMap {
  const W = INFIRMARY_W
  const H = INFIRMARY_H
  const m = blank('infirmary', W, H, T.HALL_FLOOR, false)
  m.spawn = { ...INFIRMARY_WAKE }
  rect(m, 0, 0, W - 1, 0, T.TRIM)
  rect(m, 0, 1, W - 1, 2, T.HALL_WALL)
  rect(m, 0, 0, 0, H - 1, T.TRIM)
  rect(m, W - 1, 0, W - 1, H - 1, T.TRIM)
  rect(m, 0, H - 1, W - 1, H - 1, T.TRIM)
  solidRect(m, 0, 0, W - 1, 2)
  solidRect(m, 0, 0, 0, H - 1)
  solidRect(m, W - 1, 0, W - 1, H - 1)
  solidRect(m, 0, H - 1, W - 1, H - 1)
  for (const x of [2, 5, 8]) {
    m.objects.push({ k: 'sickbed', x, y: 3 })
    solidRect(m, x, 3, x + 1, 4)
    if (x < 8) {
      m.objects.push({ k: 'screen', x: x + 2, y: 3 })
      setSolid(m, x + 2, 3)
    }
  }
  m.objects.push({ k: 'window', x: 3, y: 1 }, { k: 'window', x: 8, y: 1 })
  m.objects.push({ k: 'plant', x: W - 2, y: 6 })
  setSolid(m, W - 2, 6)
  const door = 6
  m.ground[(H - 1) * W + door] = T.HALL_FLOOR
  m.objects.push({ k: 'exitMat', x: door, y: H - 1, w: 1 })
  m.interacts.push({
    kind: 'door',
    x: door,
    y: H - 1,
    to: 'hall',
    tx: HALL_INFIRMARY_X + 0.5,
    ty: 3.6,
    dir: 0,
  })
  m.npcs.push({
    id: 'nurse-infirmary',
    x: 9.5,
    y: 6.2,
    dir: 1,
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
  setSolid(m, 9, 6)
  for (const [x, y] of [
    [9, 6],
    [9, 5],
    [8, 6],
  ])
    m.interacts.push({
      kind: 'sign',
      x,
      y,
      text: 'Nurse Ada: "Take it slowly, dear. Your room is just down the hall when you feel up to it."',
    })
  return m
}

// --- the hallway ---------------------------------------------------------------------------

export const HALL_W = 28
export const HALL_H = 9
/** The infirmary's door, at the east end of the hallway. */
export const HALL_INFIRMARY_X = 26
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
      tx: FRONT_STEP.x + (x === 13 ? 0 : 1),
      ty: FRONT_STEP.y,
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
  m.objects.push({ k: 'plant', x: 1, y: 3 }, { k: 'plant', x: HALL_W - 2, y: 7 })
  setSolid(m, 1, 3)
  setSolid(m, HALL_W - 2, 7)
  m.objects.push({ k: 'infirmaryDoor', x: HALL_INFIRMARY_X, y: 1 })
  m.labels.push({ x: HALL_INFIRMARY_X + 0.5, y: 0.75, text: 'Infirmary', near: 2 })
  m.interacts.push({
    kind: 'door',
    x: HALL_INFIRMARY_X,
    y: 2,
    to: 'infirmary',
    tx: 6.5,
    ty: INFIRMARY_H - 1.8,
    dir: 3,
  })
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
  // The closet: an ordinary door, always locked. Faced from the floor in front of it.
  m.objects.push({ k: 'closet', x: CLOSET.x, y: CLOSET.y })
  m.interacts.push({ kind: 'closet', x: CLOSET.x, y: CLOSET.y + CLOSET.h - 1 })
  m.objects.push({ k: 'keyhook', x: KEY_HOOK.x, y: KEY_HOOK.y, n: 0 })
  m.interacts.push({ kind: 'keyhook', x: KEY_HOOK.x, y: KEY_HOOK.y })
  for (const it of room.items) {
    const def = FURNITURE[it.k]
    if (!def || it.x < 0 || def.wall || def.flat) continue
    solidRect(m, it.x, it.y, it.x + def.w - 1, it.y + def.h - 1)
  }
  return m
}

let grounds: GameMap | null = null
let hall: GameMap | null = null
let infirmary: GameMap | null = null
export function getInfirmary(): GameMap {
  return (infirmary ??= buildInfirmary())
}
export function getGrounds(): GameMap {
  return (grounds ??= buildGrounds())
}
export function getHall(): GameMap {
  return (hall ??= buildHall())
}

/** The forest has no map of its own (forest/gen.ts makes it as you walk): this stands in for one. */
export function forestStub(): GameMap {
  return blank('forest', 1, 1, T.GRASS, true)
}
