import type { Dir } from '../../shared/schema'
import { pen } from '../art'
import {
  ARM_FROM,
  EYES_APPROACH,
  EYES_BEYOND,
  EYES_CATCH,
  EYES_CREEP,
  EYES_FALSE_NEAR,
  EYES_MS,
  EYES_RETREAT,
  FACE_DOT,
  FACE_ALPHA,
  FIGURE_ALPHA,
  FALSE_ALARM,
  STALK_EXTRA_STEPS,
  STALK_FALSE_S,
  STALK_FAR,
  STALK_LAG,
  STALK_NEAR,
  STALK_S,
  THREAT_DEEP_FASTER,
  THREAT_EVERY,
  THREAT_LOST_EVERY,
  THREAT_LOST_FIRST,
  THREAT_FIRST,
} from './tuning'

/*
 * Threats between encounters (FOREST.md "Threats"): things that can catch you, each with a cue
 * you can learn. Some cues are false alarms, so you can never safely ignore one.
 *
 * - Footsteps behind you. Rule: turn round. They fall a beat after yours and stop a beat after
 *   you stop. Keep walking without facing them and they close in, until an arm reaches into your
 *   light from behind. Turn in time and it's gone; turn once the arm is in sight and it snatches
 *   your breath as it goes (your stamina); don't turn at all and it has you.
 * - Eyes in the dark. Rule: never walk towards them. They open just beyond your light. Back away
 *   and they close. Walk towards them and it takes some of your light; keep coming and it has you.
 *
 * Everything here runs in your own browser only, like the rest of the forest.
 */

export interface ThreatHost {
  readonly me: { x: number; y: number; dir: Dir; moving: boolean }
  /** Your light's radius now, in tiles. */
  lightTiles(): number
  /** How far you can see on screen from where you stand (half the view, in tiles). */
  view(): { w: number; h: number }
  blocked(x: number, y: number): boolean
  /** A footstep on the leaves at (x, y), at this loudness. */
  step(x: number, y: number, volume: number): void
  /** A soft sound as something gives itself away (eyes opening, an arm drawing back). */
  sound(kind: 'eyes' | 'snatch', x: number, y: number): void
  /** Its breath, close behind you, while the arm reaches in (on), stopping when it's over (off). */
  breath(on: boolean, x: number, y: number): void
  /** Nothing else is going on (no one talking to you, no chase, the trip isn't ending). */
  quiet(): boolean
  /** How deep you are (0–1) and whether you're lost: threats come more often. */
  deepness(): number
  lost(): boolean
  /** It has you. */
  caught(line: string): void
  /** The smaller harms: some of your light, or your breath (stamina). */
  takeLight(): void
  takeBreath(): void
  /** Whether this trip can still have a real danger (one at most), and using it up. */
  danger(): boolean
  spendDanger(): void
  /** Something real is starting (never a false alarm): a gut feeling, sometimes. */
  realStarting(): void
}

const DIRS: Record<Dir, { x: number; y: number }> = {
  0: { x: 0, y: 1 },
  1: { x: -1, y: 0 },
  2: { x: 1, y: 0 },
  3: { x: 0, y: -1 },
}

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a)

export interface Stalker {
  kind: 'steps'
  real: boolean
  /** From you to it (a unit vector, fixed in the world when it starts: behind you). */
  v: { x: number; y: number }
  /** Which way you'd face to face it. */
  dir: Dir
  /** How close it is (0 far off, 1 it has you). */
  near: number
  t: number
  /** Time until its next step, and how many it'll take after you stop. */
  nextStep: number
  extra: number
  /** You can hear it breathing (once the arm is reaching in). */
  breathing: boolean
}

export interface Eyes {
  kind: 'eyes'
  real: boolean
  x: number
  y: number
  /** How far away you were when they opened. */
  d0: number
  t: number
  /** Closing (ms since they began to), or 0. */
  closing: number
  /** They've already taken some of your light. */
  took: boolean
  /** How far you've walked towards it (tiles, net), and where you were last frame. */
  toward: number
  lx: number
  ly: number
}

