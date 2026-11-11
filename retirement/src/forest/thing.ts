import type { Dir } from '../../shared/schema'
import { outlineCanvas, pen } from '../art'
import { thingSprite } from './story/ride'
import {
  THING_CATCH,
  THING_CHASE_MAX_MS,
  THING_CHASE_SPEED,
  THING_DOOR,
  THING_HEAR,
  THING_LOSE,
  THING_LOSE_MS,
  THING_NOTICE,
  THING_RETREAT,
  THING_RETURN_MS,
  THING_SOUTH,
  THING_SPEED,
  THING_SPEED_MAX,
  THING_SPEED_RISE,
  THING_UNEASE_RANGE,
  THING_WAIT_MS,
} from './tuning'

/*
 * The thing in the deep (FOREST.md "The thing in the deep"): what a copy is when it stops
 * pretending. One creature that hunts you through the forest once the service gate is open (and
 * whenever you're lost, or the empty bus has let you off). It starts far off each trip and drifts
 * towards you, never straight, faster the longer you're out; close enough and it comes for you.
 *
 * Fair, never random: you hear it before you see it (heavy, uneven steps that carry), your unease
 * climbs as it closes (never saying which way), it's slower than you hurrying, it loses you if you
 * break away out of sight, and it gives up after a while. On the map it never comes south of the
 * creek. It never comes through a door: it waits outside, then drifts off.
 *
 * Plain state and movement; the game draws it, plays its sounds and ends the trip (ThingHost).
 */

export interface ThingHost {
  /** Where you are for it: on the map, or (inside a building) at the door you went in by. */
  me(): { x: number; y: number; moving: boolean }
  /** You're inside a building: it can't reach you. */
  indoors(): boolean
  lost(): boolean
  blocked(x: number, y: number): boolean
  /** How far you can see from where you stand (half the view, tiles). */
  view(): { w: number; h: number }
  /** One of its footsteps from (x, y), at this loudness (0–1). */
  step(x: number, y: number, volume: number): void
  /** It has noticed you and is coming (the rise), or it has lost you (the moan). */
  sound(kind: 'notice' | 'lost', x: number, y: number): void
  /** It has you. */
  caught(line: string): void
}

export type ThingPhase = 'hunt' | 'chase' | 'wait' | 'away'

export class Thing {
  x: number
  y: number
  dir: Dir = 0
  anim = 0
  phase: ThingPhase = 'hunt'
  /** Ms this trip it has been hunting (it speeds up with it). */
  private t = 0
  /** Ms in the current phase. */
  private inPhase = 0
  /** Ms you've been far enough away, out of sight, while it chases you. */
  private lostFor = 0
  /** Which side it goes round things on, and how its approach sways (never straight at you). */
  private side = 1
  private sway = Math.random() * Math.PI * 2
  private nextStep = 0

  constructor(
    private host: ThingHost,
    x: number,
    y: number,
  ) {
    this.x = x
    this.y = y
  }

  /** How far it is from you (tiles). */
  dist(): number {
    const me = this.host.me()
    return Math.hypot(this.x - me.x, this.y - me.y)
  }

  /** 0–1: how close it is, for your unease (it never says which way). */
  closeness(): number {
    if (this.phase === 'away') return 0
    return Math.max(0, Math.min(1, 1 - (this.dist() - 2) / THING_UNEASE_RANGE))
  }

  /** 0–1: the chase's heartbeat and red edge, only once it's coming for you. */
  chaseLevel(): number {
    if (this.phase !== 'chase') return 0
    return Math.max(0.5, Math.min(1, 1 - (this.dist() - 1) / (THING_LOSE + 2)))
  }

  /** Whether it's somewhere you could see it (within the view, give or take). */
  inView(): boolean {
    const me = this.host.me()
    const v = this.host.view()
    return (
      this.phase !== 'away' &&
      !this.host.indoors() &&
      Math.abs(this.x - me.x) < v.w + 2 &&
      Math.abs(this.y - me.y) < v.h + 4
    )
  }

