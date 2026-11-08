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
  // Cold, dark and drained: grey-brown earth, sickly grey-green moss, a worn grey track.
  [FG.LITTER]: ['#4a453e', '#3a3631', '#56504a'].map(rgb),
  [FG.MOSS]: ['#3f4a3c', '#323b30', '#4b5747'].map(rgb),
  [FG.PATH]: ['#5a544b', '#4a453d', '#665f55'].map(rgb),
  [FG.EDGE]: ['#525c36', '#444d2d', '#626e40'].map(rgb),
}
/** Dead leaves scattered on the litter: dull, dark browns, rotting. */
const LEAF_COLORS = ['#4a3526', '#3d2c20', '#55402c', '#2e241c', '#47392b'].map(rgb)
/** The odd pale twig or scrap of bone in the litter. */
const PALE = rgb('#8a8678')

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
      // Big soft patches of near-black, so the floor isn't one even colour.
      if (hash(gx >> 4, gy >> 4, 1203) < 0.3 && hash(gx >> 1, gy >> 1, 1204) < 0.55)
        col = [col[0] * 0.7, col[1] * 0.7, col[2] * 0.72]
      // Now and then a pale scrap (a twig, a bit of bone) in the litter.
      if (hash(gx >> 1, gy >> 1, 1205) > 0.9985) col = PALE
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

/** A jagged, dark stone, broken off at an angle, moss in its cracks. */
function rock(v: number) {
  return sprite(`rock${v}`, 16, 13, (f) => {
    // Rows from the top: [x0, x1) for each, a sharp, broken outline.
    const rows = [
      [7, 9],
      [6, 10],
      [5, 12],
      [4, 12],
      [3, 13],
      [2, 14],
      [2, 14],
      [3, 13],
    ].slice(v % 2)
    rows.forEach(([a, b], i) => {
      f('#2c2a29', a, 3 + i, b - a, 1)
      f('#46423f', a, 3 + i, Math.max(1, Math.round((b - a) * 0.35)), 1)
    })
    f('#1a1918', 8 + (v % 3), 5, 1, 4)
    if (v > 1) f('#2f3a2e', 9, 8, 3, 1)
  })
}

/** A tangle of brambles: dark, thorny canes arching every which way. */
function fern(v: number) {
  return sprite(
    `fern${v}`,
    20,
    16,
    (f) => {
      for (let k = 0; k < 6; k++) {
        // Each cane arcs up out of the ground and over, thorns along it.
        const dir = hash(k, v, 1401) < 0.5 ? -1 : 1
        let x = 10 + (hash(k, v, 1402) - 0.5) * 8
        let y = 15
        let up = 1.2 + hash(k, v, 1403) * 0.8
        for (let i = 0; i < 11; i++) {
          x += dir * 0.9
          y -= up
          up -= 0.22
          const px = Math.round(x)
          const py = Math.round(y)
          f(i % 3 === 0 ? '#2a2420' : '#1d1917', px, py, 1, 1)
          if (i % 3 === 1) f('#3a302a', px + (up > 0 ? -dir : dir), py - 1, 1, 1)
        }
      }
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

// --- the fakes (FOREST.md "Refusing a fake") -------------------------------------------------

const fakeSprites = new Map<string, HTMLCanvasElement>()

/**
 * A person's walking sprite as a fake gives up pretending: from stage 1 the colours drain out,
 * at 3 it stands too tall and thin. Cached per sprite and stage (`key` names the source sprite).
 * The canvas is taller than a person's (it's drawn with its feet on the same spot).
 */
export function fakeSprite(src: HTMLCanvasElement, key: string, stage: number): HTMLCanvasElement {
  if (stage <= 0) return src
  const k = `${key}|${stage}`
  let cv = fakeSprites.get(k)
  if (cv) return cv
  const stretch = stage >= 3 ? 1.4 : 1
  cv = document.createElement('canvas')
  cv.width = src.width
  cv.height = Math.ceil(src.height * stretch)
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  c.drawImage(src, 0, 0, src.width, src.height, 0, 0, src.width, cv.height)
  const img = c.getImageData(0, 0, cv.width, cv.height)
  const d = img.data
  const drain = stage === 1 ? 0.45 : 0.85
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11
    d[i] += (g * 0.92 - d[i]) * drain
    d[i + 1] += (g - d[i + 1]) * drain
    d[i + 2] += (g * 0.96 - d[i + 2]) * drain
  }
  c.putImageData(img, 0, 0)
  fakeSprites.set(k, cv)
  return cv
}
