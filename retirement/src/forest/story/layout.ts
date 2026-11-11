import {
  BOUNDS,
  LANDMARKS,
  LINES,
  ROAD_POLES,
  type Landmark,
  type MapGround,
  type Prop,
  type Spot,
} from './map'

/*
 * The map (story/map.ts) worked out tile by tile, once: what ground each tile has, which tiles
 * are solid or kept clear of trees, where props stand, what can be examined where, and how far
 * each tile is from the paths (which decides when you're lost).
 */

/** How each prop sits: its width in tiles, how many rows at its base are solid, and which columns
 * (default all). Flat props are drawn under people. */
export const PROP_SIZE: Record<
  string,
  {
    w: number
    rows: number
    cols?: number[]
    flat?: true
    tall: number
    /** Keep only its own tiles and the one below clear of trees (a long fence isn't a clearing). */
    tight?: true
    /** A barrier: how far you are from the paths is measured round it, never through it. */
    fence?: true
  }
> = {
  busstop: { w: 3, rows: 1, tall: 3 },
  bussign: { w: 1, rows: 1, tall: 3 },
  bin: { w: 1, rows: 1, tall: 1 },
  pole: { w: 1, rows: 1, tall: 5 },
  forksign: { w: 1, rows: 1, tall: 3 },
  closedsign: { w: 1, rows: 1, tall: 2 },
  waymark: { w: 1, rows: 1, tall: 2 },
  cabin: { w: 4, rows: 2, tall: 4 },
  bedroll: { w: 2, rows: 0, flat: true, tall: 1 },
  firepit: { w: 1, rows: 1, flat: true, tall: 1 },
  kettle: { w: 1, rows: 1, tall: 1 },
  campsign: { w: 6, rows: 1, cols: [0, 5], tall: 3, fence: true },
  // Insides.
  desk: { w: 2, rows: 1, tall: 2 },
  chair: { w: 1, rows: 0, flat: true, tall: 1 },
  stove: { w: 1, rows: 1, tall: 2 },
  papers: { w: 1, rows: 0, flat: true, tall: 1 },
  cabinet: { w: 1, rows: 1, tall: 2 },
  // (On a back wall: the wall itself is solid.)
  window: { w: 1, rows: 0, tall: 1 },
  noticeboard: { w: 2, rows: 0, tall: 1 },
  frame: { w: 1, rows: 0, tall: 1 },
  diagram: { w: 1, rows: 1, tall: 2 },
  bunkbed: { w: 2, rows: 1, tall: 3 },
  locker: { w: 1, rows: 1, tall: 2 },
  belllocker: { w: 1, rows: 1, tall: 2 },
  bench: { w: 2, rows: 1, tall: 2 },
  burnt: { w: 2, rows: 1, tall: 1 },
  bay: { w: 3, rows: 1, tall: 2 },
  winch: { w: 1, rows: 1, tall: 2 },
  casebox: { w: 1, rows: 1, tall: 1 },
  suitcase: { w: 2, rows: 1, tall: 1 },
  // The way out: a door in the front wall, and the mat in front of it.
  exitdoor: { w: 1, rows: 0, tall: 2 },
  doormat: { w: 1, rows: 0, flat: true, tall: 1 },
  wire: { w: 1, rows: 1, tall: 2, tight: true, fence: true },
  servicegate: { w: 4, rows: 1, tall: 2, fence: true },
  truck: { w: 3, rows: 1, tall: 2 },
  table: { w: 2, rows: 1, tall: 2 },
  flagpole: { w: 1, rows: 1, tall: 5 },
  bunk: { w: 5, rows: 2, tall: 4 },
  shed: { w: 4, rows: 2, tall: 4 },
  office: { w: 4, rows: 2, tall: 4 },
  rail: { w: 1, rows: 0, flat: true, tall: 1 },
  leanto: { w: 2, rows: 1, tall: 2 },
}

export interface PlacedProp extends Prop {
  /** Every tile it makes solid. */
  solid: [number, number][]
}