export type Threat = Stalker | Eyes

export class Threats {
  now: Threat | null = null
  private next = between(THREAT_FIRST)
  private last: Threat['kind'] | null = null
  private wasLost = false

  constructor(private host: ThreatHost) {}

  /** Something comes within `ms` (the bus ride). */
  soon(ms: number) {
    if (!this.now) this.next = Math.min(this.next, ms)
  }

  /** Whether something is happening (no encounters start, and no collapse, until it's over). */
  busy(): boolean {
    return !!this.now
  }

  update(dt: number) {
    const ms = dt * 1000
    if (!this.now) {
      if (this.host.lost() && !this.wasLost) {
        this.wasLost = true
        this.next = Math.min(this.next, between(THREAT_LOST_FIRST))
      }
      // Sooner the deeper you are and once you're lost.
      const faster =
        1 - THREAT_DEEP_FASTER * Math.max(this.host.deepness(), this.host.lost() ? 1 : 0)
      this.next -= ms / faster
      if (this.next <= 0 && this.host.quiet()) this.start()
      return
    }
    if (!this.host.quiet() && this.now.kind === 'eyes') return this.end()
    if (this.now.kind === 'steps') this.updateStalker(this.now, dt)
    else this.updateEyes(this.now, dt)
  }

  private start() {
    // Never the same kind twice running.
    const kind: Threat['kind'] =
      this.last === 'steps'
        ? 'eyes'
        : this.last === 'eyes'
          ? 'steps'
          : Math.random() < 0.5
            ? 'steps'
            : 'eyes'
    this.last = kind
    // Real only while the trip's danger isn't used up: after that, every cue is only a cue.
    const real = Math.random() >= FALSE_ALARM && this.host.danger()
    if (real) {
      this.host.spendDanger()
      this.host.realStarting()
    }
    const me = this.host.me
    if (kind === 'steps') {
      // Behind you: the opposite of the way you're facing.
      const f = DIRS[me.dir]
      const back = ([3, 2, 1, 0] as Dir[])[me.dir]
      this.now = {
        kind,
        real,
        v: { x: -f.x, y: -f.y },
        dir: back,
        near: 0,
        t: 0,
        nextStep: STALK_LAG,
        extra: STALK_EXTRA_STEPS,
        breathing: false,
      }
      return
    }
    // The eyes: somewhere ahead of you or to the side, just beyond your light, where a body fits.
    const want = this.host.lightTiles() + EYES_BEYOND
    const view = this.host.view()
    const f = DIRS[me.dir]
    const base = Math.atan2(f.y, f.x)
    for (let i = 0; i < 30; i++) {
      const a = base + (Math.random() * 2 - 1) * 1.1
      // Just beyond your light, but always on screen and clear of the HUD (its boxes along the
      // top, the hotbar along the bottom).
      const edge = Math.min(
        (view.w - 2) / Math.max(0.01, Math.abs(Math.cos(a))),
        (view.h - 3.5) / Math.max(0.01, Math.abs(Math.sin(a))),
      )
      const r = Math.min(want, edge)
      const x = me.x + Math.cos(a) * r
      const y = me.y + Math.sin(a) * r
      if (this.host.blocked(x, y)) continue
      if (r < this.host.lightTiles() * 0.8) continue
      this.now = {
        kind,
        real,
        x,
        y,
        d0: r,
        t: 0,
        closing: 0,
        took: false,
        toward: 0,
        lx: me.x,
        ly: me.y,
      }
      this.host.sound('eyes', x, y)
      return
    }
    this.end()
  }

  private end() {
    if (this.now?.kind === 'steps' && this.now.breathing) {
      const at = this.stalkerAt(this.now)
      this.host.breath(false, at.x, at.y)
    }
    this.now = null
    this.next = between(this.host.lost() ? THREAT_LOST_EVERY : THREAT_EVERY)
  }