  update(dt: number) {
    const ms = dt * 1000
    this.t += ms
    this.inPhase += ms
    const me = this.host.me()
    const d = this.dist()
    switch (this.phase) {
      case 'away':
        // Gone off into the trees after losing you (or waiting at a door): back after a while,
        // from further off.
        if (this.inPhase > THING_RETURN_MS) this.comeBack()
        return
      case 'wait':
        // A little way from the door you went in by, facing it (so coming out, you've a start on
        // it). It never comes in; after a while it drifts off.
        this.face(me.x, me.y)
        if (!this.host.indoors()) {
          this.to('chase')
          this.host.sound('notice', this.x, this.y)
        } else if (this.inPhase > THING_WAIT_MS) this.retreat()
        return
      case 'hunt': {
        if (this.host.indoors()) {
          // You went in: it comes to the door.
          if (d < THING_DOOR) return this.to('wait')
        } else if (d < THING_NOTICE) {
          this.to('chase')
          this.host.sound('notice', this.x, this.y)
          return
        }
        const speed = Math.min(THING_SPEED_MAX, THING_SPEED + (THING_SPEED_RISE * this.t) / 60_000)
        // Never straight at you: its way in sways from side to side, less as it gets close.
        this.sway += dt * 0.35
        const off = Math.sin(this.sway) * Math.min(d * 0.35, 9)
        const ax = (me.x - this.x) / (d || 1)
        const ay = (me.y - this.y) / (d || 1)
        this.walk(me.x - ay * off, me.y + ax * off, speed, dt)
        return
      }
      case 'chase': {
        if (this.host.indoors()) {
          if (d < THING_DOOR) return this.to('wait')
          this.walk(me.x, me.y, THING_CHASE_SPEED, dt)
          return
        }
        if (d < THING_CATCH) {
          this.host.caught('It had been coming the whole time.')
          return
        }
        // Lost you: you're far enough off for long enough. Or it gives up after a while.
        this.lostFor = d > THING_LOSE ? this.lostFor + ms : 0
        if (this.lostFor > THING_LOSE_MS || this.inPhase > THING_CHASE_MAX_MS) {
          this.host.sound('lost', this.x, this.y)
          return this.retreat()
        }
        this.walk(me.x, me.y, THING_CHASE_SPEED, dt)
        return
      }
    }
  }

  private to(phase: ThingPhase) {
    this.phase = phase
    this.inPhase = 0
    this.lostFor = 0
  }

  /** Off into the trees, out of sight; it comes back later. */
  private retreat() {
    this.to('away')
  }

  /** Back again, a long way off, behind you or to one side: the hunt starts over. */
  private comeBack() {
    const me = this.host.me()
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2
      const x = me.x + Math.cos(a) * THING_RETREAT
      const y = me.y + Math.sin(a) * THING_RETREAT
      if (this.allowed(x, y)) {
        this.x = x
        this.y = y
        break
      }
    }
    this.to('hunt')
  }

  /** On the map it never comes south of the creek; lost, anywhere. */
  allowed(_x: number, y: number): boolean {
    return this.host.lost() || y < THING_SOUTH
  }

  private face(x: number, y: number) {
    const dx = x - this.x
    const dy = y - this.y
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
  }

  /**
   * Towards (tx, ty). Out of sight it drifts through the woods freely (nobody sees how); in sight
   * it goes round what's in the way, sliding along it. It stops at the creek.
   */
  private walk(tx: number, ty: number, speed: number, dt: number) {
    const dx = tx - this.x
    const dy = ty - this.y
    const d = Math.hypot(dx, dy)
    if (d < 0.05) return
    const step = Math.min(d, speed * dt)
    const before = { x: this.x, y: this.y }
    const free = !this.inView()
    const base = Math.atan2(dy, dx)
    for (const a of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8].map((k) => k * this.side)) {
      const nx = this.x + Math.cos(base + a) * step
      const ny = this.y + Math.sin(base + a) * step
      const ok = (x: number, y: number) => this.allowed(x, y) && (free || !this.host.blocked(x, y))
      if (ok(nx, this.y)) this.x = nx
      if (ok(this.x, ny)) this.y = ny
      if (Math.hypot(this.x - before.x, this.y - before.y) > step * 0.4) {
        if (a !== 0) this.side = a > 0 ? 1 : -1
        break
      }
    }
    const moved = Math.hypot(this.x - before.x, this.y - before.y)
    if (moved < 0.001) {
      this.anim = 0
      return
    }
    this.face(tx, ty)
    this.anim += dt * (this.phase === 'chase' ? 5 : 3)
    // Its steps: heavy and uneven (a long stride, then a short one), carrying a long way.
    this.nextStep -= dt * (this.phase === 'chase' ? 2.2 : 1.2)
    if (this.nextStep <= 0) {
      this.nextStep = Math.floor(this.anim) % 2 ? 1.25 : 0.7
      const hear = this.dist()
      if (hear < THING_HEAR) this.host.step(this.x, this.y, 1 - hear / THING_HEAR)
    }
  }
}

