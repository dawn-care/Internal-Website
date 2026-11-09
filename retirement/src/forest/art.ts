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
import { drawStoryObj, flatStory, warmStory } from './story/art'
import { layout } from './story/layout'
import { LINES } from './story/map'

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
  // Old tarmac (the Route 9 road): cracked, dark grey, weeds in it.
  [FG.ROAD]: ['#7b7973', '#6c6a64', '#88867f'].map(rgb),
  // The map's ground (story/map.ts): a trodden dirt path, the creek, the bridge's planks, a
  // house's stone floor, an overgrown garden, the camp's gravel yard.
  [FG.DIRT]: ['#8c7a60', '#7c6b53', '#9a8970'].map(rgb),
  [FG.WATER]: ['#2c3d45', '#24333a', '#3b525b'].map(rgb),
  [FG.PLANK]: ['#5e4834', '#4c3a2a', '#6d5640'].map(rgb),
  [FG.STONE]: ['#6c6b66', '#5a5955', '#7b7a74'].map(rgb),
  [FG.WILD]: ['#4c5a3c', '#3f4b32', '#5a6a47'].map(rgb),
  [FG.YARD]: ['#77726a', '#68635b', '#837e75'].map(rgb),
}
/** Blotchy 0–1 value per cell (leaf drifts), smoothed over the neighbours. */
function noise2(x: number, y: number): number {
  let n = 0
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ])
    n += hash(x + dx, y + dy, 1211)
  return n / 5
}

/** Edging stones along the paths' verges. */
const EDGE_STONE = rgb('#8a8478')

/** The windmill tiles under the leaves in the house (blue and white). */
const TILE_BLUE = rgb('#56677a')
const TILE_WHITE = rgb('#8a8b84')
/** Dead leaves scattered on the litter: dull, dark browns, rotting. */
const LEAF_COLORS = ['#4a3526', '#3d2c20', '#55402c', '#2e241c', '#47392b'].map(rgb)
/** The odd pale twig or scrap of bone in the litter. */
const PALE = rgb('#8a8678')

/**
 * A chunk's ground, drawn pixel by pixel straight into image data (much quicker than thousands of
 * fillRects), once.
 */
/** Ground you walk along (the road, paths, the camp's yard, the bridge): kept clear of leaves, and
 * edged where it meets the forest floor so you can always see where it goes. */
const TRODDEN = new Set<number>([FG.ROAD, FG.DIRT, FG.YARD, FG.PLANK])
const MAP_CODE: Record<string, number> = {
  road: FG.ROAD,
  path: FG.DIRT,
  water: FG.WATER,
  plank: FG.PLANK,
  stone: FG.STONE,
  wild: FG.WILD,
  yard: FG.YARD,
}

