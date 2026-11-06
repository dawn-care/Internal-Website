import { HENS, LAY_HOUR } from '../shared/catalog'
import type { Dir, Save } from '../shared/schema'
import { NEST_SLOTS, TS, outlineCanvas, pen } from './art'
import { DAY_MS, HOUR_MS } from './clock'
import { HENHOUSE, T, groundAt, hash, type GameMap } from './maps'
import type { PetPose } from './pets'

/*
 * The animals on the property: hens in the henhouse run (and their eggs), ducks on the pond,
 * squirrels by the trees, butterflies over the flowers by day, fireflies at night, and Mittens
 * the house cat napping in the sun. Where they are comes from the shared game clock, so every
 * player sees the same thing without any syncing. Only eggs touch the save (each player collects
 * their own, see eggsLeft). Squirrels dart up their tree when someone comes close; that part is
 * worked out in each browser.
 */

type Ctx = CanvasRenderingContext2D
type Pen = ReturnType<typeof pen>

export interface Drawable {
  y: number
  draw: () => void
}

// --- eggs ----------------------------------------------------------------------------------

/** The egg day: game days since the epoch, starting at LAY_HOUR (when the hens lay). */
export function eggDay(now: number): number {
  return Math.floor((now - LAY_HOUR * HOUR_MS) / DAY_MS)
}

/** How many of today's eggs are still waiting in the nests for this player. */
export function eggsLeft(save: Save, now: number): number {
  const day = eggDay(now)
  return HENS - (save.coop?.day === day ? save.coop.taken : 0)
}

/** The hens are out in the run from 6 am to 8 pm, and in the coop overnight. */
export function hensOut(hour: number): boolean {
  return hour >= 6 && hour < 20
}

// --- sprites -------------------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>()

function sprite(key: string, w: number, h: number, draw: (f: Pen) => void, outline = true) {
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')!
  draw(pen(c))
  if (outline) outlineCanvas(c, w, h, [0x2b, 0x1d, 0x22])
  cache.set(key, cv)
  return cv
}

