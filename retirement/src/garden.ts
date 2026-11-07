import { CROPS, WATER_MS } from '../shared/catalog'
import type { Tile } from '../shared/schema'

/*
 * Crops grow in real time, but only while watered: each watering keeps a crop growing for
 * WATER_MS. Growth is worked out from timestamps, so plots keep growing while you're away
 * (as long as they're wet), and everyone computes the same picture of anyone's plot.
 */

export const YIELD: Record<string, number> = { strawberry: 3, tomato: 2 }

/** Growth in ms as of `now`, without changing the tile. */
export function growthAt(tile: Tile, now: number): number {
  if (!tile.c) return 0
  const since = tile.t ?? now
  const wetUntil = Math.min(now, tile.w ?? 0)
  return (tile.g ?? 0) + Math.max(0, wetUntil - since)
}

/** Folds elapsed watered time into the tile's stored growth. */
export function settle(tile: Tile, now: number): void {
  if (!tile.c) return
  tile.g = growthAt(tile, now)
  tile.t = now
}

export function isWet(tile: Tile, now: number): boolean {
  return (tile.w ?? 0) > now
}

export function fraction(tile: Tile, now: number): number {
  const def = tile.c ? CROPS[tile.c] : undefined
  return def ? Math.min(1, growthAt(tile, now) / def.growMs) : 0
}

/** 0 seed, 1 sprout, 2 growing, 3 ripe. */
export function stage(tile: Tile, now: number): number {
  const fr = fraction(tile, now)
  if (fr >= 1) return 3
  if (fr < 0.25) return 0
  return fr < 0.6 ? 1 : 2
}

export function till(tile: Tile): void {
  tile.s = 1
}

export function plant(tile: Tile, crop: string, now: number): void {
  tile.c = crop
  tile.g = 0
  tile.t = now
}

export function water(tile: Tile, now: number): void {
  settle(tile, now)
  tile.w = now + WATER_MS
}

/** Harvests a ripe crop: returns what was picked. */
export function harvest(tile: Tile, now: number): { crop: string; count: number } | null {
  if (!tile.c || stage(tile, now) !== 3) return null
  const def = CROPS[tile.c]
  const out = { crop: tile.c, count: YIELD[tile.c] ?? 1 }
  if (def.regrows) {
    tile.g = def.growMs * 0.6
    tile.t = now
  } else {
    delete tile.c
    delete tile.g
    delete tile.t
  }
  return out
}

/**
 * Digging up what's growing in a tile (leaving tilled soil). A seed that hasn't sprouted comes back
 * as a seed; a grown strawberry or tomato plant comes up whole, for a pot (and any ripe fruit is
 * picked first); anything else unripe is pulled up and lost (`lost`), so the game asks first.
 */
export function digUp(
  tile: Tile,
  now: number,
): {
  seed?: string
  plant?: string
  fruit?: { crop: string; count: number }
  lost?: string
} | null {
  if (!tile.c) return null
  const crop = tile.c
  const st = stage(tile, now)
  const out: ReturnType<typeof digUp> = {}
  if (st === 3) out.fruit = { crop, count: YIELD[crop] ?? 1 }
  if (st === 0) out.seed = crop
  else if (CROPS[crop].regrows) out.plant = crop
  else if (st < 3) out.lost = crop
  delete tile.c
  delete tile.g
  delete tile.t
  return out
}

/** Whether digging this tile up would throw away a growing crop (see digUp). */
export function digLoses(tile: Tile, now: number): boolean {
  if (!tile.c) return false
  const st = stage(tile, now)
  return st > 0 && st < 3 && !CROPS[tile.c].regrows
}

/** Plants a potted plant (dug up earlier): it's established, so it fruits sooner than a seed. */
export function transplant(tile: Tile, crop: string, now: number): void {
  tile.c = crop
  tile.g = CROPS[crop].growMs * 0.6
  tile.t = now
}

export function timeLeft(tile: Tile, now: number): number {
  const def = tile.c ? CROPS[tile.c] : undefined
  return def ? Math.max(0, def.growMs - growthAt(tile, now)) : 0
}
