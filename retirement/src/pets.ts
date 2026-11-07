import { PET_COATS, type PetCoat, type PetKind } from '../shared/catalog'
import type { Dir, PetLook } from '../shared/schema'
import { pen } from './art'

/*
 * Pets: little dog and cat sprites drawn in code (walking in four directions, sitting, asleep),
 * and the Follower that makes a pet trot along its owner's path. The same Follower runs for
 * your pet and for each neighbour's, from their synced position, so a pet's own position is
 * never sent over the network.
 */

export const PET_W = 18
export const PET_H = 16

export type PetPose = 'walk' | 'sit' | 'sleep'

type Pen = ReturnType<typeof pen>

const NOSE = '#1c1418'
const OUTLINE: [number, number, number] = [0x2b, 0x1d, 0x22]
const cache = new Map<string, HTMLCanvasElement>()

export function coatOf(p: PetLook): PetCoat {
  const coats = PET_COATS[p.kind]
  return coats[p.coat] ?? coats[0]
}

/**
 * A pet sprite, 18×16, anchored at its feet (bottom centre). dir: 0 down, 1 left, 2 right, 3 up.
 * frame: 0–3 for walking; for sitting, odd frames wag the tail.
 */
export function petSprite(
  kind: PetKind,
  coat: number,
  pose: PetPose,
  dir: Dir,
  frame: number,
): HTMLCanvasElement {
  const key = `${kind}|${coat}|${pose}|${dir}|${frame}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = PET_W
  cv.height = PET_H
  const c = cv.getContext('2d')!
  if (pose === 'walk' && dir === 1) {
    c.translate(PET_W, 0)
    c.scale(-1, 1)
    c.drawImage(petSprite(kind, coat, pose, 2, frame), 0, 0)
  } else {
    const look = { kind, coat, name: '' }
    const f = pen(c)
    const col = coatOf(look)
    if (pose === 'sleep') drawSleeping(f, kind, col)
    else if (pose === 'sit') drawSitting(f, kind, col, frame % 2 === 1)
    else if (dir === 2) drawSide(f, kind, col, frame)
    else if (dir === 3) drawBack(f, kind, col, frame)
    else drawFront(f, kind, col, frame)
    outline(c)
  }
  cache.set(key, cv)
  return cv
}

function disc(f: Pen, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry
    if (Math.abs(dy) > 1) continue
    const half = rx * Math.sqrt(1 - dy * dy)
    const x0 = Math.round(cx - half)
    const x1 = Math.round(cx + half)
    if (x1 > x0) f(color, x0, y, x1 - x0, 1)
  }
}

/** Stripes, calico patches or a white chest, over a body centred at (cx, cy). */
function pattern(f: Pen, col: PetCoat, cx: number, cy: number, side: boolean) {
  if (col.pattern === 'stripes') {
    for (const dx of side ? [-3, -1, 1, 3] : [-2, 0, 2]) f(col.dark, cx + dx, cy - 2, 1, 2)
  } else if (col.pattern === 'patches') {
    disc(f, cx - 2, cy - 1, 2, 1.4, col.patch ?? '#e8933f')
    disc(f, cx + 2, cy, 1.6, 1.2, '#2e2a30')
  }
}

function drawSide(f: Pen, kind: PetKind, col: PetCoat, frame: number) {
  // Legs: diagonal pairs lift in turn as it trots.
  const leg = (x: number, up: number) => {
    f(col.dark, x, 11 - up, 2, 3)
    f(col.belly, x, 14 - up, 2, 1)
  }
  const a = frame === 1 ? 1 : 0
  const b = frame === 3 ? 1 : 0
  leg(4, a)
  leg(6, b)
  leg(11, b)
  leg(13, a)
  // Tail.
  if (kind === 'dog') {
    f(col.base, 2, 6, 2, 3)
    f(col.base, 1, 5, 2, 2)
  } else {
    f(col.base, 2, 7, 1, 3)
    f(col.base, 1, 4, 1, 4)
    f(col.dark, 1, 4, 1, 1)
  }
  // Body.
  disc(f, 8.5, 9.5, 6, 3, col.base)
  f(col.light, 5, 7, 7, 1)
  f(col.belly, 6, 12, 6, 1)
  pattern(f, col, 8, 9, true)
  // Head.
  if (kind === 'dog') {
    disc(f, 13.5, 6, 3, 3, col.base)
    f(col.belly, 15, 6, 3, 2)
    f(NOSE, 17, 6, 1, 1)
    f(NOSE, 14, 5, 1, 1)
    f(col.dark, 11, 4, 2, 4)
    if (col.pattern === 'tuxedo') f(col.belly, 13, 7, 2, 2)
  } else {
    disc(f, 13.5, 6.5, 2.8, 2.6, col.base)
    f(col.base, 11, 3, 2, 2)
    f(col.base, 14, 3, 2, 2)
    f(col.base, 11, 2, 1, 1)
    f(col.base, 15, 2, 1, 1)
    f('#f2a0a8', 14, 4, 1, 1)
    f('#7ac142', 14, 6, 1, 1)
    f('#e889a0', 16, 7, 1, 1)
    f(col.belly, 15, 8, 2, 1)
    if (col.pattern === 'stripes') f(col.dark, 12, 4, 2, 1)
    if (col.pattern === 'patches') f(col.patch ?? '#e8933f', 11, 3, 2, 2)
  }
}

function drawFront(f: Pen, kind: PetKind, col: PetCoat, frame: number) {
  const l = frame === 1 ? 1 : 0
  const r = frame === 3 ? 1 : 0
  // Tail peeking out behind.
  f(col.base, 13, 8, 2, 3)
  // Body and front legs.
  disc(f, 9, 11, 4.5, 3, col.base)
  f(col.dark, 6, 12 - l, 2, 3)
  f(col.dark, 10, 12 - r, 2, 3)
  f(col.belly, 6, 14 - l, 2, 1)
  f(col.belly, 10, 14 - r, 2, 1)
  f(col.belly, 8, 9, 2, 3)
  pattern(f, col, 9, 11, false)
  drawFace(f, kind, col, 9, 6)
}

function drawFace(f: Pen, kind: PetKind, col: PetCoat, cx: number, cy: number) {
  if (kind === 'dog') {
    disc(f, cx, cy, 3.6, 3.2, col.base)
    f(col.dark, cx - 5, cy - 2, 2, 5)
    f(col.dark, cx + 3, cy - 2, 2, 5)
    f(col.belly, cx - 2, cy + 1, 4, 2)
    f(NOSE, cx - 1, cy + 1, 2, 1)
    f(NOSE, cx - 2, cy - 1, 1, 1)
    f(NOSE, cx + 1, cy - 1, 1, 1)
    f(col.light, cx - 2, cy - 3, 3, 1)
  } else {
    disc(f, cx, cy + 0.5, 3.3, 3, col.base)
    // Pointed ears.
    f(col.base, cx - 3, cy - 4, 1, 1)
    f(col.base, cx - 3, cy - 3, 2, 1)
    f(col.base, cx + 2, cy - 4, 1, 1)
    f(col.base, cx + 1, cy - 3, 2, 1)
    f('#f2a0a8', cx - 3, cy - 2, 1, 1)
    f('#f2a0a8', cx + 2, cy - 2, 1, 1)
    f('#7ac142', cx - 2, cy, 1, 1)
    f('#7ac142', cx + 1, cy, 1, 1)
    f(NOSE, cx - 2, cy - 1, 1, 1)
    f(NOSE, cx + 1, cy - 1, 1, 1)
    f('#e889a0', cx - 1, cy + 1, 2, 1)
    f(col.belly, cx - 1, cy + 2, 2, 1)
    if (col.pattern === 'stripes') {
      f(col.dark, cx - 1, cy - 3, 1, 2)
      f(col.dark, cx + 1, cy - 3, 1, 1)
    }
    if (col.pattern === 'patches') f(col.patch ?? '#e8933f', cx + 1, cy - 3, 2, 2)
  }
}

function drawBack(f: Pen, kind: PetKind, col: PetCoat, frame: number) {
  const l = frame === 1 ? 1 : 0
  const r = frame === 3 ? 1 : 0
  disc(f, 9, 10.5, 4.5, 3.2, col.base)
  f(col.dark, 6, 12 - r, 2, 3)
  f(col.dark, 10, 12 - l, 2, 3)
  f(col.light, 7, 8, 4, 1)
  pattern(f, col, 9, 11, false)
  // Back of the head and ears.
  disc(f, 9, 5.5, 3.4, 3, col.base)
  if (kind === 'dog') {
    f(col.dark, 4, 4, 2, 5)
    f(col.dark, 12, 4, 2, 5)
  } else {
    f(col.base, 6, 1, 1, 3)
    f(col.base, 11, 1, 1, 3)
    f(col.base, 6, 2, 2, 1)
    f(col.base, 10, 2, 2, 1)
  }
  // Tail up in the middle.
  if (kind === 'dog') f(col.base, 8, 8, 2, 3)
  else {
    f(col.base, 9, 6, 1, 5)
    f(col.dark, 9, 6, 1, 1)
  }
}

function drawSitting(f: Pen, kind: PetKind, col: PetCoat, wag: boolean) {
  // Tail out to one side, wagging.
  if (kind === 'dog') f(col.base, wag ? 13 : 12, wag ? 10 : 11, 3, 2)
  else {
    f(col.base, 12, 13, 4, 1)
    f(col.base, 15, wag ? 10 : 11, 1, 3)
  }
  disc(f, 9, 10.5, 4, 4, col.base)
  f(col.belly, 7, 9, 4, 4)
  f(col.dark, 6, 13, 2, 2)
  f(col.dark, 10, 13, 2, 2)
  f(col.belly, 6, 14, 2, 1)
  f(col.belly, 10, 14, 2, 1)
  pattern(f, col, 9, 11, false)
  drawFace(f, kind, col, 9, 5)
}

function drawSleeping(f: Pen, kind: PetKind, col: PetCoat) {
  // Curled up nose to tail.
  disc(f, 8.5, 11.5, 6, 3.2, col.base)
  f(col.light, 5, 9, 6, 1)
  pattern(f, col, 8, 11, true)
  disc(f, 13, 11, 2.8, 2.4, col.base)
  if (kind === 'dog') f(col.dark, 11, 9, 2, 3)
  else {
    f(col.base, 12, 8, 1, 1)
    f(col.base, 14, 8, 1, 1)
  }
  f(NOSE, 12, 11, 2, 1)
  f(kind === 'dog' ? NOSE : '#e889a0', 15, 12, 1, 1)
  // Tail wrapped round the front.
  f(col.base, 4, 14, 9, 1)
  f(col.dark, 4, 14, 2, 1)
}

function outline(c: CanvasRenderingContext2D) {
  const img = c.getImageData(0, 0, PET_W, PET_H)
  const d = img.data
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < PET_W && y < PET_H && d[(y * PET_W + x) * 4 + 3] > 0
  const out: number[] = []
  for (let y = 0; y < PET_H; y++)
    for (let x = 0; x < PET_W; x++) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push(x, y)
    }
  for (let i = 0; i < out.length; i += 2) {
    const o = (out[i + 1] * PET_W + out[i]) * 4
    d[o] = OUTLINE[0]
    d[o + 1] = OUTLINE[1]
    d[o + 2] = OUTLINE[2]
    d[o + 3] = 255
  }
  c.putImageData(img, 0, 0)
}

/** How far behind its owner (along their path, in tiles) a pet walks. */
const FOLLOW_GAP = 1.9
const TRAIL_KEEP = 5
/** It won't walk closer than this to its owner (but stays put if they walk up to it). */
const MIN_GAP = 1.4

/**
 * Trots along an owner's path a little behind them, and sits when they stop. Positions are in
 * tiles, y at the feet, like people.
 */
export class Follower {
  x = 0
  y = 0
  dir: Dir = 0
  anim = 0
  moving = false
  /** Seconds since it last moved; it sits down after a moment. */
  still = 0
  /** Settled at its owner's feet (they're sitting): curls up after a while. */
  private curl = false
  private trail: { x: number; y: number }[] = []

  /** Forget the owner's path (they sat down or got up), starting afresh from here. */
  retrail() {
    this.trail = [{ x: this.x, y: this.y }]
  }

  /** Trots to a spot (its owner's feet) and settles there: sits, then curls up. */
  settle(dt: number, tx: number, ty: number) {
    this.curl = true
    this.walkTo(dt, tx, ty)
  }

  reset(x: number, y: number) {
    this.x = x
    this.y = y
    this.trail = [{ x, y }]
    this.moving = false
    this.still = 1
  }

  update(dt: number, ox: number, oy: number) {
    this.curl = false
    const last = this.trail[this.trail.length - 1]
    if (!last || Math.hypot(ox - last.x, oy - last.y) > 0.12) this.trail.push({ x: ox, y: oy })
    // The point FOLLOW_GAP back along the owner's path.
    let need = FOLLOW_GAP
    let tx = this.trail[0].x
    let ty = this.trail[0].y
    let walked = 0
    let cut = 0
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i]
      const b = this.trail[i - 1]
      const len = Math.hypot(a.x - b.x, a.y - b.y)
      walked += len
      if (need > 0) {
        if (len >= need) {
          const t = need / len
          tx = a.x + (b.x - a.x) * t
          ty = a.y + (b.y - a.y) * t
        }
        need -= len
      }
      if (walked > TRAIL_KEEP) {
        cut = i - 1
        break
      }
    }
    if (cut > 0) this.trail.splice(0, cut)
    // If the owner walks up to it (or right over it), it stays where it is: overlapping is fine,
    // and backing away looks like it's avoiding them. It also holds still rather than walk through
    // them when the point on their path is right beside them or on their far side (they doubled
    // back), and starts trotting after them again once they've walked on past.
    const od = Math.hypot(this.x - ox, this.y - oy)
    const across = (tx - ox) * (this.x - ox) + (ty - oy) * (this.y - oy) < 0
    if (od < MIN_GAP || across || Math.hypot(tx - ox, ty - oy) < MIN_GAP) {
      tx = this.x
      ty = this.y
    }
    this.walkTo(dt, tx, ty)
  }

  private walkTo(dt: number, tx: number, ty: number) {
    const dx = tx - this.x
    const dy = ty - this.y
    const d = Math.hypot(dx, dy)
    if (d > 6) {
      this.reset(tx, ty)
      return
    }
    if (d > 0.04) {
      const step = Math.min(d, Math.max(3.4, d * 4) * dt)
      this.x += (dx / d) * step
      this.y += (dy / d) * step
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
      this.anim += dt * 9
      this.moving = true
      this.still = 0
    } else {
      this.moving = false
      this.anim = 0
      this.still += dt
    }
  }

  pose(): PetPose {
    if (this.moving || this.still < 0.6) return 'walk'
    return this.curl && this.still > 6 ? 'sleep' : 'sit'
  }
}

const NY_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today as a New York calendar day, "YYYY-MM-DD": petting and treats count once per day. */
export function petDay(now: number): string {
  return NY_DAY.format(now)
}

/** Pets sleep in their beds from 9 pm to 6 am on the shared game clock. */
export function petBedtime(hour: number): boolean {
  return hour >= 21 || hour < 6
}

export type PetGift = { coins: number } | { seed: string; count: number }

/** What a pet brings you (from GIFT_HEARTS hearts, at most once a day, not every day). */
export function pickGift(r: number, r2: number): PetGift | null {
  if (r < 0.4) return null
  if (r < 0.65) return { coins: 5 + Math.floor(r2 * 11) }
  if (r < 0.85) return { seed: 'carrot', count: 2 }
  if (r < 0.95) return { seed: 'radish', count: 3 }
  return { seed: 'strawberry', count: 1 }
}

export function heartsText(n: number, max: number): string {
  return `♥ ${n}/${max}`
}

/** A little biscuit-bone treat, for the basket and the Kitchen. */
export function treatIcon(size = 24): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = 12
  cv.height = 12
  cv.style.width = `${size}px`
  cv.style.height = `${size}px`
  cv.style.imageRendering = 'pixelated'
  const f = pen(cv.getContext('2d')!)
  for (const [x, y] of [
    [1, 3],
    [1, 6],
    [8, 3],
    [8, 6],
  ]) {
    f('#7a4a22', x, y, 3, 3)
    f('#d99a52', x, y, 2, 2)
  }
  f('#7a4a22', 3, 4, 6, 4)
  f('#d99a52', 3, 5, 6, 2)
  f('#f2c48a', 3, 5, 5, 1)
  return cv
}