function mirrored(src: HTMLCanvasElement, key: string): HTMLCanvasElement {
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = src.width
  cv.height = src.height
  const c = cv.getContext('2d')!
  c.translate(src.width, 0)
  c.scale(-1, 1)
  c.drawImage(src, 0, 0)
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

const HEN_COATS = [
  { base: '#f7f2e8', dark: '#d8cdb8', wing: '#e8dfcc' },
  { base: '#b8642c', dark: '#88441b', wing: '#9c5223' },
  { base: '#8f8f98', dark: '#66666e', wing: '#7a7a84', speck: '#e6e6ea' },
]

/** A hen, 13×12, facing right (left mirrored). frame: 0 stand, 1 step, 2 pecking. */
function hen(coat: number, frame: number, left: boolean): HTMLCanvasElement {
  const key = `hen${coat}|${frame}`
  const right = sprite(key, 13, 12, (f) => {
    const col = HEN_COATS[coat % HEN_COATS.length]
    const peck = frame === 2
    // Legs.
    f('#e8a33a', 5, 9, 1, 3)
    f('#e8a33a', frame === 1 ? 8 : 7, 9, 1, 3)
    // Tail feathers, body, wing.
    f(col.dark, 1, 3, 2, 4)
    f(col.base, 2, 2, 2, 4)
    disc(f, 6, 7, 4.5, 3, col.base)
    disc(f, 5.5, 7, 2.6, 1.8, col.wing)
    f(col.dark, 3, 9, 6, 1)
    if (col.speck)
      for (const [x, y] of [
        [4, 6],
        [7, 8],
        [6, 5],
        [3, 8],
      ])
        f(col.speck, x, y, 1, 1)
    // Head: up, or down pecking at the ground.
    const hy = peck ? 7 : 3.5
    const hx = peck ? 10.5 : 9.5
    disc(f, hx, hy, 2, 2, col.base)
    f('#e0403a', Math.round(hx) - 1, Math.round(hy) - 3, 2, 2)
    f('#e0403a', Math.round(hx), Math.round(hy) + 1, 1, 2)
    f('#f0a830', Math.round(hx) + 2, Math.round(hy), 1, 1)
    f('#1c1418', Math.round(hx), Math.round(hy) - 1, 1, 1)
  })
  return left ? mirrored(right, `${key}|L`) : right
}

/** A duck on the water (only the top shows), facing right. */
function duck(big: boolean, dip: boolean, left: boolean): HTMLCanvasElement {
  const key = `duck${big}|${dip}`
  const right = sprite(key, big ? 14 : 8, big ? 10 : 7, (f) => {
    if (big) {
      disc(f, 6, 6.5, 5.5, 2.6, '#9a7048')
      disc(f, 5.5, 6, 3.5, 1.6, '#b98a5e')
      for (const [x, y] of [
        [3, 6],
        [6, 5],
        [8, 7],
        [4, 7],
      ])
        f('#6e4c2e', x, y, 1, 1)
      f('#6e4c2e', 1, 4, 2, 2)
      if (dip) {
        f('#9a7048', 10, 6, 3, 2)
        f('#e89a2e', 12, 7, 2, 1)
      } else {
        disc(f, 10.5, 2.8, 2, 2, '#8a6440')
        f('#9a7048', 10, 4, 2, 3)
        f('#e89a2e', 12, 3, 2, 1)
        f('#1c1418', 11, 2, 1, 1)
        f('#e6d6b8', 9, 3, 1, 1)
      }
    } else {
      disc(f, 3.5, 4.5, 3, 1.8, '#ffd84a')
      f('#e8b830', 1, 5, 4, 1)
      if (!dip) {
        disc(f, 5.5, 2.2, 1.5, 1.5, '#ffe266')
        f('#e89a2e', 7, 2, 1, 1)
        f('#1c1418', 6, 1, 1, 1)
      } else f('#ffe266', 6, 4, 2, 1)
    }
  })
  return left ? mirrored(right, `${key}|L`) : right
}

/** A squirrel, 11×10, facing right. frame 1 is mid-hop. */
function squirrel(frame: number, left: boolean): HTMLCanvasElement {
  const key = `squirrel${frame}`
  const right = sprite(key, 11, 10, (f) => {
    const y = frame === 1 ? -1 : 0
    // Big bushy tail curling up behind.
    disc(f, 2.5, 4 + y, 2.5, 3.5, '#b06a36')
    f('#cf8a52', 1, 2 + y, 2, 2)
    disc(f, 6, 7 + y, 3, 2.2, '#9a5a2e')
    f('#ead2a8', 6, 7 + y, 3, 2)
    disc(f, 8.5, 4.5 + y, 2, 1.8, '#9a5a2e')
    f('#9a5a2e', 8, 2 + y, 1, 2)
    f('#1c1418', 9, 4 + y, 1, 1)
    f('#3a2416', 10, 5 + y, 1, 1)
    f('#7a4422', 5, 9 + y, 1, 1)
    f('#7a4422', 8, 9 + y, 1, 1)
  })
  return left ? mirrored(right, `${key}|L`) : right
}

/** A little brown egg (for the basket, the Kitchen and the nest boxes). */
export function eggIcon(size = 24): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = 10
  cv.height = 12
  cv.style.width = `${(size * 10) / 12}px`
  cv.style.height = `${size}px`
  cv.style.imageRendering = 'pixelated'
  const f = pen(cv.getContext('2d')!)
  drawEgg(f, 1, 1)
  return cv
}

function drawEgg(f: Pen, x: number, y: number) {
  disc(f, x + 4, y + 5.5, 3.6, 4.6, '#7a5232')
  disc(f, x + 4, y + 5.5, 3, 4, '#e8c69a')
  disc(f, x + 3, y + 4, 1.2, 1.6, '#fbe8cc')
}

// --- the cast ------------------------------------------------------------------------------

interface Squirrel {
  /** Base of its tree. */
  tx: number
  ty: number
  seed: number
  /** Game-clock ms until which it stays up the tree. */
  upUntil: number
  peek: number
}

interface Butterfly {
  x: number
  y: number
  seed: number
  color: string
}

const BUTTERFLY_COLORS = ['#ffd23a', '#ffffff', '#ff8fc4', '#8fd0ff', '#ff9a3c', '#c79bff']