export function chunkGround(ch: Chunk): HTMLCanvasElement {
  if (ch.canvas) return ch.canvas
  // A tile's ground, looking into the neighbouring chunks through the map where needed.
  const groundAt = (tx: number, ty: number): number => {
    const i = tx - ch.cx * CHUNK
    const j = ty - ch.cy * CHUNK
    if (i >= 0 && j >= 0 && i < CHUNK && j < CHUNK) return ch.ground[j * CHUNK + i]
    const g = layout().ground(tx, ty)
    return g ? MAP_CODE[g] : FG.LITTER
  }
  const size = CHUNK * TS
  const [cv, c] = canvas(size, size)
  const img = c.createImageData(size, size)
  const d = img.data
  const ox = ch.cx * CHUNK * TS
  const oy = ch.cy * CHUNK * TS
  // The road and paths are drawn along their real lines (smooth curving edges, not tile steps),
  // so you can see where they go. Collision is still by tile.
  const segs = ch.wild ? [] : lineSegments(ch.cx * CHUNK, ch.cy * CHUNK)
  const lineEdge = (x: number, y: number): [number, number] => {
    let best = Infinity
    let code = FG.DIRT as number
    for (const sg of segs) {
      const e = segDist(x, y, sg.ax, sg.ay, sg.bx, sg.by) - sg.half
      if (e < best) {
        best = e
        code = sg.code
      }
    }
    return [best, code]
  }
  // Which tiles are road or path because a line runs through them (not an area like the drive).
  const lineTile = new Uint8Array(CHUNK * CHUNK)
  // Tiles near enough a line to need it worked out pixel by pixel (the rest are skipped).
  const nearLine = new Uint8Array(CHUNK * CHUNK)
  if (segs.length)
    for (let j = 0; j < CHUNK; j++)
      for (let i = 0; i < CHUNK; i++) {
        if (lineEdge(ch.cx * CHUNK + i + 0.5, ch.cy * CHUNK + j + 0.5)[0] < 1.2)
          nearLine[j * CHUNK + i] = 1
        const g = ch.ground[j * CHUNK + i]
        if (
          (g === FG.ROAD || g === FG.DIRT) &&
          lineEdge(ch.cx * CHUNK + i + 0.5, ch.cy * CHUNK + j + 0.5)[0] < 0.7
        )
          lineTile[j * CHUNK + i] = 1
      }
  // A small mask of where you can walk, so the paths show faintly through the dark (game.ts).
  const ms = size / 4
  const mask = new Uint8ClampedArray(ms * ms * 4)
  let masked = false
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const ti = Math.floor(py / TS) * CHUNK + Math.floor(px / TS)
      let tile = ch.ground[ti]
      const gx = ox + px
      const gy = oy + py
      let edge = Infinity
      let byLine = false
      let lineCode: number = FG.DIRT
      if (
        nearLine[ti] &&
        (tile === FG.ROAD || tile === FG.DIRT || tile === FG.LITTER || tile === FG.MOSS)
      ) {
        const [e, code] = lineEdge(gx / TS, gy / TS)
        lineCode = code
        // A soft, ragged edge: the path breaks up into the floor over a few pixels, not a line.
        const fray = (hash(gx >> 1, gy >> 1, 1215) - 0.5) * 0.3
        if (e <= fray) {
          tile = code
          byLine = true
        } else if (lineTile[ti]) tile = FG.LITTER
        edge = e
      }
      const trodden = byLine || (TRODDEN.has(tile) && !lineTile[ti])
      if (trodden && (px & 3) === 2 && (py & 3) === 2) {
        mask[((py >> 2) * ms + (px >> 2)) * 4 + 3] = 255
        masked = true
      }
      const pal = GROUND[tile]
      // In pairs of pixels (the game's grain), with soft patches and specks.
      const cell = hash(gx >> 1, gy >> 1, 1201)
      let col = cell < 0.2 ? pal[1] : cell > 0.86 ? pal[2] : pal[0]
      if (tile === FG.WATER) {
        // Slow ripples: pale streaks lying along the current.
        if (hash(gx >> 2, gy, 1207) > 0.94) col = [86, 108, 116]
      } else if (tile === FG.PLANK) {
        // Boards across, with dark gaps between them.
        if (gy % 4 === 3) col = [40, 30, 22]
        else if (hash(gx >> 3, gy >> 2, 1208) < 0.15) col = pal[1]
      } else if (tile === FG.STONE) {
        // Blue and white tiles, a little windmill in each, mostly under leaves.
        // Mostly buried: leaves lie in drifts (soft patches), the tiles showing between them.
        const buried = noise2(gx >> 3, gy >> 3) < 0.55
        if (buried) {
          const leaf = hash(gx >> 1, gy >> 1, 1202)
          col = leaf < 0.5 ? LEAF_COLORS[Math.floor(leaf * 55) % LEAF_COLORS.length] : pal[1]
        } else {
          const tx = gx & 7
          const ty = gy & 7
          const blade = (tx === ty || tx === 7 - ty) && tx > 1 && tx < 6
          col = blade ? TILE_BLUE : tx === 0 || ty === 0 ? pal[1] : TILE_WHITE
        }
      } else if (tile === FG.WILD) {
        // Long grass: lighter blades.
        if (hash(gx, gy >> 1, 1209) > 0.9) col = [104, 120, 82]
      } else if (tile === FG.YARD) {
        if (hash(gx, gy, 1210) > 0.93) col = [140, 134, 122]
      } else if (tile === FG.ROAD) {
        // Cracks, and moss coming up through them.
        const crack = hash(gx >> 1, gy >> 1, 1206)
        if (crack < 0.06) col = [34, 33, 31]
        else if (crack > 0.965) col = [62, 74, 58]
      } else if (tile === FG.DIRT) {
        // A trodden path: small stones, the odd leaf blown onto it.
        const p = hash(gx >> 1, gy >> 1, 1213)
        if (p < 0.04) col = [150, 140, 122]
        else if (p > 0.985) col = LEAF_COLORS[Math.floor(p * 97) % LEAF_COLORS.length]
      } else if (tile === FG.LITTER || tile === FG.PATH) {
        const leaf = hash(gx >> 1, gy >> 1, 1202)
        if (leaf < 0.09) col = LEAF_COLORS[Math.floor(leaf * 55) % LEAF_COLORS.length]
      }
      if (byLine) {
        // Towards the edge it fades a little towards the floor's colour (no outline).
        if (edge > -0.3) {
          const k = 0.25 * (1 - Math.min(1, -edge / 0.3))
          const f = GROUND[FG.LITTER][0]
          col = [
            col[0] + (f[0] - col[0]) * k,
            col[1] + (f[1] - col[1]) * k,
            col[2] + (f[2] - col[2]) * k,
          ]
        }
      } else if (edge < 0.4) {
        // Just outside: the floor, a shade lighter where it's been trodden at the edge, and the odd
        // stone kicked off the path.
        const p = GROUND[lineCode][0]
        const k = 0.3 * (1 - edge / 0.4)
        col = [
          col[0] + (p[0] - col[0]) * k,
          col[1] + (p[1] - col[1]) * k,
          col[2] + (p[2] - col[2]) * k,
        ]
        if (hash(gx >> 1, gy >> 1, 1214) < 0.06) col = EDGE_STONE
      } else if (TRODDEN.has(tile)) {
        // Its edge where it meets the forest floor: a dark rim, then a slightly darker margin.
        const tx = Math.floor(gx / TS)
        const ty = Math.floor(gy / TS)
        const lx = gx - tx * TS
        const ly = gy - ty * TS
        let edge = 99
        if (!TRODDEN.has(groundAt(tx - 1, ty))) edge = Math.min(edge, lx)
        if (!TRODDEN.has(groundAt(tx + 1, ty))) edge = Math.min(edge, TS - 1 - lx)
        if (!TRODDEN.has(groundAt(tx, ty - 1))) edge = Math.min(edge, ly)
        if (!TRODDEN.has(groundAt(tx, ty + 1))) edge = Math.min(edge, TS - 1 - ly)
        // A ragged edge, not a ruled line.
        const jag = hash(gx >> 1, gy >> 1, 1212) < 0.4 ? 1 : 0
        if (edge <= jag) col = [col[0] * 0.55, col[1] * 0.55, col[2] * 0.55]
        else if (edge <= 2 + jag) col = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8]
      } else {
        // Big soft patches of near-black, so the floor isn't one even colour.
        if (hash(gx >> 4, gy >> 4, 1203) < 0.3 && hash(gx >> 1, gy >> 1, 1204) < 0.55)
          col = [col[0] * 0.7, col[1] * 0.7, col[2] * 0.72]
        // Now and then a pale scrap (a twig, a bit of bone) in the litter.
        if (hash(gx >> 1, gy >> 1, 1205) > 0.9985) col = PALE
      }
      const o = (py * size + px) * 4
      d[o] = col[0]
      d[o + 1] = col[1]
      d[o + 2] = col[2]
      d[o + 3] = 255
    }
  c.putImageData(img, 0, 0)
  ch.canvas = cv
  if (masked) {
    const [mc, mctx] = canvas(ms, ms)
    const mi = mctx.createImageData(ms, ms)
    for (let i = 3; i < mask.length; i += 4) if (mask[i]) mi.data.set([255, 255, 255, 255], i - 3)
    mctx.putImageData(mi, 0, 0)
    ch.mask = mc
  } else ch.mask = null
  return cv
}

/** The road's and paths' segments near a chunk (tiles from its corner x0, y0). */
function lineSegments(x0: number, y0: number) {
  const out: { ax: number; ay: number; bx: number; by: number; half: number; code: number }[] = []
  for (const line of LINES) {
    if (!line.walk) continue
    const code = line.ground === 'road' ? FG.ROAD : FG.DIRT
    for (let k = 1; k < line.pts.length; k++) {
      const [ax, ay] = line.pts[k - 1]
      const [bx, by] = line.pts[k]
      const m = line.width / 2 + 1
      if (Math.max(ax, bx) + m < x0 || Math.min(ax, bx) - m > x0 + CHUNK) continue
      if (Math.max(ay, by) + m < y0 || Math.min(ay, by) - m > y0 + CHUNK) continue
      out.push({ ax, ay, bx, by, half: line.width / 2, code })
    }
  }
  return out
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
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
    default:
      return drawStoryObj(c, o, px, py)
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
  warmStory()
}

/** Whether an object is drawn flat on the ground (under people), not y-sorted with them. */
export function flatKind(o: ForestObj): boolean {
  return o.k === 'fern' || o.k === 'shroom' || o.k === 'rock' || flatStory(o)
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