  // --- footsteps behind you -----------------------------------------------------------------

  /** Where its steps come from (and where the arm reaches in from). */
  stalkerAt(s: Stalker): { x: number; y: number } {
    const me = this.host.me
    const d = STALK_FAR - (STALK_FAR - STALK_NEAR) * s.near
    return { x: me.x + s.v.x * d, y: me.y + s.v.y * d }
  }

  private updateStalker(s: Stalker, dt: number) {
    s.t += dt
    const me = this.host.me
    const f = DIRS[me.dir]
    const facing = f.x * s.v.x + f.y * s.v.y > FACE_DOT
    if (facing) {
      // You turned round. Too late, and it takes your breath as it goes.
      if (s.real && s.near >= ARM_FROM) {
        this.host.takeBreath()
        const at = this.stalkerAt(s)
        this.host.sound('snatch', at.x, at.y)
      }
      return this.end()
    }
    if (!s.real) {
      if (s.t > STALK_FALSE_S) return this.end()
    } else {
      s.near = Math.min(1, s.near + dt / STALK_S)
      if (s.near >= ARM_FROM && !s.breathing) {
        // The arm comes into your light, and you hear it breathing, right behind you.
        s.breathing = true
        const at = this.stalkerAt(s)
        this.host.breath(true, at.x, at.y)
      }
      if (s.near >= 1) {
        this.end()
        return this.host.caught('It was right behind you.')
      }
    }
    // Its steps: a beat after yours while you walk, then one more after you stop, then silence.
    s.nextStep -= dt
    if (me.moving) s.extra = STALK_EXTRA_STEPS
    if (s.nextStep <= 0 && (me.moving || s.extra > 0)) {
      if (!me.moving) s.extra--
      const at = this.stalkerAt(s)
      this.host.step(at.x, at.y, 0.45 + 0.55 * s.near)
      s.nextStep = 0.42 + STALK_LAG * (me.moving ? 0 : 1)
    }
  }

  // --- the eyes -----------------------------------------------------------------------------

  private updateEyes(e: Eyes, dt: number) {
    const ms = dt * 1000
    e.t += ms
    if (e.closing) {
      e.closing += ms
      if (e.closing > 700) this.end()
      return
    }
    const me = this.host.me
    let d = Math.hypot(e.x - me.x, e.y - me.y)
    // How much of your last step was towards it.
    if (d > 0.01) {
      const step = ((me.x - e.lx) * (e.x - me.x) + (me.y - e.ly) * (e.y - me.y)) / d
      e.toward = Math.max(0, e.toward + step)
    }
    e.lx = me.x
    e.ly = me.y
    // It drifts towards you, slowly, through the trees (it was never quite standing on the ground).
    if (d > EYES_CATCH * 0.8) {
      const k = Math.min(1, (EYES_CREEP * dt) / d)
      e.x += (me.x - e.x) * k
      e.y += (me.y - e.y) * k
      d = Math.hypot(e.x - me.x, e.y - me.y)
    }
    // Got away from it (it couldn't keep up), or it's given up.
    if (d > e.d0 + EYES_RETREAT || e.t > EYES_MS) {
      e.closing = 1
      return
    }
    // Only a cue: it gets so close, then isn't there.
    if (!e.real) {
      if (d < EYES_FALSE_NEAR || e.toward > EYES_APPROACH) e.closing = 1
      return
    }
    // Walking towards it: it takes some of your light.
    if (e.toward > EYES_APPROACH && !e.took) {
      e.took = true
      this.host.takeLight()
    }
    if (d < EYES_CATCH) {
      this.end()
      return this.host.caught(
        e.toward > EYES_APPROACH
          ? 'You should never have gone closer.'
          : 'It was so slow. You should have kept away from it.',
      )
    }
  }
}