/** Plays an animal noise at a volume (0–1) and stereo position (-1 left … 1 right). */
export type PlaySound = (
  clip: 'cluck' | 'quack' | 'rooster' | 'chitter',
  volume: number,
  pan: number,
) => void

/** How loud something at (x, y) is from the listener: fades out by `range` tiles, panned. */
function heard(l: { x: number; y: number }, x: number, y: number, range: number) {
  const d = Math.hypot(x - l.x, y - l.y)
  return {
    volume: Math.pow(Math.max(0, 1 - d / range), 1.3),
    pan: Math.max(-1, Math.min(1, (x - l.x) / 8)),
  }
}

export class Wildlife {
  private nextCluck = 0
  private nextQuack = 0
  private lastHour = -1
  private squirrels: Squirrel[] = []
  private butterflies: Butterfly[] = []
  private fireflies: { x: number; y: number; seed: number }[] = []
  private duckBed = { x: 34.5, y: 28.5 }
  private pond = { x: 40.2, y: 29.3, rx: 3.2, ry: 1.7 }

  constructor(map: GameMap) {
    // Squirrels live by three leafy trees away from the edges.
    const trees = map.objects
      .filter((o) => o.k === 'tree' && o.x > 2 && o.x < map.w - 3 && o.y > 2 && o.y < map.h - 3)
      .sort((a, b) => hash(a.x, a.y, 901) - hash(b.x, b.y, 901))
    for (const t of trees) {
      if (this.squirrels.length >= 3) break
      if (this.squirrels.some((s) => Math.hypot(s.tx - t.x, s.ty - t.y) < 8)) continue
      this.squirrels.push({
        tx: t.x + 0.5,
        ty: t.y + 0.9,
        seed: t.x * 31 + t.y,
        upUntil: 0,
        peek: 0,
      })
    }
    // Butterflies each keep to a flower patch; fireflies hang about the pond and the garden.
    const flowers: { x: number; y: number }[] = []
    for (let y = 2; y < map.h - 2; y++)
      for (let x = 2; x < map.w - 2; x++)
        if (groundAt(map, x, y) === T.FLOWERS && !map.solid[y * map.w + x]) flowers.push({ x, y })
    flowers.sort((a, b) => hash(a.x, a.y, 902) - hash(b.x, b.y, 902))
    for (const fl of flowers) {
      if (this.butterflies.length >= 9) break
      if (this.butterflies.some((b) => Math.hypot(b.x - fl.x, b.y - fl.y) < 5)) continue
      const n = this.butterflies.length
      this.butterflies.push({
        x: fl.x + 0.5,
        y: fl.y + 0.5,
        seed: n * 17 + 3,
        color: BUTTERFLY_COLORS[n % BUTTERFLY_COLORS.length],
      })
    }
    for (let i = 0; i < 18; i++) {
      const pondSide = i < 10
      this.fireflies.push({
        x: pondSide ? 33 + hash(i, 1, 903) * 13 : 4 + hash(i, 2, 903) * 24,
        y: pondSide ? 23 + hash(i, 3, 903) * 12 : 20 + hash(i, 4, 903) * 14,
        seed: i,
      })
    }
    // The ducks sleep on the sand on the pond's west shore.
    let best = Infinity
    for (let y = 0; y < map.h; y++)
      for (let x = 0; x < map.w; x++) {
        if (groundAt(map, x, y) !== T.SAND || groundAt(map, x + 1, y) !== T.WATER) continue
        const d = Math.hypot(x - 34, y - 29)
        if (d < best) {
          best = d
          this.duckBed = { x: x + 0.4, y: y + 0.7 }
        }
      }
  }

