import {
  TS,
  darkPineSprite,
  darkTreeSprite,
  deadTreeSprite,
  outlineCanvas,
  pen,
  shade,
  stumpSprite,
  undergrowthSprite,
} from '../art'
import { hash } from '../maps'
import { FG, type Chunk, type ForestObj } from './gen'
import { CHUNK } from './tuning'

/*
 * The forest's art, drawn in code like the rest of the game (src/art.ts): leaf litter and moss,
 * dark pines, bare dead trees, ferns, logs, stones and mushrooms. Everything is drawn once into a
 * cached canvas: a chunk's ground when it first comes into view, each sprite the first time it's
 * needed. The colour grade (MOODS.forest) drains it further when it's shown.
 */

type Ctx = CanvasRenderingContext2D
type Pen = ReturnType<typeof pen>

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  return [cv, c]
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Ground colours: [base, dark, light] per ground type, as rgb. */
const GROUND: Record<number, number[][]> = {
  [FG.LITTER]: ['#5c4a37', '#4a3b2c', '#6e5840'].map(rgb),
  [FG.MOSS]: ['#4a5a38', '#3c4a2e', '#5a6c42'].map(rgb),
  [FG.PATH]: ['#6e5c47', '#5c4c3b', '#806b53'].map(rgb),
  [FG.EDGE]: ['#525c36', '#444d2d', '#626e40'].map(rgb),
}
/** Fallen leaves scattered on the litter: dull browns, rusts and the odd yellow. */
const LEAF_COLORS = ['#7a4a2a', '#8c5a2e', '#6e3f24', '#9a7a3a', '#5e3a22'].map(rgb)

/**
 * A chunk's ground, drawn pixel by pixel straight into image data (much quicker than thousands of
 * fillRects), once.
 */
export function chunkGround(ch: Chunk): HTMLCanvasElement {
  if (ch.canvas) return ch.canvas
  const size = CHUNK * TS
  const [cv, c] = canvas(size, size)
  const img = c.createImageData(size, size)
  const d = img.data
  const ox = ch.cx * CHUNK * TS
  const oy = ch.cy * CHUNK * TS
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const tile = ch.ground[Math.floor(py / TS) * CHUNK + Math.floor(px / TS)]
      const pal = GROUND[tile]
      const gx = ox + px
      const gy = oy + py
      // In pairs of pixels (the game's grain), with soft patches and specks.
      const cell = hash(gx >> 1, gy >> 1, 1201)
      let col = cell < 0.2 ? pal[1] : cell > 0.86 ? pal[2] : pal[0]
      if (tile !== FG.MOSS && tile !== FG.EDGE) {
        const leaf = hash(gx >> 1, gy >> 1, 1202)
        if (leaf < 0.09) col = LEAF_COLORS[Math.floor(leaf * 55) % LEAF_COLORS.length]
      }
      const o = (py * size + px) * 4
      d[o] = col[0]
      d[o + 1] = col[1]
      d[o + 2] = col[2]
      d[o + 3] = 255
    }
  c.putImageData(img, 0, 0)
  ch.canvas = cv
  return cv
}

// --- sprites -----------------------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, draw: (f: Pen, c: Ctx) => void, outline = true) {
  let cv = cache.get(key)
  if (!cv) {
    const [nc, c] = canvas(w, h)
    draw(pen(c), c)
    if (outline) outlineCanvas(c, w, h, [0x10, 0x14, 0x12])
    cv = nc
    cache.set(key, cv)
  }
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

function shadow(c: Ctx, x: number, y: number, w: number) {
  c.globalCompositeOperation = 'destination-over'
  c.fillStyle = 'rgba(0,0,0,0.3)'
  c.fillRect(x, y, w, 4)
  c.globalCompositeOperation = 'source-over'
}

