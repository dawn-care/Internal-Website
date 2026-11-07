import type { Dir } from '../../shared/schema'
import { hash, type Edge } from '../maps'
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
  'fpine' | 'ftree' | 'dead' | 'stump' | 'log' | 'rock' | 'fern' | 'shroom' | 'brush'

export interface ForestObj {
  k: ForestKind
  x: number
  y: number
  /** Which variant of the sprite (0–3). */
  v: number
}

/** Ground types in the forest (drawn in forest/art.ts). */
export const FG = { LITTER: 0, MOSS: 1, PATH: 2, EDGE: 3 } as const

export interface Chunk {
  cx: number
  cy: number
  solid: Uint8Array
  ground: Uint8Array
  objects: ForestObj[]
  /** The drawn ground, made when first needed (forest/art.ts). */
  canvas?: HTMLCanvasElement
  /** Holds part of the treeline and the way home (made before you were lost). */
  home?: boolean
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
   * The point of no return: from now on there's no treeline behind you, only more forest. Every
   * chunk out of sight (more than `keep` chunks from you) is forgotten, so when you go back that
   * way it's been made again without the way home.
   */
  lose(x: number, y: number, keep = 2) {
    this.lost = true
    const pcx = Math.floor(x / CHUNK)
    const pcy = Math.floor(y / CHUNK)
    for (const ch of [...this.chunks.values()])
      if (Math.abs(ch.cx - pcx) > keep || Math.abs(ch.cy - pcy) > keep)
        this.chunks.delete(`${ch.cx},${ch.cy}`)
  }

  /**
   * Once you're lost, any chunk that still holds the way home is forgotten the moment it's out of
   * sight (the tile rectangle you can see), so turning round never finds it again.
   */
  forgetHome(x0: number, y0: number, x1: number, y1: number) {
    if (!this.lost) return
    for (const ch of [...this.chunks.values()]) {
      if (!ch.home) continue
      const cx0 = ch.cx * CHUNK
      const cy0 = ch.cy * CHUNK
      const seen = cx0 + CHUNK > x0 && cx0 <= x1 && cy0 + CHUNK > y0 && cy0 <= y1
      if (!seen) this.chunks.delete(`${ch.cx},${ch.cy}`)
    }
  }

  private generate(cx: number, cy: number): Chunk {
    const s = this.seed
    const ch: Chunk = {
      cx,
      cy,
      solid: new Uint8Array(CHUNK * CHUNK),
      ground: new Uint8Array(CHUNK * CHUNK),
      objects: [],
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
        const clearing = noise(x, y, 9, s + salt + 2)
        const ridge = noise(x, y, 14, s + salt + 3)
        const onPath = Math.abs(ridge - 0.5) < PATH_WIDTH
        ch.ground[k] = onPath ? FG.PATH : noise(x, y, 6, s + salt + 4) > 0.62 ? FG.MOSS : FG.LITTER
        if (!this.lost && depth < ENTRY_CLEARING) {
          if (r < 0.06) put('fern', false)
          continue
        }
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
    return ch
  }
}