  /**
   * Squirrels dart up their tree (chittering) when anyone or any pet comes within 2.5 tiles.
   * threats[0] is the listener (you).
   */
  update(now: number, threats: { x: number; y: number }[], play?: PlaySound) {
    for (const s of this.squirrels) {
      const p = this.squirrelSpot(s, now)
      if (threats.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 2.5)) {
        if (s.upUntil < now) {
          s.peek = hash(s.seed, Math.floor(now / 1000), 904) < 0.5 ? -1 : 1
          if (play && threats[0]) {
            const h = heard(threats[0], s.tx, s.ty, 10)
            play('chitter', h.volume, h.pan)
          }
        }
        s.upUntil = now + 6000
      }
    }
  }

  /**
   * Animal noises, called every frame: hens clucking in the run and ducks quacking on the pond
   * now and then (louder the closer you are), and the rooster crowing as the hens come out at
   * 6 am (it carries across the grounds, and you hear it faintly indoors). `listener` is your
   * position on the grounds, or null when you're inside.
   */
  sounds(now: number, hour: number, listener: { x: number; y: number } | null, play: PlaySound) {
    const real = performance.now()
    if (this.lastHour >= 0 && this.lastHour < 6 && hour >= 6 && hour < 6.5) {
      const coop = HENHOUSE.coop
      if (listener) {
        const h = heard(listener, coop.x + coop.w / 2, coop.y + coop.h, 45)
        play('rooster', Math.max(0.35, h.volume), h.pan)
      } else play('rooster', 0.15, 0)
    }
    this.lastHour = hour
    if (!listener) return
    if (real >= this.nextCluck) {
      this.nextCluck = real + 4000 + Math.random() * 6000
      if (hensOut(hour)) {
        const yard = HENHOUSE.yard
        const h = heard(listener, (yard.x0 + yard.x1) / 2, (yard.y0 + yard.y1) / 2, 14)
        play('cluck', h.volume, h.pan)
      }
    }
    if (real >= this.nextQuack) {
      this.nextQuack = real + 5000 + Math.random() * 6000
      if (hour >= 6 && hour < 21) {
        const a = (now / 60_000) * Math.PI * 2
        const h = heard(
          listener,
          this.pond.x + Math.cos(a) * this.pond.rx,
          this.pond.y + Math.sin(a) * this.pond.ry,
          16,
        )
        play('quack', h.volume, h.pan)
      }
    }
  }

  private squirrelSpot(s: Squirrel, now: number) {
    // Hops between spots round the tree: a short hop, then a sit and a tail flick.
    const SEG = 2600
    const k = Math.floor((now + s.seed * 97) / SEG)
    const t = ((now + s.seed * 97) % SEG) / SEG
    const spot = (n: number) => {
      const a = hash(s.seed, n, 905) * Math.PI * 2
      const r = 0.9 + hash(n, s.seed, 906) * 1.3
      return { x: s.tx + Math.cos(a) * r, y: s.ty + 0.4 + Math.abs(Math.sin(a)) * r * 0.8 }
    }
    const a = spot(k)
    const b = spot(k + 1)
    const m = Math.min(1, t / 0.25)
    return {
      x: a.x + (b.x - a.x) * m,
      y: a.y + (b.y - a.y) * m,
      hopping: t < 0.25,
      left: b.x < a.x,
    }
  }

  /** Everything that stands on the ground, as y-sorted drawables for the grounds. */
  collect(
    list: Drawable[],
    c: Ctx,
    ox: number,
    oy: number,
    now: number,
    hour: number,
    eggs: number,
  ) {
    const at = (x: number, y: number) => ({
      px: Math.round(x * TS + ox),
      py: Math.round(y * TS + oy),
    })
    const shadow = (px: number, py: number, w: number) => {
      c.fillStyle = 'rgba(0,0,0,0.16)'
      c.fillRect(px - w / 2, py - 1, w, 2)
    }

    // Eggs in the nest boxes (this player's share), drawn over the coop.
    const coop = HENHOUSE.coop
    if (eggs > 0) {
      const base = at(coop.x, coop.y)
      list.push({
        y: (coop.y + coop.h) * TS + 0.5,
        draw: () => {
          const f = pen(c)
          for (let i = 0; i < Math.min(eggs, NEST_SLOTS.length); i++) {
            const n = NEST_SLOTS[i]
            f('#e8c860', base.px + n.x - 1, base.py + n.y - 1, 8, 2)
            drawEgg(f, base.px + n.x - 1, base.py + n.y - 9)
          }
        },
      })
    }

    // Hens wander the run by day, stopping to peck.
    if (hensOut(hour)) {
      const yard = HENHOUSE.yard
      for (let i = 0; i < HENS; i++) {
        const SEG = 3200
        const k = Math.floor((now + i * 1170) / SEG)
        const t = ((now + i * 1170) % SEG) / SEG
        const spot = (n: number) => ({
          x: yard.x0 + hash(i, n, 907) * (yard.x1 - yard.x0),
          y: yard.y0 + hash(n, i, 908) * (yard.y1 - yard.y0),
        })
        const a = spot(k)
        const b = spot(k + 1)
        const m = Math.min(1, t / 0.4)
        const x = a.x + (b.x - a.x) * m
        const y = a.y + (b.y - a.y) * m
        const walking = t < 0.4
        const frame = walking
          ? Math.floor(now / 160) % 2
          : Math.floor(now / 380 + i) % 3 === 0
            ? 2
            : 0
        list.push({
          y: y * TS,
          draw: () => {
            const p = at(x, y)
            shadow(p.px, p.py, 9)
            c.drawImage(hen(i, frame, b.x < a.x), p.px - 6, p.py - 11)
          },
        })
      }
    }

    // Ducks: a mother and three ducklings paddling a loop by day, asleep on the sand at night.
    const night = hour >= 21 || hour < 6
    for (let i = 0; i < 4; i++) {
      const big = i === 0
      let x: number
      let y: number
      let left = false
      let dip = false
      if (night) {
        x = this.duckBed.x + [0, 0.7, 0.35, 1.05][i]
        y = this.duckBed.y + [0, 0.15, 0.45, 0.4][i]
      } else {
        const a = (now / 60_000) * Math.PI * 2 - i * 0.32
        x = this.pond.x + Math.cos(a) * this.pond.rx
        y = this.pond.y + Math.sin(a) * this.pond.ry
        left = Math.sin(a) > 0
        dip = hash(i, Math.floor(now / 2200), 909) < 0.12
      }
      const bob = night ? 0 : Math.round(Math.sin(now / 400 + i) * 0.6)
      list.push({
        y: y * TS - 2,
        draw: () => {
          const p = at(x, y)
          const spr = duck(big, dip, left)
          if (!night) {
            // A little wake on the water.
            c.fillStyle = 'rgba(220,240,255,0.55)'
            c.fillRect(p.px - spr.width / 2 + (left ? spr.width - 2 : -2), p.py - 1, 3, 1)
          } else shadow(p.px, p.py, spr.width - 2)
          c.drawImage(spr, p.px - spr.width / 2, p.py - spr.height + 1 + bob)
          if (night && big) {
            const t = (now / 1800) % 1
            c.fillStyle = `rgba(59,63,128,${0.8 * (1 - t)})`
            c.fillRect(p.px + 4 + Math.round(t * 3), p.py - 12 - Math.round(t * 6), 2, 1)
          }
        },
      })
    }

    // Squirrels: on the ground, or a face peeking round the trunk after a fright.
    for (const s of this.squirrels) {
      if (s.upUntil > now) {
        list.push({
          y: s.ty * TS,
          draw: () => {
            const p = at(s.tx, s.ty)
            if (Math.floor(now / 900) % 3 === 0) return
            const spr = squirrel(0, s.peek < 0)
            c.drawImage(spr, p.px - 5 + s.peek * 5, p.py - 30, 11, 6)
          },
        })
        continue
      }
      if (night) continue
      const q = this.squirrelSpot(s, now)
      list.push({
        y: q.y * TS,
        draw: () => {
          const p = at(q.x, q.y)
          shadow(p.px, p.py, 7)
          c.drawImage(squirrel(q.hopping ? 1 : 0, q.left), p.px - 5, p.py - 9)
        },
      })
    }

    // Butterflies over the flowers, by day.
    if (hour >= 7 && hour < 19) {
      for (const b of this.butterflies) {
        const t = now / 1000
        const x = b.x + Math.sin(t * 0.7 + b.seed) * 1.6 + Math.sin(t * 1.9 + b.seed * 2) * 0.4
        const y = b.y + Math.cos(t * 0.5 + b.seed) * 1.1
        const lift = 7 + Math.round(Math.sin(t * 2.3 + b.seed) * 2)
        const open = Math.floor(now / 110 + b.seed) % 2 === 0
        list.push({
          y: y * TS,
          draw: () => {
            const p = at(x, y)
            c.fillStyle = 'rgba(0,0,0,0.1)'
            c.fillRect(p.px - 1, p.py, 3, 1)
            const f = pen(c)
            const by = p.py - lift
            f('#3a2a20', p.px, by - 1, 1, 3)
            if (open) {
              f(b.color, p.px - 2, by - 2, 2, 2)
              f(b.color, p.px + 1, by - 2, 2, 2)
              f(b.color, p.px - 1, by, 1, 1)
              f(b.color, p.px + 1, by, 1, 1)
            } else {
              f(b.color, p.px - 1, by - 2, 1, 2)
              f(b.color, p.px + 1, by - 2, 1, 2)
            }
          },
        })
      }
    }
  }

  /** Fireflies blinking at night: drawn with the night glows (after the dark tint). */
  glow(c: Ctx, ox: number, oy: number, now: number, k: number) {
    if (k < 0.5) return
    for (const f of this.fireflies) {
      const t = now / 1000
      const blink = Math.sin(t * 1.3 + f.seed * 2.1)
      if (blink < 0.35) continue
      const a = (blink - 0.35) / 0.65
      const x = Math.round((f.x + Math.sin(t * 0.21 + f.seed) * 1.2) * TS + ox)
      const y = Math.round((f.y + Math.cos(t * 0.17 + f.seed) * 0.8) * TS + oy - 8)
      const g = c.createRadialGradient(x, y, 0, x, y, 6)
      g.addColorStop(0, `rgba(220,255,140,${0.8 * a * k})`)
      g.addColorStop(1, 'rgba(220,255,140,0)')
      c.fillStyle = g
      c.fillRect(x - 6, y - 6, 12, 12)
      c.fillStyle = `rgba(250,255,200,${a * k})`
      c.fillRect(x, y, 1, 1)
    }
  }
}

