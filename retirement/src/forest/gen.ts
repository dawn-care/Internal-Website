import type { Dir } from '../../shared/schema'
import { hash, type Edge } from '../maps'
import { layout } from './story/layout'
import { HOLLOW_SEED, type MapGround } from './story/map'
import {
  BACK_STRIP,
  CHUNK,
  CLEARING_ABOVE,
  ENTRY_CLEARING,
  ENTRY_IN,
  MAX_CHUNKS,
  PATH_WIDTH,
  TREE_DENSITY,
  TREE_DENSITY_MAX,
  TREE_DENSITY_PER_TILE,
  MAP_TREES_NEAR,
  MAP_TREES_PER_TILE,
} from './tuning'

/*
 * The forest: generated in your own browser, fresh for every visit (FOREST.md). It's built in
 * chunks around you as you walk, from the visit's seed, so it's effectively endless and nothing
 * about it is stored anywhere.
 *
 * Coordinates are tiles, like every other map, with the place you came in at (0, 0). `into` is
 * the way you were walking when you came in; behind you (until you're lost) is the treeline you
 * pushed through, with the strip of undergrowth that leads back home.
 */

export type ForestKind =
  | 'fpine'
  | 'ftree'
  | 'dead'
  | 'stump'
  | 'log'
  | 'rock'
  | 'fern'
  | 'shroom'
  | 'brush'
  // The story's things: a small find, footprints (story/plan.ts puts them in).
  | 'find'
  | 'prints'
  /** One of the map's props (story/art.ts, by `id`). */
  | 'prop'

export interface ForestObj {
  k: ForestKind
  x: number
  y: number
  /** Which variant of the sprite (0–3). */
  v: number
  /** The story's things: which find it is (story/finds.ts), or which way prints point (0–3). */
  id?: string
}

/**
 * Something the story puts into the forest (story/plan.ts): a clearing made round it, maybe a
 * stretch of old road, and its objects. Kept by the forest and applied to every chunk it touches,
 * whenever that chunk is made (again), so it's still there after chunks are forgotten and remade.
 */
export interface Stamp {
  clear: { x0: number; y0: number; x1: number; y1: number }
  road?: { x0: number; y0: number; x1: number; y1: number }
  objects: { o: ForestObj; solid: boolean }[]
  /** More solid tiles (a building wider than its one object). */
  solid?: { x: number; y: number }[]
}

/** Kinds that belong to the story (not the forest itself). */
export const STORY_KINDS = new Set<ForestKind>(['find', 'prints'])

/** Ground types in the forest (drawn in forest/art.ts). */
export const FG = {
  LITTER: 0,
  MOSS: 1,
  PATH: 2,
  EDGE: 3,
  ROAD: 4,
  // The map's own ground (story/map.ts).
  DIRT: 5,
  WATER: 6,
  PLANK: 7,
  STONE: 8,
  WILD: 9,
  YARD: 10,
} as const

/** The map's grounds as the forest's ground codes. */
const MAP_GROUND: Record<MapGround, number> = {
  road: FG.ROAD,
  path: FG.DIRT,
  water: FG.WATER,
  plank: FG.PLANK,
  stone: FG.STONE,
  wild: FG.WILD,
  yard: FG.YARD,
}

export interface Chunk {
  cx: number
  cy: number
  solid: Uint8Array
  ground: Uint8Array
  objects: ForestObj[]
  /** The drawn ground, made when first needed (forest/art.ts). */
  canvas?: HTMLCanvasElement
  /** Where you can walk (road, paths), small, for showing them through the dark (null: none). */
  mask?: HTMLCanvasElement | null
  /** Holds part of the treeline and the way home (made before you were lost). */
  home?: boolean
  /** Made after you were lost: the random forest, not the map. */
  wild?: boolean
}

const INTO: Record<Edge, { x: number; y: number }> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
}
const FACING: Record<Edge, Dir> = { n: 3, s: 0, w: 1, e: 2 }

