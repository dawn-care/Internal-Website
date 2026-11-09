import type { Look } from '../../../shared/schema'
import { outlineCanvas, pen } from '../../art'
import { SPR_W, personSprite, seatedSprite } from '../../people'
import { RIDE_BRAKE_MS, RIDE_CREW_MS, RIDE_EMPTY_MS } from '../tuning'

/*
 * Riding the Route 9 bus (PUZZLES.md P04), from inside: the aisle between the seats, the empty
 * driver's seat, the door at the front, and the forest going past the windows.
 *
 * - A crew run: the seats are full of the replayed crew, dozing against the windows with their
 *   lunch tins (copies: one man is in two seats). Nobody looks at you. It drives a while and lets
 *   you off at the camp gate.
 * - The empty bus: you ride alone, every seat empty, the lights cold and one of them flickering.
 *   It drives a long way, faster and faster, and lets you off deep in the forest, lost.
 *
 * (`thingSprite`, what a copy is when it stops pretending, was drawn for an earlier version of
 * the empty ride, where it got on at a stop and came down the aisle. Play-testing didn't like the
 * scene, but liked the creature: it's kept for later.)
 *
 * Drawn like a room: the back wall (with the windows) at the top, the floor below, at one pixel
 * per pixel, centred on the screen.
 */

const TS = 16
/** The bus inside, in tiles: its length, and the aisle's row. */
const LEN = 15
const AISLE = 3
/** Where you can stand in the aisle (the driver's cab in front, the back seat behind). */
const AISLE_MIN = 1
const AISLE_MAX = LEN - 1.6
/** Seat columns (both rows), behind the door. */
const SEATS = Array.from({ length: LEN - 4 }, (_, i) => i + 3)
const SPEED = 3.3
const HURRY = 5.2

export interface RideHost {
  sound(kind: 'brake' | 'doors'): void
  /** A crew run reached the camp gate. */
  arrive(): void
  /** The empty bus let you off: deep in, lost. */
  dropped(): void
}

type Phase = 'drive' | 'brake' | 'doors' | 'done'

interface Rider {
  col: number
  /** 0: the row along the windows, 1: the row by the door side. */
  row: 0 | 1
  look: Look
  doze: boolean
}

export class Ride {
  phase: Phase = 'drive'
  /** You, along the aisle (tiles from the front): a few steps in from the door. */
  x = 4
  dir: 1 | 2 = 2
  anim = 0
  private t = 0
  private speed = 9
  private scroll = 0
  private riders: Rider[] = []

  constructor(
    /** A crew run (safe) or the empty bus (alone). */
    readonly full: boolean,
    private me: Look,
  ) {
    if (full) this.riders = crew()
  }

  /** How afraid you are (0–1), for your heartbeat: riding alone, rising as it speeds up. */
  dread(): number {
    if (this.full) return 0
    return this.phase === 'drive' ? Math.min(0.5, (this.t / RIDE_EMPTY_MS) * 0.6) : 0.5
  }

  update(dt: number, move: number, hurry: boolean, h: RideHost) {
    const ms = dt * 1000
    this.t += ms
    this.scroll += this.speed * dt
    // You can walk the aisle (never off the bus: the doors are shut, or it's in them).
    if (move && this.phase !== 'done') {
      this.dir = move < 0 ? 1 : 2
      const nx = this.x + move * (hurry ? HURRY : SPEED) * dt
      this.x = Math.max(AISLE_MIN, Math.min(AISLE_MAX, nx))
      this.anim += dt * (hurry ? 10 : 7)
    } else this.anim = 0
    switch (this.phase) {
      case 'drive':
        // Alone, it goes faster and faster.
        if (!this.full) this.speed = 9 + (this.t / RIDE_EMPTY_MS) * 14
        if (this.t > (this.full ? RIDE_CREW_MS : RIDE_EMPTY_MS)) this.next('brake', h)
        break
      case 'brake':
        this.speed = Math.max(0, (this.full ? 9 : 23) * (1 - this.t / RIDE_BRAKE_MS))
        if (this.t > RIDE_BRAKE_MS) this.next('doors', h)
        break
      case 'doors':
        if (this.t > 600) {
          this.phase = 'done'
          if (this.full) h.arrive()
          else h.dropped()
        }
        break
    }
  }

  private next(phase: Phase, h: RideHost) {
    this.phase = phase
    this.t = 0
    if (phase === 'brake') h.sound('brake')
    if (phase === 'doors') h.sound('doors')
  }