/** A fallen log across two tiles. */
function log() {
  return sprite('log', 34, 16, (f, c) => {
    f('#3d2c20', 2, 4, 30, 9)
    f('#4f3a2a', 2, 4, 30, 3)
    f('#5e4a38', 30, 4, 4, 9)
    f('#7a634c', 31, 6, 2, 5)
    f('#2f3b25', 8, 4, 6, 2)
    f('#2f3b25', 20, 3, 4, 2)
    shadow(c, 2, 12, 30)
  })
}

function rock(v: number) {
  return sprite(`rock${v}`, 16, 12, (f) => {
    disc(f, 8, 7, 6 - (v % 2), 4, '#4a4c50')
    disc(f, 7, 6, 4 - (v % 2), 2.6, '#62656a')
    f('#7a7d82', 5, 4, 2, 1)
    if (v > 1) f('#3c4a2e', 9, 3, 3, 1)
  })
}

function fern(v: number) {
  return sprite(
    `fern${v}`,
    18,
    14,
    (f) => {
      const fronds = [
        [-1, -1],
        [1, -1],
        [-1, -0.3],
        [1, -0.3],
        [0, -1.2],
      ]
      fronds.forEach(([dx, dy], i) => {
        for (let k = 0; k < 6; k++) {
          const x = Math.round(9 + dx * k * 1.3)
          const y = Math.round(12 + dy * k * 1.4)
          f(k % 2 ? '#2e5234' : '#2f4f31', x, y, 2, 1)
          if (k > 1 && (k + i + v) % 2 === 0) f('#22432d', x + (dx > 0 ? 1 : -1), y + 1, 1, 1)
        }
      })
    },
    false,
  )
}

function shroom(v: number) {
  return sprite(`shroom${v}`, 12, 10, (f) => {
    const cap = v % 2 ? '#8a6a4a' : '#9a8a6a'
    for (const [x, y, s] of [
      [3, 5, 3],
      [7, 6, 2],
      [8, 3, 3],
    ].slice(0, 2 + (v % 2))) {
      f('#d8cdb4', x + 1, y + 1, 1, 3)
      f(cap, x, y, s, 1)
      f(shade(cap, 0.12), x, y, 1, 1)
    }
  })
}

/** How tall each kind stands (tiles of canopy above its tile): used for fading when behind it. */
export const TALL = new Set(['fpine', 'ftree', 'dead'])

/** Draws a forest object with its tile's top-left at (px, py). */
export function drawForestObj(c: Ctx, o: ForestObj, px: number, py: number) {
  switch (o.k) {
    case 'fpine':
      return c.drawImage(darkPineSprite(o.v % 2), px + 8 - 24, py + 16 - 96)
    case 'ftree':
      return c.drawImage(darkTreeSprite(o.v % 3), px + 8 - 32, py + 16 - 84)
    case 'dead':
      return c.drawImage(deadTreeSprite(o.v % 3), px + 8 - 24, py + 16 - 88)
    case 'stump':
      return c.drawImage(stumpSprite(), px - 2, py)
    case 'log':
      return c.drawImage(log(), px - 1, py + 1)
    case 'rock':
      return c.drawImage(rock(o.v), px, py + 3)
    case 'fern':
      return c.drawImage(fern(o.v % 2), px - 1, py + 1)
    case 'shroom':
      return c.drawImage(shroom(o.v), px + 2, py + 5)
    case 'brush':
      return c.drawImage(undergrowthSprite(o.v), px - 3, py - 3)
  }
}

/** Builds every forest sprite up front (under the fade into the forest), not on first sight. */
export function warmForest() {
  const [, c] = canvas(1, 1)
  for (const k of [
    'fpine',
    'ftree',
    'dead',
    'stump',
    'log',
    'rock',
    'fern',
    'shroom',
    'brush',
  ] as const)
    for (let v = 0; v < 4; v++) drawForestObj(c, { k, x: 0, y: 0, v }, -200, -200)
}

/** Whether a kind is drawn flat on the ground (under people), not y-sorted with them. */
export function flatKind(k: ForestObj['k']): boolean {
  return k === 'fern' || k === 'shroom' || k === 'rock'
}