const W = BOUNDS.x1 - BOUNDS.x0 + 1
const H = BOUNDS.y1 - BOUNDS.y0 + 1
const GROUND_CODE: Record<MapGround, number> = {
  road: 1,
  path: 2,
  water: 3,
  plank: 4,
  stone: 5,
  wild: 6,
  yard: 7,
  wall: 8,
  void: 9,
}
export const GROUND_NAMES = Object.keys(GROUND_CODE) as MapGround[]

export interface Layout {
  /** The map's ground at a tile (null: just forest floor). */
  ground(x: number, y: number): MapGround | null
  /** No trees here (paths, clearings, round props). */
  clear(x: number, y: number): boolean
  solid(x: number, y: number): boolean
  /** Tiles from the nearest path, road or clearing (0 on one; large off the map). */
  off(x: number, y: number): number
  /** Props whose anchor tile is in the rectangle (inclusive). */
  propsIn(x0: number, y0: number, x1: number, y1: number): PlacedProp[]
  spotAt(x: number, y: number): Spot | undefined
  /** The prop standing on a tile (its base), or whose picture covers it (`picture`: for clicks). */
  propAt(x: number, y: number, picture?: boolean): PlacedProp | undefined
  /** The spot on a prop nearest a tile of it, if the prop has any. */
  spotOn(p: PlacedProp, x: number, y: number): Spot | undefined
  /** Every spot holding a clue, with where it is. */
  clueSpots: Spot[]
  landmarks: Landmark[]
  /** Open forest-floor tiles a step or two off a path (where small finds can lie). */
  findSpots: [number, number][]
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

let built: Layout | null = null

export function layout(): Layout {
  return (built ??= build())
}

function build(): Layout {
  const ground = new Uint8Array(W * H)
  const clear = new Uint8Array(W * H)
  const solid = new Uint8Array(W * H)
  const off = new Float32Array(W * H).fill(999)
  const idx = (x: number, y: number) => (y - BOUNDS.y0) * W + (x - BOUNDS.x0)
  const inside = (x: number, y: number) =>
    x >= BOUNDS.x0 && x <= BOUNDS.x1 && y >= BOUNDS.y0 && y <= BOUNDS.y1

  // Water first, so a road over it becomes a bridge.
  const lines = [...LINES].sort((a, b) => Number(a.walk) - Number(b.walk))
  for (let y = BOUNDS.y0; y <= BOUNDS.y1; y++)
    for (let x = BOUNDS.x0; x <= BOUNDS.x1; x++) {
      const i = idx(x, y)
      const cx = x + 0.5
      const cy = y + 0.5
      for (const line of lines) {
        let d = Infinity
        for (let k = 1; k < line.pts.length; k++) {
          const [ax, ay] = line.pts[k - 1]
          const [bx, by] = line.pts[k]
          d = Math.min(d, segDist(cx, cy, ax, ay, bx, by))
        }
        const edge = d - line.width / 2
        if (line.walk) off[i] = Math.min(off[i], Math.max(0, edge))
        if (edge <= 0) {
          const was = ground[i]
          ground[i] =
            line.walk && was === GROUND_CODE.water ? GROUND_CODE.plank : GROUND_CODE[line.ground]
          clear[i] = 1
          solid[i] = ground[i] === GROUND_CODE.water ? 1 : 0
        } else if (edge < 1.2) clear[i] = 1
      }
    }

  for (const lm of LANDMARKS)
    for (const a of lm.areas)
      for (let y = a.y0 - 1; y <= a.y1 + 1; y++)
        for (let x = a.x0 - 1; x <= a.x1 + 1; x++) {
          if (!inside(x, y)) continue
          const i = idx(x, y)
          const within = x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1
          clear[i] = 1
          if (!within) continue
          if (a.ground && ground[i] !== GROUND_CODE.water) ground[i] = GROUND_CODE[a.ground]
          if (a.walk) off[i] = 0
        }

  // Insides (map.ts INTERIORS): walls round the floor (two tiles of back wall, one at the sides and
  // front), solid, and a barrier, so the distance from the paths never leaks in or out; round them,
  // a margin of nothing. (A wall shared with a neighbouring room's margin stays a wall.)
  const barrier = new Set<number>()
  const rooms = LANDMARKS.flatMap((lm) => lm.areas.filter((a) => a.room))
  const onFloor = (x: number, y: number) =>
    rooms.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
  // The margin of nothing first (reaching past the edge of the screen, so nothing outside ever
  // shows), never over any room's floor...
  for (const r of rooms)
    for (let y = r.y0 - 14; y <= r.y1 + 12; y++)
      for (let x = r.x0 - 18; x <= r.x1 + 18; x++) {
        if (!inside(x, y) || onFloor(x, y)) continue
        const i = idx(x, y)
        ground[i] = GROUND_CODE.void
        solid[i] = 1
        clear[i] = 1
        off[i] = 999
      }
  // ...then every room's walls.
  for (const r of rooms)
    for (let y = r.y0 - 2; y <= r.y1 + 1; y++)
      for (let x = r.x0 - 1; x <= r.x1 + 1; x++) {
        if (!inside(x, y) || onFloor(x, y)) continue
        const i = idx(x, y)
        ground[i] = GROUND_CODE.wall
        barrier.add(i)
      }

  // Props: the landmarks', the road's poles, and rails along the bridge.
  const props: PlacedProp[] = []
  const place = (p: Prop) => {
    const size = PROP_SIZE[p.id]
    const tiles: [number, number][] = []
    if (size)
      for (let r = 0; r < size.rows; r++)
        for (let c = 0; c < size.w; c++)
          if (!size.cols || size.cols.includes(c)) tiles.push([p.x + c, p.y - r])
    for (const [tx, ty] of tiles)
      if (inside(tx, ty)) {
        solid[idx(tx, ty)] = 1
        if (size?.fence) barrier.add(idx(tx, ty))
      }
    // Keep trees off it and the ground round it (a fence, just off itself and in front of it).
    const w = size?.w ?? 1
    const pad = size?.tight ? 0 : 1
    for (let y = p.y - (size?.rows ?? 1) - 2 * pad; y <= p.y + 1; y++)
      for (let x = p.x - pad; x <= p.x + w - 1 + pad; x++) if (inside(x, y)) clear[idx(x, y)] = 1
    props.push({ ...p, solid: tiles })
  }
  for (const lm of LANDMARKS) for (const p of lm.props) place(p)
  for (const [x, y] of ROAD_POLES) place({ id: 'pole', x, y })
  for (let y = BOUNDS.y0; y <= BOUNDS.y1; y++)
    for (let x = BOUNDS.x0; x <= BOUNDS.x1; x++)
      if (ground[idx(x, y)] === GROUND_CODE.plank)
        for (const dx of [-1, 1])
          if (inside(x + dx, y) && ground[idx(x + dx, y)] === GROUND_CODE.water)
            props.push({ id: 'rail', x: x + dx, y, v: dx < 0 ? 0 : 1, solid: [] })

  // Fences (the camp's perimeter, its gates) are barriers: nothing is measured through them.
  for (const i of barrier) off[i] = 999

  // How far from the paths, out across the open forest: a two-pass distance sweep (top-left to
  // bottom-right, then back), so it grows evenly away from every path and clearing in every
  // direction. (A one-way sweep only reached a couple of tiles upwards: behind the camp you were
  // measured from the road, and got lost exploring it.) It goes round fences, never through them,
  // and never slips diagonally between two fence tiles, so walking along the outside of the camp's
  // fence you're as far from the paths as the long way round says: you can't skirt a gate.
  const D = Math.SQRT2
  const fenced = (x: number, y: number) => inside(x, y) && barrier.has(idx(x, y))
  const relax = (x: number, y: number, dirs: readonly (readonly [number, number, number])[]) => {
    const i = idx(x, y)
    if (barrier.has(i)) return
    for (const [dx, dy, c] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (!inside(nx, ny) || fenced(nx, ny)) continue
      if (dx && dy && (fenced(x + dx, y) || fenced(x, y + dy))) continue
      off[i] = Math.min(off[i], off[idx(nx, ny)] + c)
    }
  }
  const FWD = [
    [-1, 0, 1],
    [0, -1, 1],
    [-1, -1, D],
    [1, -1, D],
  ] as const
  const BACK = [
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, D],
    [-1, 1, D],
  ] as const
  // (Round fences a distance can need to turn back on itself, so sweep until nothing changes.)
  for (let pass = 0; pass < 8; pass++) {
    const before = off.slice()
    for (let y = BOUNDS.y0; y <= BOUNDS.y1; y++)
      for (let x = BOUNDS.x0; x <= BOUNDS.x1; x++) relax(x, y, FWD)
    for (let y = BOUNDS.y1; y >= BOUNDS.y0; y--)
      for (let x = BOUNDS.x1; x >= BOUNDS.x0; x--) relax(x, y, BACK)
    if (off.every((v, i) => v === before[i])) break
  }
  // A fence tile itself counts as its nearest side (play-testing: running up against the fence,
  // your position can just reach into the fence's row, which counted as "infinitely far" from the
  // paths, and you were lost on the spot). Done after the sweep, so it never carries a distance
  // through the fence.
  const sides: number[] = []
  for (const i of barrier) {
    const x = (i % W) + BOUNDS.x0
    const y = Math.floor(i / W) + BOUNDS.y0
    let best = Infinity
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (inside(x + dx, y + dy) && !barrier.has(idx(x + dx, y + dy)))
        best = Math.min(best, off[idx(x + dx, y + dy)] + 1)
    sides.push(i, best)
  }
  for (let k = 0; k < sides.length; k += 2)
    off[sides[k]] = sides[k + 1] === Infinity ? 999 : sides[k + 1]