// --- the art --------------------------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, draw: (f: ReturnType<typeof pen>) => void) {
  let cv = cache.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    draw(pen(c))
    outlineCanvas(c, w, h, [0x0c, 0x08, 0x08])
    cache.set(key, cv)
  }
  return cv
}

const SKIN = '#cfc9bd'
const SHADE = '#a8a294'
const BLOOD = '#6e1414'
const DARK = '#1a0c0c'

/**
 * Facing you (`back` false) or walking away (`back`): too tall, too thin, arms hanging past its
 * knees, the head on a long neck bent forward; from the front, black eyes and a mouth too wide,
 * blood down its chin and front. `step`: which stride. (Side on, it's ride.ts's `thingSprite`.)
 */
function frontSprite(step: number, back: boolean) {
  return sprite(`thing:${back ? 'b' : 'f'}:${step}`, 26, 58, (f) => {
    // Legs: long, thin, one lifted.
    const lift = step ? [0, 2] : [2, 0]
    f(SHADE, 9, 34, 2, 21 - lift[0])
    f(SKIN, 15, 34, 2, 21 - lift[1])
    f(SHADE, 8, 55 - lift[0], 4, 2)
    f(SKIN, 14, 55 - lift[1], 4, 2)
    // Body: narrow, the ribs showing.
    f(SKIN, 8, 14, 10, 21)
    for (let y = 17; y < 30; y += 3) f(SHADE, 9, y, 8, 1)
    if (!back) {
      f(BLOOD, 12, 14, 2, 18)
      f(BLOOD, 10, 20, 2, 9)
    } else f(SHADE, 12, 14, 2, 20)
    // Arms: hanging far too low, swinging a little.
    const sw = step ? 1 : -1
    f(SHADE, 5, 15, 2, 30 + sw)
    f(SKIN, 19, 15, 2, 30 - sw)
    for (let i = 0; i < 3; i++) {
      f(SHADE, 4 + i, 45 + sw, 1, 5)
      f(SKIN, 19 + i, 45 - sw, 1, 6)
    }
    if (!back) {
      f(BLOOD, 19, 42, 3, 5)
      f(BLOOD, 4, 44, 3, 3)
    }
    // The neck and head, bent forward.
    f(SKIN, 11, 9, 4, 6)
    f(SKIN, 8, 1, 10, 9)
    if (back) {
      f('#3a3632', 8, 1, 10, 6)
      f('#3a3632', 8, 7, 2, 4)
      f('#3a3632', 16, 7, 2, 5)
      return
    }
    f(SHADE, 8, 8, 10, 2)
    // Black eyes, and the mouth: too wide, open, teeth, blood down the chin.
    f(DARK, 9, 4, 2, 2)
    f(DARK, 15, 4, 2, 2)
    f(DARK, 8, 7, 10, 2)
    for (let x = 9; x < 18; x += 2) f('#d8d0c0', x, 7, 1, 1)
    f(BLOOD, 11, 9, 2, 5)
    f(BLOOD, 14, 9, 1, 3)
    f('#3a3632', 8, 0, 10, 2)
    f('#3a3632', 8, 2, 1, 6)
    f('#3a3632', 17, 2, 1, 5)
  })
}

/** Its sprite for a direction and stride (left is the side view flipped). */
export function thingFrame(dir: Dir, step: number): { cv: HTMLCanvasElement; flip: boolean } {
  if (dir === 0) return { cv: frontSprite(step, false), flip: false }
  if (dir === 3) return { cv: frontSprite(step, true), flip: false }
  return { cv: thingSprite(step), flip: dir === 1 }
}

/** Builds its sprites up front (under the fade into the forest). */
export function warmThing() {
  for (const s of [0, 1]) {
    frontSprite(s, false)
    frontSprite(s, true)
    thingSprite(s)
  }
}