  /** Draws the bus inside, centred in a vw × vh scene. `shake`: the grab's (px). */
  draw(c: CanvasRenderingContext2D, vw: number, vh: number, time: number, shake = 0) {
    c.fillStyle = '#060708'
    c.fillRect(0, 0, vw, vh)
    const ox = Math.round((vw - LEN * TS) / 2 + (Math.random() * 2 - 1) * shake)
    const oy = Math.round((vh - 6 * TS) / 2 + (Math.random() * 2 - 1) * shake)
    c.save()
    c.translate(ox, oy)
    // The back wall: cream panels, the windows with the forest going by.
    c.fillStyle = '#9a9278'
    c.fillRect(0, 0, LEN * TS, 2 * TS)
    c.fillStyle = '#7e775f'
    c.fillRect(0, 2 * TS - 4, LEN * TS, 4)
    for (let i = 0; i < 7; i++) {
      const wx = 22 + i * 32
      c.drawImage(outside(this.scroll, wx, time), wx, 4)
      c.fillStyle = '#6a6450'
      c.fillRect(wx - 1, 3, 26, 1)
      c.fillRect(wx - 1, 22, 26, 2)
    }
    // The ceiling lights along the top: dim and steady with the crew; one flickering when empty.
    for (let i = 0; i < 4; i++) {
      const on = this.full || i !== 2 || Math.sin(time / 70) * Math.sin(time / 230) > -0.3
      c.fillStyle = on ? (this.full ? '#d8c890' : '#b8c8b0') : '#3a3a34'
      c.fillRect(30 + i * 56, 0, 18, 2)
    }
    // The floor: worn rubber, ribbed down the aisle.
    c.fillStyle = '#3a3530'
    c.fillRect(0, 2 * TS, LEN * TS, 4 * TS)
    c.fillStyle = '#332e2a'
    for (let x = 4; x < LEN * TS; x += 6) c.fillRect(x, AISLE * TS + 3, 2, TS - 6)
    // The driver's cab at the front: an empty seat, the wheel.
    c.drawImage(cab(), 0, 2 * TS)
    // The door, front corner: shut, or open on the dark.
    const open = this.phase === 'doors' || this.phase === 'done'
    c.fillStyle = '#9a9278'
    c.fillRect(0, 6 * TS - 6, LEN * TS, 6)
    c.fillStyle = open ? '#020203' : '#3c4a40'
    c.fillRect(TS, 6 * TS - 6, 2 * TS, 6)
    if (!open) {
      c.fillStyle = '#2c3830'
      c.fillRect(2 * TS - 1, 6 * TS - 6, 2, 6)
    }
    // Seats, both rows, facing the front; and the crew in them.
    const sit = (col: number, row: 0 | 1) => {
      const y = row === 0 ? 2 * TS : 4 * TS
      c.drawImage(seat(), col * TS, y + 2)
    }
    const people: { y: number; draw: () => void }[] = []
    for (const col of SEATS) {
      sit(col, 0)
      sit(col, 1)
    }
    for (const r of this.riders) {
      const y = r.row === 0 ? 3 * TS : 5 * TS
      people.push({
        y,
        draw: () => {
          const s = seatedSprite(r.look, r.doze, 1)
          c.drawImage(s, r.col * TS, y - s.height + 4)
        },
      })
    }
    // You.
    const frame = this.anim > 0 ? Math.floor(this.anim) % 4 : 0
    people.push({
      y: (AISLE + 1) * TS,
      draw: () => {
        const s = personSprite(this.me, this.dir, frame)
        c.fillStyle = 'rgba(0,0,0,0.25)'
        c.fillRect(this.x * TS - 5, (AISLE + 1) * TS - 2, 10, 2)
        c.drawImage(s, Math.round(this.x * TS - SPR_W / 2), (AISLE + 1) * TS - s.height)
      },
    })
    people.sort((a, b) => a.y - b.y)
    for (const p of people) p.draw()
    // The light: warm and dim with the crew; with no one aboard, cold, and darker once the doors
    // open on the dark.
    const dim = this.full ? 0.3 : open ? 0.5 + 0.12 * Math.sin(time / 53) : 0.42
    c.fillStyle = this.full ? `rgba(30,22,10,${dim})` : `rgba(4,10,12,${dim})`
    c.fillRect(0, 0, LEN * TS, 6 * TS)
    c.restore()
  }
}

/** The crew of a run: workers in the seats, most dozing; one man is in two seats (a copy). */
function crew(): Rider[] {
  const free: { col: number; row: 0 | 1 }[] = []
  for (const col of SEATS) free.push({ col, row: 0 }, { col, row: 1 })
  free.sort(() => Math.random() - 0.5)
  const out: Rider[] = []
  const n = Math.min(free.length, 15)
  for (let i = 0; i < n; i++) out.push({ ...free[i], look: crewLook(), doze: Math.random() < 0.6 })
  // The same man, twice.
  if (out.length > 4) out[3] = { ...out[3], look: out[0].look }
  return out
}

/** A forestry worker from the 1970s: work shirt and trousers, a cap more often than not. */
export function crewLook(): Look {
  const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  return {
    name: '',
    body: Math.random() < 0.85 ? 'male' : 'female',
    skin: Math.floor(Math.random() * 6),
    hair: pick(['short', 'short', 'curly', 'bald'] as const),
    hairColor: Math.floor(Math.random() * 6),
    // Work shirts: red, safety orange, green, blue, navy.
    outfit: pick([0, 1, 3, 4, 5]),
    pants: pick([1, 3]),
    accessory: Math.random() < 0.55 ? 'hat' : 'none',
  }
}