// --- Mittens, the house cat ----------------------------------------------------------------

export const HOUSE_CAT = { kind: 'cat' as const, coat: 0, name: 'Mittens' }

/** Where Mittens naps, by game hour: she follows the sun round the grounds and sleeps inside. */
const CAT_SPOTS: { from: number; map: 'grounds' | 'hall'; x: number; y: number }[] = [
  { from: 7, map: 'grounds', x: 20.4, y: 12.5 }, // the plaza, morning sun
  { from: 10, map: 'grounds', x: 12.6, y: 18.4 }, // the path by the garden gate
  { from: 14, map: 'grounds', x: 39.3, y: 17.6 }, // outside the Kitchen (it smells good)
  { from: 18, map: 'grounds', x: 26.6, y: 11.6 }, // the warm front step
  { from: 21, map: 'hall', x: 8.5, y: 6.5 }, // indoors for the night
]

/** Mittens right now: which map, where, and whether she's strolling to her next spot. */
export function houseCat(now: number, hour: number) {
  const h = (hour + 24 - 7) % 24 // hours since 7 am
  let i = CAT_SPOTS.length - 1
  for (let j = 0; j < CAT_SPOTS.length; j++) if ((CAT_SPOTS[j].from + 24 - 7) % 24 <= h) i = j
  const spot = CAT_SPOTS[i]
  const prev = CAT_SPOTS[(i + CAT_SPOTS.length - 1) % CAT_SPOTS.length]
  const since = h - ((spot.from + 24 - 7) % 24)
  // The first half game hour after a change she strolls over (on the grounds only).
  if (since < 0.5 && prev.map === spot.map) {
    const t = since / 0.5
    const x = prev.x + (spot.x - prev.x) * t
    const y = prev.y + (spot.y - prev.y) * t
    const dir: Dir =
      Math.abs(spot.x - prev.x) > Math.abs(spot.y - prev.y)
        ? spot.x < prev.x
          ? 1
          : 2
        : spot.y < prev.y
          ? 3
          : 0
    return { map: spot.map, x, y, pose: 'walk' as PetPose, dir, frame: Math.floor(now / 140) % 4 }
  }
  return { map: spot.map, x: spot.x, y: spot.y, pose: 'sleep' as PetPose, dir: 0 as Dir, frame: 0 }
}