/** Smooth value noise over tiles (0–1). */
function noise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale
  const fy = y / scale
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const sx = fx - x0
  const sy = fy - y0
  const u = sx * sx * (3 - 2 * sx)
  const v = sy * sy * (3 - 2 * sy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export class Forest {
  /** Past the point of no return: the way home no longer exists. */
  lost = false
  private chunks = new Map<string, Chunk>()
  private stamps: Stamp[] = []
  readonly into: { x: number; y: number }
  readonly facing: Dir

  constructor(
    readonly seed: number,
    /** Which edge of the grounds you came through (the way you were walking). */
    readonly edge: Edge,
  ) {
    this.into = INTO[edge]
    this.facing = FACING[edge]
  }

  /** Where you appear: a couple of tiles in from the edge, facing on in. */
  start(): { x: number; y: number; dir: Dir } {
    return {
      x: 0.5 + this.into.x * ENTRY_IN,
      y: 0.5 + this.into.y * ENTRY_IN + 0.3,
      dir: this.facing,
    }
  }

  /** How far behind the line you came in by (x, y) is (negative: in front of it, in the forest). */
  back(x: number, y: number): number {
    return -((x - 0.5) * this.into.x + (y - 0.5) * this.into.y)
  }

  /** How far to the side of where you came in. */
  lateral(x: number, y: number): number {
    return (x - 0.5) * -this.into.y + (y - 0.5) * this.into.x
  }

  /** Straight-line distance from where you came in. */
  depth(x: number, y: number): number {
    return Math.hypot(x - 0.5, y - 0.5)
  }

  /** On the strip of undergrowth that leads home (only until you're lost). */
  onWayHome(x: number, y: number): boolean {
    return !this.lost && this.back(x, y) > 0 && Math.abs(this.lateral(x, y)) < 1.2
  }

  chunk(cx: number, cy: number): Chunk {
    const key = `${cx},${cy}`
    let ch = this.chunks.get(key)
    if (!ch) {
      ch = this.generate(cx, cy)
      this.chunks.set(key, ch)
    }
    return ch
  }

  /** Chunks touching a tile rectangle (inclusive), generating any that are new. */
  chunksIn(x0: number, y0: number, x1: number, y1: number): Chunk[] {
    const out: Chunk[] = []
    for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor(y1 / CHUNK); cy++)
      for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++)
        out.push(this.chunk(cx, cy))
    return out
  }

  solid(tx: number, ty: number): boolean {
    const cx = Math.floor(tx / CHUNK)
    const cy = Math.floor(ty / CHUNK)
    const ch = this.chunk(cx, cy)
    return ch.solid[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)] === 1
  }

  /** Puts a stamp into the forest: into the chunks already made, and every one made later. */
  addStamp(st: Stamp) {
    this.stamps.push(st)
    for (const ch of this.chunks.values()) this.applyStamp(ch, st)
  }

  /** Takes a stamp out again (a site moved somewhere you'll find it): its chunks are remade. */
  removeStamp(st: Stamp) {
    this.stamps = this.stamps.filter((s) => s !== st)
    for (const ch of [...this.chunks.values()])
      if (this.touches(ch, st)) this.chunks.delete(`${ch.cx},${ch.cy}`)
  }

  private touches(ch: Chunk, st: Stamp): boolean {
    // Everything the stamp changes: its clearing and road (when not empty) and its objects.
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    const add = (ax: number, ay: number, bx: number, by: number) => {
      if (ax > bx || ay > by) return
      x0 = Math.min(x0, ax)
      y0 = Math.min(y0, ay)
      x1 = Math.max(x1, bx)
      y1 = Math.max(y1, by)
    }
    for (const r of [st.clear, st.road]) if (r) add(r.x0, r.y0, r.x1, r.y1)
    for (const { o } of st.objects) add(o.x, o.y, o.x, o.y)
    for (const t of st.solid ?? []) add(t.x, t.y, t.x, t.y)
    const cx0 = ch.cx * CHUNK
    const cy0 = ch.cy * CHUNK
    return x1 >= cx0 && x0 < cx0 + CHUNK && y1 >= cy0 && y0 < cy0 + CHUNK
  }

  private applyStamp(ch: Chunk, st: Stamp) {
    if (!this.touches(ch, st)) return
    const cx0 = ch.cx * CHUNK
    const cy0 = ch.cy * CHUNK
    const inChunk = (x: number, y: number) =>
      x >= cx0 && x < cx0 + CHUNK && y >= cy0 && y < cy0 + CHUNK
    const within = (r: Stamp['clear'], x: number, y: number) =>
      x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1
    // The clearing (and the road): nothing growing there, nothing solid.
    ch.objects = ch.objects.filter(
      (o) =>
        !within(st.clear, o.x, o.y) && !(st.road && within(st.road, o.x, o.y) && o.k !== 'shroom'),
    )
    for (const r of st.road ? [st.clear, st.road] : [st.clear])
      for (let y = Math.max(r.y0, cy0); y <= Math.min(r.y1, cy0 + CHUNK - 1); y++)
        for (let x = Math.max(r.x0, cx0); x <= Math.min(r.x1, cx0 + CHUNK - 1); x++) {
          const k = (y - cy0) * CHUNK + (x - cx0)
          ch.solid[k] = 0
          if (r === st.road) ch.ground[k] = FG.ROAD
        }
    if (st.road) ch.canvas = undefined
    for (const { o, solid } of st.objects) {
      if (!inChunk(o.x, o.y)) continue
      ch.objects.push(o)
      if (solid) ch.solid[(o.y - cy0) * CHUNK + (o.x - cx0)] = 1
    }
    for (const t of st.solid ?? [])
      if (inChunk(t.x, t.y)) ch.solid[(t.y - cy0) * CHUNK + (t.x - cx0)] = 1
  }

  /** The story's things at a tile, if any (finds, and the pieces of a site). */
  storyAt(x: number, y: number): ForestObj | undefined {
    const cx = Math.floor(x / CHUNK)
    const cy = Math.floor(y / CHUNK)
    const ch = this.chunks.get(`${cx},${cy}`)
    return ch?.objects.find((o) => o.x === x && o.y === y && STORY_KINDS.has(o.k))
  }

  /** The forest's own thing standing on a tile (a tree, stump, log, rock...), if any. */
  objectAt(x: number, y: number): ForestObj | undefined {
    const ch = this.chunks.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`)
    return ch?.objects.find(
      (o) => o.x === x && o.y === y && !STORY_KINDS.has(o.k) && o.k !== 'prop',
    )
  }

  /** Takes a story thing away (a find you picked up): from its chunk, and from its stamp. */
  removeStory(x: number, y: number, k: ForestKind) {
    for (const st of this.stamps)
      st.objects = st.objects.filter((e) => !(e.o.x === x && e.o.y === y && e.o.k === k))
    const ch = this.chunks.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`)
    if (ch) ch.objects = ch.objects.filter((o) => !(o.x === x && o.y === y && o.k === k))
  }

  /** Drops chunks far from (x, y) once there are too many. */
  prune(x: number, y: number) {
    if (this.chunks.size <= MAX_CHUNKS) return
    const pcx = x / CHUNK
    const pcy = y / CHUNK
    const far = [...this.chunks.values()].sort(
      (a, b) =>
        Math.hypot(b.cx + 0.5 - pcx, b.cy + 0.5 - pcy) -
        Math.hypot(a.cx + 0.5 - pcx, a.cy + 0.5 - pcy),
    )
    for (const ch of far.slice(0, this.chunks.size - MAX_CHUNKS))
      this.chunks.delete(`${ch.cx},${ch.cy}`)
  }

  /**
   * The point of no return: from now on there's no map and no treeline behind you, only more
   * forest. Every chunk you can't see right now (the tile rectangle `view`) is forgotten, so
   * whichever way you turn, it's been made again: a different forest, no path.
   */
  lose(view: { x0: number; y0: number; x1: number; y1: number }) {
    this.lost = true
    // What you can see right now (with room for tall trees standing just below the view) stays
    // exactly as it is; everything else, even in the same chunks, is made again as lost forest.
    // (Keeping whole chunks left pieces of road just off-screen, cut off where the chunk ended.)
    const keep = {
      x0: Math.floor(view.x0) - 2,
      y0: Math.floor(view.y0) - 2,
      x1: Math.ceil(view.x1) + 2,
      y1: Math.ceil(view.y1) + 6,
    }
    const inKeep = (x: number, y: number) =>
      x >= keep.x0 && x <= keep.x1 && y >= keep.y0 && y <= keep.y1
    // The ground itself only within the view; past its edges, only trees (their crowns show).
    const inView = (x: number, y: number) =>
      x >= Math.floor(view.x0) &&
      x <= Math.ceil(view.x1) &&
      y >= Math.floor(view.y0) &&
      y <= Math.ceil(view.y1)
    const keptObj = (o: ForestObj) =>
      inView(o.x, o.y) ||
      (inKeep(o.x, o.y) && (o.k === 'fpine' || o.k === 'ftree' || o.k === 'dead'))
    for (const old of [...this.chunks.values()]) {
      const key = `${old.cx},${old.cy}`
      const cx0 = old.cx * CHUNK
      const cy0 = old.cy * CHUNK
      const seen =
        cx0 + CHUNK > keep.x0 && cx0 <= keep.x1 && cy0 + CHUNK > keep.y0 && cy0 <= keep.y1
      if (!seen) {
        this.chunks.delete(key)
        continue
      }
      const fresh = this.generate(old.cx, old.cy)
      for (let j = 0; j < CHUNK; j++)
        for (let i = 0; i < CHUNK; i++)
          if (inView(cx0 + i, cy0 + j)) {
            const k = j * CHUNK + i
            fresh.ground[k] = old.ground[k]
            fresh.solid[k] = old.solid[k]
          }
      const kept = old.objects.filter(keptObj)
      fresh.objects = [
        ...fresh.objects.filter(
          (o) => !kept.some((q) => q.x === o.x && q.y === o.y) && !inView(o.x, o.y),
        ),
        ...kept,
      ]
      // A kept tree's tile stays solid, wherever it stands.
      for (const o of kept)
        if (o.x >= cx0 && o.x < cx0 + CHUNK && o.y >= cy0 && o.y < cy0 + CHUNK)
          fresh.solid[(o.y - cy0) * CHUNK + (o.x - cx0)] =
            old.solid[(o.y - cy0) * CHUNK + (o.x - cx0)]
      this.chunks.set(key, fresh)
    }
  }

  /** Whether the map (story/map.ts) is what's drawn at a tile: its chunk wasn't made lost. */
  isMap(x: number, y: number): boolean {
    const ch = this.chunks.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`)
    return !!ch && !ch.wild
  }

  /**
   * Once you're lost, any chunk that still holds the map or the way home is forgotten the moment
   * it's out of sight (the tile rectangle you can see), so turning round never finds it again.
   */
  forgetHome(x0: number, y0: number, x1: number, y1: number) {
    if (!this.lost) return
    for (const ch of [...this.chunks.values()]) {
      // Anything still made from the map (or the way home) goes the moment it's out of sight.
      if (ch.wild) continue
      const cx0 = ch.cx * CHUNK
      const cy0 = ch.cy * CHUNK
      const seen = cx0 + CHUNK > x0 && cx0 <= x1 && cy0 + CHUNK > y0 && cy0 <= y1
      if (!seen) this.chunks.delete(`${ch.cx},${ch.cy}`)
    }
  }

  /**
   * One tile of Hollow Pines (story/map.ts): the map's ground and solid tiles, and between the
   * paths a forest that's the same every trip (HOLLOW_SEED), thin by the paths and closing in
   * away from them.
   */
  private mapTile(ch: Chunk, i: number, j: number, x: number, y: number, depth: number) {
    const L = layout()
    const s = HOLLOW_SEED
    const k = j * CHUNK + i
    const r = hash(x, y, s)
    const r2 = hash(y, x, s + 1)
    const put = (kind: ForestKind, solid: boolean) => {
      ch.objects.push({ k: kind, x, y, v: Math.floor(hash(x, y, s + 13) * 4) })
      if (solid) ch.solid[k] = 1
    }
    const g = L.ground(x, y)
    ch.ground[k] = g ? MAP_GROUND[g] : noise(x, y, 6, s + 4) > 0.62 ? FG.MOSS : FG.LITTER
    if (L.solid(x, y)) ch.solid[k] = 1
    if (L.clear(x, y) || depth < ENTRY_CLEARING) {
      // Clearings and verges: the odd fern or mushroom, never on the road or a path.
      if (!g && r2 < 0.05) put('fern', false)
      else if (g === 'wild' && r2 < 0.12) put(r2 < 0.04 ? 'shroom' : 'fern', false)
      return
    }
    // Thin by the paths, closing in away from them (and thickest off the map entirely).
    const off = L.off(x, y)
    const density = Math.min(
      TREE_DENSITY_MAX,
      MAP_TREES_NEAR + Math.max(0, off - 1) * MAP_TREES_PER_TILE,
    )
    if (r < density * 0.5) put('fpine', true)
    else if (r < density * 0.75) put('ftree', true)
    else if (r < density) put('dead', true)
    else if (r2 < 0.06) put('fern', false)
    else if (r2 < 0.075) put('rock', false)
    else if (r2 < 0.085) put('shroom', false)
    else if (r2 < 0.09) put('stump', true)
  }

  private generate(cx: number, cy: number): Chunk {
    const s = this.seed
    const ch: Chunk = {
      cx,
      cy,
      solid: new Uint8Array(CHUNK * CHUNK),
      ground: new Uint8Array(CHUNK * CHUNK),
      objects: [],
      ...(this.lost ? { wild: true } : {}),
    }
    // A chunk made after you're lost is a different forest from the one you walked through.
    const salt = this.lost ? 7919 : 0
    for (let j = 0; j < CHUNK; j++)
      for (let i = 0; i < CHUNK; i++) {
        const x = cx * CHUNK + i
        const y = cy * CHUNK + j
        const k = j * CHUNK + i
        const put = (kind: ForestKind, solid: boolean) => {
          ch.objects.push({ k: kind, x, y, v: Math.floor(hash(x, y, s + 13) * 4) })
          if (solid) ch.solid[k] = 1
        }
        const r = hash(x, y, s + salt)
        const r2 = hash(y, x, s + salt + 1)

        // Behind where you came in (until you're lost): the treeline, solid but for the strip of
        // undergrowth back home.
        const back = this.back(x + 0.5, y + 0.5)
        if (!this.lost && back > 0) {
          ch.home = true
          ch.ground[k] = FG.EDGE
          if (Math.abs(this.lateral(x + 0.5, y + 0.5)) < 1.2 && back < BACK_STRIP + 0.5) {
            put('brush', false)
            continue
          }
          ch.solid[k] = 1
          if ((x + y * 2) % 3 === 0 || r < 0.15) put(r2 < 0.6 ? 'fpine' : 'ftree', true)
          continue
        }

        const depth = this.depth(x + 0.5, y + 0.5)
        if (!this.lost) {
          this.mapTile(ch, i, j, x, y, depth)
          continue
        }
        // Lost: the forest stops being the map. Random, different from anything you walked.
        const clearing = noise(x, y, 9, s + salt + 2)
        const ridge = noise(x, y, 14, s + salt + 3)
        const onPath = Math.abs(ridge - 0.5) < PATH_WIDTH
        // (Its open lanes look like any other forest floor: lost, there are no paths.)
        ch.ground[k] = noise(x, y, 6, s + salt + 4) > 0.62 ? FG.MOSS : FG.LITTER
        let density = Math.min(TREE_DENSITY_MAX, TREE_DENSITY + depth * TREE_DENSITY_PER_TILE)
        if (clearing > CLEARING_ABOVE) density *= 0.1
        if (onPath) density = 0
        if (r < density * 0.5) put('fpine', true)
        else if (r < density * 0.75) put('ftree', true)
        else if (r < density) put('dead', true)
        else if (onPath) {
          if (r2 < 0.04) put('shroom', false)
        } else if (r2 < 0.07) put('fern', false)
        else if (r2 < 0.085) put('rock', false)
        else if (r2 < 0.095) put('shroom', false)
        else if (r2 < 0.1) put('stump', true)
        else if (r2 < 0.104 && i < CHUNK - 1) {
          // A fallen log, two tiles long.
          put('log', true)
          ch.solid[k + 1] = 1
        }
      }
    if (!this.lost)
      for (const p of layout().propsIn(
        cx * CHUNK,
        cy * CHUNK,
        cx * CHUNK + CHUNK - 1,
        cy * CHUNK + CHUNK - 1,
      ))
        ch.objects.push({ k: 'prop', x: p.x, y: p.y, v: p.v ?? 0, id: p.id })
    for (const st of this.stamps) this.applyStamp(ch, st)
    return ch
  }
}