// --- sprites -------------------------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, draw: (f: ReturnType<typeof pen>) => void) {
  let cv = cache.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    draw(pen(c))
    outlineCanvas(c, w, h, [0x0e, 0x0c, 0x0c])
    cache.set(key, cv)
  }
  return cv
}

/** A seat: a green vinyl cushion with its back on the rear side (everyone faces the front). */
function seat() {
  return sprite('ride:seat', 14, 14, (f) => {
    f('#3e5642', 1, 4, 10, 9)
    f('#4f6a52', 1, 4, 10, 3)
    f('#2e4232', 10, 0, 3, 13)
    f('#5a5a50', 11, 0, 1, 2)
  })
}

/** The driver's cab: an empty seat, the wheel, the fare box. */
function cab() {
  return sprite('ride:cab', 2 * TS, 2 * TS, (f) => {
    f('#2e4232', 12, 4, 12, 12)
    f('#3e5642', 12, 4, 9, 3)
    f('#22232a', 4, 6, 6, 10)
    f('#1a1a1c', 2, 4, 2, 14)
    f('#4a4a46', 18, 20, 8, 8)
    f('#6a6a62', 19, 21, 6, 2)
  })
}

/**
 * Out of a window: the dark, the trees going by. Made per window per few pixels of scroll (cached
 * by its rounded offset, so it's a copy most frames).
 */
const outsideCache = new Map<string, HTMLCanvasElement>()
function outside(scroll: number, wx: number, time: number) {
  void time
  const off = Math.floor(scroll * TS * 0.6 + wx) % 96
  const key = `${off}`
  let cv = outsideCache.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = 24
    cv.height = 18
    const c = cv.getContext('2d')!
    c.fillStyle = '#0c1116'
    c.fillRect(0, 0, 24, 18)
    // Trunks and the shapes of pines, passing.
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 17 + 96 - off) % 96) - 8
      if (tx < -6 || tx > 26) continue
      c.fillStyle = '#05080a'
      c.fillRect(tx + 2, 4, 2, 14)
      c.beginPath()
      c.moveTo(tx - 3, 14)
      c.lineTo(tx + 3, 0)
      c.lineTo(tx + 9, 14)
      c.fill()
    }
    // Your own reflection's faint warmth on the glass.
    c.fillStyle = 'rgba(200,190,150,0.05)'
    c.fillRect(0, 0, 24, 6)
    outsideCache.set(key, cv)
  }
  return cv
}

/**
 * What gets on: too tall and too thin, side on, coming towards the rear. Grey-white skin, arms
 * hanging past its knees with long fingers, the head bent forward on a long neck, black eyes, a
 * mouth too wide, blood down its chin and front and on its hands. `step`: which stride.
 */
export function thingSprite(step: number) {
  return sprite(`ride:thing:${step}`, 26, 58, (f) => {
    const skin = '#cfc9bd'
    const shade = '#a8a294'
    const blood = '#6e1414'
    const dark = '#1a0c0c'
    // Legs: long, thin, mid-stride.
    const [a, b] = step ? [2, -2] : [-2, 2]
    for (const [dx, tone] of [
      [a, shade],
      [b, skin],
    ] as const) {
      f(tone, 11 + dx, 34, 2, 12)
      f(tone, 11 + dx * 2, 46, 2, 10)
      f(tone, 10 + dx * 2, 55, 4, 2)
    }
    // Body: narrow, the ribs showing, blood down the front.
    f(skin, 9, 14, 7, 21)
    for (let y = 17; y < 30; y += 3) f(shade, 10, y, 5, 1)
    f(blood, 14, 14, 2, 16)
    f(blood, 13, 22, 2, 9)
    // Arms: hanging past the knees, the far one swinging.
    f(shade, 8 - a, 15, 2, 30)
    f(skin, 15 + b / 2, 15, 2, 30)
    for (let i = 0; i < 3; i++) {
      f(shade, 7 - a + i, 45, 1, 5)
      f(skin, 15 + b / 2 + i, 45, 1, 6)
    }
    f(blood, 15 + b / 2, 42, 3, 5)
    f(blood, 7 - a, 44, 3, 3)
    // A long neck, the head bent forward and down.
    f(skin, 13, 9, 3, 6)
    f(skin, 13, 2, 9, 8)
    f(shade, 13, 8, 9, 2)
    f(dark, 18, 4, 2, 2)
    f(dark, 15, 4, 1, 1)
    // The mouth: wide, open, blood down the chin.
    f(dark, 15, 7, 7, 2)
    f('#d8d0c0', 16, 7, 1, 1)
    f('#d8d0c0', 18, 7, 1, 1)
    f('#d8d0c0', 20, 7, 1, 1)
    f(blood, 19, 9, 2, 5)
    f(blood, 17, 9, 1, 3)
    // Hair: a few lank strands.
    f('#3a3632', 13, 1, 7, 2)
    f('#3a3632', 13, 3, 1, 6)
  })
}

/** Builds the ride's sprites up front. */
export function warmRide() {
  seat()
  cab()
}