// --- the art (drawn over the darkness, so you see it out in the dark) ----------------------------
//
// The forest's own creatures, in a stark style: almost nothing of the body, and white features
// that catch what little light there is. Drawn in code like the rest of the game, cached.

type Pen = ReturnType<typeof pen>

/** A filled ellipse, row by row. */
function oval(f: Pen, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry
    if (Math.abs(dy) > 1) continue
    const half = rx * Math.sqrt(1 - dy * dy)
    const x0 = Math.round(cx - half)
    const x1 = Math.round(cx + half)
    if (x1 > x0) f(color, x0, y, x1 - x0, 1)
  }
}

/** Steady pseudo-random numbers for the art (the same every time it's drawn). */
const rnd = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The face's colours: its teeth and its eyes, muted so it doesn't stand out from the dark. */
const FACE_LIT = '#77746e'
const FACE_EYE = '#8a877f'
export const FACE_W = 18
export const FACE_H = 20
const faceCache = new Map<string, HTMLCanvasElement>()

/**
 * The face in the dark: no head, nothing you could call a face, only what catches the light. Two
 * small pale eyes, set wide and not quite level, and under them a jagged grin of uneven teeth
 * hanging in the black, the upper ones pointing down, the lower ones up, interlocking. `open`: the
 * jaw drops and the teeth part (once it has taken some of your light, and when it has you).
 */
export function faceSprite(open: boolean): HTMLCanvasElement {
  const key = open ? 'open' : 'shut'
  let cv = faceCache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = FACE_W
  cv.height = FACE_H
  const f = pen(cv.getContext('2d')!)
  // Muted greys, not white: it should only just be there, the same murk as the dark round it.
  const lit = FACE_LIT
  const mid = '#5f5c57'
  const dim = '#383633'
  // The eyes: two small pale points, wide apart, one a pixel higher, each with a dim edge.
  f(FACE_EYE, 3, 2, 2, 2)
  f(dim, 3, 4, 2, 1)
  f(FACE_EYE, 13, 1, 2, 2)
  f(dim, 13, 3, 2, 1)
  // The grin: a row of teeth across, sloping a little, uneven heights, each lit on the left and
  // shaded on the right, tapering to a point. The lower row sits between the upper ones.
  const drop = open ? 4 : 0
  const upper = [
    [2, 3],
    [4, 4],
    [6, 2],
    [8, 4],
    [10, 3],
    [12, 4],
    [14, 2],
  ]
  for (const [x, h] of upper) {
    const y = 7 + (x > 9 ? 0 : 1)
    for (let k = 0; k < h; k++) {
      // Wide at the gum, a single pixel at the tip.
      const w = k < h - 1 ? 2 : 1
      f(lit, x, y + k, 1, 1)
      if (w === 2) f(k === 0 ? lit : mid, x + 1, y + k, 1, 1)
    }
  }
  const lower = [
    [3, 3],
    [5, 2],
    [7, 4],
    [9, 3],
    [11, 2],
    [13, 3],
  ]
  for (const [x, h] of lower) {
    const base = 14 + drop + (x > 9 ? 0 : 1)
    for (let k = 0; k < h; k++) {
      const w = k < h - 1 ? 2 : 1
      f(k === 0 ? mid : lit, x, base - k, 1, 1)
      if (w === 2) f(dim, x + 1, base - k, 1, 1)
    }
  }
  faceCache.set(key, cv)
  return cv
}

const FIG_W = 30
const FIG_H = 64
let figure: HTMLCanvasElement | null = null

/**
 * The shape the face belongs to: tall and thin, only just lighter than the night, with ragged,
 * dithered edges so it never has a clean outline. A head the face sits in, sloping shoulders, arms
 * hanging far too low, and a body that thins away into the dark.
 */