  const spots = new Map<string, Spot>()
  for (const lm of LANDMARKS) for (const s of lm.spots) spots.set(`${s.x},${s.y}`, s)

  // Small finds lie on the forest floor a step or two off a path, never on one or in a clearing.
  const findSpots: [number, number][] = []
  for (let y = BOUNDS.y0 + 2; y <= -4; y++)
    for (let x = BOUNDS.x0 + 2; x <= BOUNDS.x1 - 2; x++) {
      const i = idx(x, y)
      if (!ground[i] && !solid[i] && off[i] >= 1 && off[i] <= 2.2 && (x + y * 3) % 5 === 0)
        findSpots.push([x, y])
    }

  return {
    ground: (x, y) => {
      if (!inside(x, y)) return null
      const g = ground[idx(x, y)]
      return g ? GROUND_NAMES[g - 1] : null
    },
    clear: (x, y) => inside(x, y) && clear[idx(x, y)] === 1,
    solid: (x, y) => inside(x, y) && solid[idx(x, y)] === 1,
    // Past the map's edge, the real distance: to the nearest edge tile, plus that tile's own.
    // (It used to be 999, so stepping past the edge, behind the camp say, lost you at once.)
    off: (x, y) => {
      if (inside(x, y)) return off[idx(x, y)]
      const cx = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x))
      const cy = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, y))
      return off[idx(cx, cy)] + Math.hypot(x - cx, y - cy)
    },
    propsIn: (x0, y0, x1, y1) =>
      props.filter((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1),
    spotAt: (x, y) => spots.get(`${x},${y}`),
    propAt: (x, y, picture) =>
      props.find((p) => {
        const size = PROP_SIZE[p.id]
        const w = size?.w ?? 1
        const top = p.y - (picture ? (size?.tall ?? 1) : Math.max(1, size?.rows ?? 1)) + 1
        return x >= p.x && x < p.x + w && y >= top && y <= p.y
      }),
    spotOn: (p, x, y) => {
      const size = PROP_SIZE[p.id]
      let best: Spot | undefined
      let bd = Infinity
      for (let r = 0; r < Math.max(1, size?.rows ?? 1); r++)
        for (let c = 0; c < (size?.w ?? 1); c++) {
          const s = spots.get(`${p.x + c},${p.y - r}`)
          const d = Math.hypot(p.x + c - x, p.y - r - y)
          if (s && d < bd) {
            best = s
            bd = d
          }
        }
      return best
    },
    clueSpots: [...spots.values()].filter((s) => s.clue),
    landmarks: LANDMARKS,
    findSpots,
  }
}