function figureSprite(): HTMLCanvasElement {
  if (figure) return figure
  const cv = document.createElement('canvas')
  cv.width = FIG_W
  cv.height = FIG_H
  const f = pen(cv.getContext('2d')!)
  const body = '#14121a'
  // Half-width of the shape at each row: head, neck, shoulders, a long body narrowing to nothing.
  const half = (y: number) => {
    if (y < 14) return 6.5 * Math.sqrt(Math.max(0, 1 - ((y - 7) / 7.5) ** 2))
    if (y < 17) return 3
    if (y < 22) return 3 + (y - 17) * 1.6
    return Math.max(0, 11 - (y - 22) * 0.24)
  }
  const cx = FIG_W / 2
  for (let y = 0; y < FIG_H; y++) {
    // It leans, a little, as if to look at you.
    const lean = Math.round((y / FIG_H) * 2)
    const w = half(y)
    for (let x = 0; x < FIG_W; x++) {
      const d = Math.abs(x + 0.5 - cx - lean) - w
      // Solid inside, a dithered fringe at the edge (and more ragged towards the bottom).
      const fringe = 1.5 + (y / FIG_H) * 2
      // Solid inside (breaking up only near the bottom), a sparse ragged fringe at the edge.
      if (d < 0 && (y < FIG_H * 0.7 || rnd(x, y + 20) > (y / FIG_H - 0.7) * 2)) f(body, x, y, 1, 1)
      else if (d < fringe && (x + y) % 2 === 0 && rnd(x, y) < 0.45 - y / FIG_H / 3)
        f(body, x, y, 1, 1)
    }
  }
  // The arms: hanging from the shoulders, thin, past where its knees would be.
  for (const side of [-1, 1]) {
    for (let y = 20; y < 52; y++) {
      const x = Math.round(cx + side * (11 + (y - 20) * 0.08))
      if (rnd(side + 5, y) < 0.85) f(body, x, y, 1, 1)
      if (y > 46) f(body, x + side, y, 1, 1)
    }
  }
  figure = cv
  return cv
}

/**
 * The face in the dark at (px, py), its centre: `fade` 0–1 (appearing and going), `open` once it
 * has taken some of your light. It sways very slightly, as if leaning to look at you.
 */
export function drawFace(
  c: CanvasRenderingContext2D,
  px: number,
  py: number,
  fade: number,
  open: boolean,
  time: number,
) {
  if (fade <= 0) return
  const sway = Math.round(Math.sin(time / 900) * 0.6)
  // Its shape first, barely there, the face sitting in its head.
  c.globalAlpha = fade * FIGURE_ALPHA
  c.drawImage(figureSprite(), Math.round(px - FIG_W / 2) + sway, Math.round(py - 9))
  c.globalAlpha = fade * FACE_ALPHA
  c.drawImage(faceSprite(open), Math.round(px - FACE_W / 2) + sway, Math.round(py - FACE_H / 2))
  c.globalAlpha = 1
}

const armCache = new Map<string, HTMLCanvasElement>()

/**
 * The arm, reaching right (rotate it to point anywhere): dark, wet flesh, too long, crooked where
 * it shouldn't bend, streaked and dripping with blood, with long clawed fingers. `len` px (cached
 * per 8 px), `twitch` 0 or 1 (it flexes as it reaches).
 */
export function armSprite(len: number, twitch: number): HTMLCanvasElement {
  const L = Math.max(16, Math.round(len / 8) * 8)
  const key = `${L}|${twitch}`
  let cv = armCache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = L + 16
  cv.height = 36
  const f = pen(cv.getContext('2d')!)
  const mid = 16
  const outline = '#050204'
  const flesh = '#22100f'
  const fleshL = '#3b1717'
  const sickly = '#6b4a44'
  const blood = '#7a0f14'
  const wet = '#b8282a'
  // Its line: a slow wave with sharp kinks, as if it bends in places it shouldn't.
  const line = (x: number) => {
    let y = Math.sin(x / 11 + twitch * 0.6) * 2
    for (const k of [0.3, 0.55, 0.8]) if (x > L * k) y += (rnd(Math.round(L * k), 3) - 0.5) * 4
    return mid + Math.round(y)
  }
  for (let x = 0; x < L; x++) {
    const y = line(x)
    // Uneven thickness: knotted, swollen in places, wasted in others.
    const th = 2 + Math.round(rnd(x >> 2, 4) * 2 + (x % 23 < 3 ? 1 : 0))
    f(outline, x, y - th - 1, 1, th * 2 + 3)
    f(flesh, x, y - th, 1, th * 2 + 1)
    // A sickly pale edge along the top, so the shape shows against the dark.
    f(fleshL, x, y - th, 1, 1)
    if (rnd(x, 11) < 0.5) f(sickly, x, y - th, 1, 1)
    // Streaks of blood, and a wet glint here and there along the top.
    if (rnd(x, 5) < 0.28) f(blood, x, y - th + 1 + Math.floor(rnd(x, 6) * th), 1, 2)
    if (rnd(x, 7) < 0.06) f(wet, x, y - th, 1, 1)
    // Drips hanging off the underside.
    if (rnd(x, 8) < 0.07) {
      const n = 2 + Math.floor(rnd(x, 9) * 5)
      f(blood, x, y + th + 1, 1, n)
      f(wet, x, y + th + n, 1, 1)
    }
  }
  // The hand: a big misshapen palm and four long, jointed, clawed fingers spread to grab you,
  // curling as it twitches, paler than the arm so you see it coming.
  const hx = L
  const hy = line(L - 1)
  oval(f, hx + 2, hy, 5, 6.5, outline)
  oval(f, hx + 2, hy, 4, 5.5, '#4a2a27')
  oval(f, hx + 1, hy + 1, 2.5, 3.5, flesh)
  f(blood, hx, hy - 2, 3, 2)
  f(wet, hx + 1, hy - 2, 1, 1)
  ;[-6, -2, 2, 6].forEach((dy, i) => {
    const reach = 11 + Math.floor(rnd(i, 10) * 5)
    const spread = dy * 0.18
    const curl = (twitch ? 0.4 : 0.1) * Math.sign(dy || 1)
    let y = hy + dy * 0.8
    for (let k = 0; k < reach; k++) {
      // A knuckle a third of the way along, and another two thirds: a bend at each.
      const bend = k > reach / 3 ? curl : 0
      y += spread + bend * (k > (reach * 2) / 3 ? 2 : 1) * 0.5
      const x = hx + 5 + k
      const yy = Math.round(y)
      const knuckle = k === Math.floor(reach / 3) || k === Math.floor((reach * 2) / 3)
      // Two pixels thick (three at the knuckles), tapering to a claw.
      const th = k > reach - 3 ? 1 : knuckle ? 3 : 2
      f(outline, x, yy - 1, 1, th + 2)
      f(k > reach - 3 ? '#0a0405' : '#4a2a27', x, yy, 1, th)
      if (k % 4 === 0 && th > 1) f(sickly, x, yy, 1, 1)
    }
  })
  // Blood running off the fingers.
  for (let k = 0; k < 3; k++) f(blood, hx + 8 + k * 4, hy + 7 + k, 1, 3 + k)
  armCache.set(key, cv)
  return cv
}

/** Draws the arm from (fx, fy) reaching `len` px towards (tx, ty) (screen px). */
export function drawArm(
  c: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  len: number,
  time: number,
) {
  if (len < 4) return
  const a = Math.atan2(ty - fy, tx - fx)
  const twitch = Math.floor(time / 170) % 3 === 0 ? 1 : 0
  const spr = armSprite(len, twitch)
  c.save()
  c.translate(Math.round(fx), Math.round(fy))
  c.rotate(a)
  c.drawImage(spr, 0, -16, Math.round(len) + 16, 36)
  c.restore()
}
