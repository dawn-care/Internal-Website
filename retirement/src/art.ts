import { CROPS, FLOORS, FURNITURE, WALLPAPERS, type Finish } from '../shared/catalog'
import { T, groundAt, hash, type GameMap, type Obj } from './maps'

/*
 * All of the game's pixel art, drawn procedurally at 16px per tile into the low-resolution
 * buffer (which is then scaled up with nearest-neighbour). No image files.
 */

export const TS = 16
type Ctx = CanvasRenderingContext2D
type Pen = (color: string, x: number, y: number, w?: number, h?: number) => void

export function pen(c: Ctx): Pen {
  return (color, x, y, w = 1, h = 1) => {
    c.fillStyle = color
    c.fillRect(x, y, w, h)
  }
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

/** Lighter (amt > 0) or darker version of a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [cv, ctx]
}

// --- ground tiles ----------------------------------------------------------------------------

const GRASS = '#5fb03c'
const GRASS_D = '#46922f'
const GRASS_L = '#86cc45'
const GRASS_DD = '#357a26'

function speckle(
  f: Pen,
  px: number,
  py: number,
  x: number,
  y: number,
  n: number,
  colors: string[],
  seed: number,
) {
  for (let i = 0; i < n; i++) {
    const r = hash(x * 31 + i, y * 17 + i, seed)
    const sx = Math.floor(hash(x, y, seed + i * 3) * 16)
    const sy = Math.floor(hash(y, x, seed + i * 5) * 16)
    f(colors[Math.floor(r * colors.length)], px + sx, py + sy)
  }
}

/** Smooth value noise in world pixels (0–1), for big soft patches of lighter and darker grass. */
function smooth(gx: number, gy: number, scale: number, seed: number): number {
  const x = gx / scale
  const y = gy / scale
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const sx = x - x0
  const sy = y - y0
  const u = sx * sx * (3 - 2 * sx)
  const v = sy * sy * (3 - 2 * sy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

const GRASS_TONES = ['#4f9e33', GRASS, '#6cbd43']

/** A tuft of grass: three blades, dark at the root, lit at the tips. */
function tuft(f: Pen, bx: number, by: number, dark: string, mid: string, light: string) {
  f(dark, bx, by + 2, 5, 1)
  f(mid, bx, by + 1, 1, 1)
  f(mid, bx + 4, by + 1, 1, 1)
  f(mid, bx + 2, by, 1, 2)
  f(light, bx + 1, by + 1, 1, 1)
  f(light, bx + 2, by - 1, 1, 1)
  f(light, bx + 3, by + 1, 1, 1)
}

/**
 * Grass: soft patches of three greens across the whole lawn (dithered where they meet), tufts of
 * blades, and the odd clover leaf, instead of a flat colour.
 */
function grass(f: Pen, px: number, py: number, x: number, y: number, base = GRASS) {
  const flat = base !== GRASS
  for (let yy = 0; yy < 16; yy += 2)
    for (let xx = 0; xx < 16; xx += 2) {
      const gx = px + xx
      const gy = py + yy
      let col = base
      if (!flat) {
        const n = smooth(gx, gy, 44, 701) * 0.75 + smooth(gx, gy, 13, 702) * 0.25
        const j = (hash(gx, gy, 703) - 0.5) * 0.08
        col = GRASS_TONES[n + j < 0.38 ? 0 : n + j > 0.64 ? 2 : 1]
      }
      f(col, gx, gy, 2, 2)
    }
  speckle(f, px, py, x, y, 5, [GRASS_D, GRASS_L], 11)
  const tufts = 2 + Math.floor(hash(x, y, 44) * 3)
  for (let i = 0; i < tufts; i++) {
    const bx = px + Math.floor(hash(x, y, 40 + i) * 11)
    const by = py + 1 + Math.floor(hash(y, x, 50 + i) * 12)
    tuft(f, bx, by, GRASS_DD, GRASS_D, GRASS_L)
  }
  if (!flat && hash(x, y, 45) < 0.12) {
    const cx = px + 4 + Math.floor(hash(x, y, 46) * 8)
    const cy = py + 4 + Math.floor(hash(y, x, 47) * 8)
    f('#3f8a2e', cx, cy + 1, 3, 1)
    f('#78c84c', cx, cy, 1, 1)
    f('#78c84c', cx + 2, cy, 1, 1)
    f('#78c84c', cx + 1, cy + 2, 1, 1)
  }
}

const FLOWER_COLORS = ['#ffffff', '#ff7fb0', '#b583f5', '#ffd23a', '#ff6a45', '#5fb2ff']

function flowers(f: Pen, px: number, py: number, x: number, y: number) {
  grass(f, px, py, x, y)
  for (let i = 0; i < 3; i++) {
    const fx = px + 2 + Math.floor(hash(x, y, 60 + i) * 11)
    const fy = py + 2 + Math.floor(hash(y, x, 70 + i) * 11)
    const col = FLOWER_COLORS[Math.floor(hash(x + i, y, 80) * FLOWER_COLORS.length)]
    f('#4f8f36', fx + 1, fy + 2, 1, 2)
    f(col, fx, fy + 1, 3, 1)
    f(col, fx + 1, fy, 1, 3)
    f('#f5d547', fx + 1, fy + 1)
  }
}

/** Grass tufts creeping over the edges of a path-like tile where it meets grass. */
function fringe(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  const isGreen = (gx: number, gy: number) => {
    const g = groundAt(m, gx, gy)
    return g === T.GRASS || g === T.FLOWERS
  }
  for (let i = 0; i < 16; i += 2) {
    const n = hash(x * 16 + i, y, 90) < 0.5 ? 1 : 2
    if (isGreen(x, y - 1)) f(GRASS, px + i, py, 2, n)
    if (isGreen(x, y + 1)) f(GRASS, px + i, py + 16 - n, 2, n)
    if (isGreen(x - 1, y)) f(GRASS, px, py + i, n, 2)
    if (isGreen(x + 1, y)) f(GRASS, px + 16 - n, py + i, n, 2)
  }
}

function path(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#e2a95f', px, py, 16, 16)
  speckle(f, px, py, x, y, 10, ['#c98c45', '#f0c27f', '#c98c45'], 21)
  const sx = px + Math.floor(hash(x, y, 22) * 12) + 1
  const sy = py + Math.floor(hash(y, x, 23) * 12) + 2
  f('#a8703a', sx, sy, 3, 2)
  f('#f6d9a2', sx, sy, 2, 1)
  fringe(f, m, px, py, x, y)
}

function dirt(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#b8743d', px, py, 16, 16)
  speckle(f, px, py, x, y, 10, ['#9a5c2c', '#cc8a50', '#a5652f'], 31)
  fringe(f, m, px, py, x, y)
}

const COBBLES = ['#c4b294', '#b8a586', '#cdbd9f', '#ae9b7c', '#c9b18c']
const COBBLE_CELL = 8

/** Nearest and second-nearest cobble centres to a world pixel (squashed: stones are wide). */
function cobbleAt(gx: number, gy: number) {
  const cx = Math.floor(gx / COBBLE_CELL)
  const cy = Math.floor(gy / COBBLE_CELL)
  let d1 = Infinity
  let d2 = Infinity
  let best = { x: 0, y: 0, id: 0 }
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const kx = cx + i
      const ky = cy + j
      const fx = (kx + 0.15 + hash(kx, ky, 301) * 0.7) * COBBLE_CELL
      const fy = (ky + 0.15 + hash(kx, ky, 302) * 0.7) * COBBLE_CELL
      const dx = gx + 0.5 - fx
      const dy = (gy + 0.5 - fy) * 1.25
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < d1) {
        d2 = d1
        d1 = d
        best = { x: fx, y: fy, id: kx * 7919 + ky }
      } else if (d < d2) d2 = d
    }
  return { ...best, edge: d2 - d1 }
}

/** Cobblestones: rounded stones of slightly different colours, lit from the top left, with
 * dark grout (and the odd bit of moss) between them. */
function stone(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  for (let yy = 0; yy < 16; yy++)
    for (let xx = 0; xx < 16; xx++) {
      const gx = px + xx
      const gy = py + yy
      const s = cobbleAt(gx, gy)
      let col: string
      if (s.edge < 1.15) {
        col = hash(gx, gy, 303) < 0.07 ? '#6f8a3c' : '#7a6650'
      } else {
        const base = COBBLES[Math.floor(hash(s.id, 1, 304) * COBBLES.length)]
        const above = gy + 0.5 < s.y - 1
        const below = gy + 0.5 > s.y + 1.2
        if (s.edge < 2.4 && below) col = shade(base, -0.13)
        else if (s.edge < 2.2 && above) col = shade(base, 0.09)
        else if (s.edge < 3.2 && below && gx > s.x) col = shade(base, -0.06)
        else col = base
        if (Math.abs(gx + 0.5 - (s.x - 1)) < 1 && Math.abs(gy + 0.5 - (s.y - 1)) < 0.6)
          col = shade(base, 0.14)
      }
      f(col, gx, gy)
    }
  fringe(f, m, px, py, x, y)
}

const isWater = (m: GameMap, x: number, y: number) => groundAt(m, x, y) === T.WATER

/** Distance in pixels from a point to the nearest non-water tile (capped at 24). */
function shoreDist(m: GameMap, gx: number, gy: number): number {
  const tx = Math.floor(gx / TS)
  const ty = Math.floor(gy / TS)
  let best = 24
  for (let j = -2; j <= 2; j++)
    for (let i = -2; i <= 2; i++) {
      if (isWater(m, tx + i, ty + j)) continue
      const x0 = (tx + i) * TS
      const y0 = (ty + j) * TS
      const dx = Math.max(x0 - gx, 0, gx - (x0 + TS - 1))
      const dy = Math.max(y0 - gy, 0, gy - (y0 + TS - 1))
      best = Math.min(best, Math.hypot(dx, dy))
    }
  return best
}

/** Sand round the pond: darker and wet right at the water, with a few pebbles and reeds. */
function sand(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#f0d48a', px, py, 16, 16)
  speckle(f, px, py, x, y, 8, ['#dbb86a', '#f8e6b0'], 51)
  // Wet sand where it meets the water.
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    if (!isWater(m, x + dx, y + dy)) continue
    for (let k = 0; k < 4; k++) {
      const col = k < 2 ? '#c99a52' : '#ddb46c'
      if (dy === -1) f(col, px, py + k, 16, 1)
      if (dy === 1) f(col, px, py + 15 - k, 16, 1)
      if (dx === -1) f(col, px + k, py, 1, 16)
      if (dx === 1) f(col, px + 15 - k, py, 1, 16)
    }
  }
  if (hash(x, y, 52) < 0.35) {
    const sx = px + 3 + Math.floor(hash(x, y, 53) * 9)
    const sy = py + 4 + Math.floor(hash(y, x, 54) * 8)
    f('#8f8373', sx, sy + 1, 4, 2)
    f('#b8ad9a', sx, sy, 3, 2)
    f('#d8cfbd', sx, sy, 1, 1)
  }
  // Reeds and cattails on some of the shore next to the water.
  const nearWater =
    isWater(m, x, y - 1) || isWater(m, x - 1, y) || isWater(m, x + 1, y) || isWater(m, x, y + 1)
  if (nearWater && hash(x, y, 55) < 0.4) {
    for (let i = 0; i < 4; i++) {
      const rx = px + 2 + Math.floor(hash(x, y, 56 + i) * 12)
      const h = 6 + Math.floor(hash(y, x, 60 + i) * 6)
      const ry = py + 14
      f('#2f6e2a', rx, ry - h, 1, h)
      f('#5aa43c', rx + 1, ry - h + 2, 1, h - 2)
      if (i % 2 === 0) {
        f('#6b3f1e', rx, ry - h - 3, 2, 4)
        f('#8a5a2e', rx, ry - h - 3, 1, 2)
      }
    }
  }
  fringe(f, m, px, py, x, y)
}

const WATER_BANDS: [number, string][] = [
  [3, '#6cc2ec'],
  [7, '#43a0de'],
  [13, '#3290d6'],
  [24, '#2a7cc6'],
]

/** Pond water, shallow and light at the shore and deeper blue in the middle, with an earth bank
 * along the top edge, a foam line, soft ripple marks and lily pads. */
function water(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  for (let yy = 0; yy < 16; yy++)
    for (let xx = 0; xx < 16; xx++) {
      const d = shoreDist(m, px + xx, py + yy) + (hash(px + xx, py + yy, 58) - 0.5) * 1.2
      const col = WATER_BANDS.find(([lim]) => d < lim)?.[1] ?? WATER_BANDS[3][1]
      f(col, px + xx, py + yy)
    }
  // Foam where the water touches the shore.
  if (!isWater(m, x, y + 1)) f('#d8f0fb', px, py + 15, 16, 1)
  if (!isWater(m, x - 1, y)) f('#d8f0fb', px, py, 1, 16)
  if (!isWater(m, x + 1, y)) f('#d8f0fb', px + 15, py, 1, 16)
  // The bank: an earthy lip on the far (top) side, casting a shadow on the water.
  if (!isWater(m, x, y - 1)) {
    f('#a0763f', px, py, 16, 2)
    f('#7c5a2e', px, py + 2, 16, 2)
    f('#2468b0', px, py + 4, 16, 1)
  }
  // Ripple marks.
  for (let i = 0; i < 2; i++) {
    const rx = px + 2 + Math.floor(hash(x, y, 62 + i) * 10)
    const ry = py + 5 + Math.floor(hash(y, x, 64 + i) * 9)
    f('#5aaee6', rx, ry, 4, 1)
    f('#5aaee6', rx + 1, ry - 1, 2, 1)
  }
  // Lily pads (away from the edge), some with a flower.
  if (shoreDist(m, px + 8, py + 8) > 10 && hash(x, y, 66) < 0.2) {
    const lx = px + 2 + Math.floor(hash(x, y, 67) * 5)
    const ly = py + 3 + Math.floor(hash(y, x, 68) * 6)
    disc(f, lx + 5, ly + 4, 5, 3.6, '#2a6e2a')
    disc(f, lx + 5, ly + 3.5, 4.5, 3.1, '#47a338')
    disc(f, lx + 4, ly + 2.5, 2, 1.2, '#74c652')
    // The notch.
    f('#3290d6', lx + 5, ly + 3, 1, 4)
    f('#3290d6', lx + 6, ly + 5, 1, 2)
    if (hash(x, y, 69) < 0.5) {
      f('#ff9fcf', lx + 1, ly + 1, 4, 3)
      f('#ffe0ef', lx + 2, ly, 2, 2)
      f('#ffd93b', lx + 2, ly + 2, 2, 1)
    }
  }
}

function hallFloor(f: Pen, px: number, py: number) {
  f('#ebe3cf', px, py, 16, 16)
  f('#d9ceb4', px, py, 8, 8)
  f('#d9ceb4', px + 8, py + 8, 8, 8)
  f('#f6f0e2', px + 1, py + 9, 2, 1)
}

function wallpaper(
  f: Pen,
  fin: Finish,
  px: number,
  py: number,
  x: number,
  y: number,
  rows: number,
) {
  f(fin.base, px, py, 16, rows)
  switch (fin.id) {
    case 'cream':
      for (let i = 0; i < 16; i += 4) f(fin.accent, px + i, py, 2, rows)
      break
    case 'rose':
      for (let yy = 2; yy < rows; yy += 6)
        for (let xx = yy % 12 === 2 ? 2 : 6; xx < 16; xx += 8) {
          f(fin.accent, px + xx, py + yy, 2, 2)
          f('#9db98a', px + xx + 2, py + yy + 1, 1, 1)
        }
      break
    case 'damask':
      for (let yy = 1; yy < rows; yy += 8) {
        f(fin.accent, px + 7, py + yy, 2, 1)
        f(fin.accent, px + 6, py + yy + 1, 4, 1)
        f(fin.accent, px + 5, py + yy + 2, 6, 2)
        f(fin.accent, px + 6, py + yy + 4, 4, 1)
        f(fin.accent, px + 7, py + yy + 5, 2, 1)
      }
      break
    case 'panel':
      for (let i = 0; i < 16; i += 4) f(fin.accent, px + i, py, 1, rows)
      f('#b8855a', px + 2, py + ((x * 7 + y * 3) % rows), 1, 2)
      break
    default:
      for (let i = 0; i < 5; i++) {
        f(
          fin.accent,
          px + Math.floor(hash(x, y, 100 + i) * 15),
          py + Math.floor(hash(y, x, 110 + i) * rows),
        )
      }
  }
}

function hallWall(f: Pen, px: number, py: number, x: number, y: number) {
  const paper: Finish = { id: 'cream', name: '', price: 0, base: '#e2cfa8', accent: '#d6c096' }
  if (y === 1) {
    wallpaper(f, paper, px, py, x, y, 16)
  } else {
    wallpaper(f, paper, px, py, x, y, 4)
    f('#7d5a3c', px, py + 4, 16, 2)
    f('#9a7550', px, py + 6, 16, 8)
    f('#86633f', px + (x % 2) * 8 + 3, py + 7, 1, 6)
    f('#86633f', px + (x % 2) * 8 + 11, py + 7, 1, 6)
    f('#5e4330', px, py + 14, 16, 2)
  }
}

function roomWall(f: Pen, fin: Finish, px: number, py: number, x: number, y: number) {
  if (y === 1) {
    wallpaper(f, fin, px, py, x, y, 16)
  } else {
    wallpaper(f, fin, px, py, x, y, 7)
    f('#7d5a3c', px, py + 7, 16, 2)
    f('#efe8da', px, py + 9, 16, 5)
    f('#ddd3c0', px + 3, py + 10, 1, 3)
    f('#ddd3c0', px + 11, py + 10, 1, 3)
    f('#6b4b33', px, py + 14, 16, 2)
  }
}

function roomFloor(f: Pen, fin: Finish, px: number, py: number, x: number, y: number) {
  f(fin.base, px, py, 16, 16)
  switch (fin.id) {
    case 'oak':
      for (let r = 0; r < 16; r += 4) {
        f(fin.accent, px, py + r + 3, 16, 1)
        f(fin.accent, px + ((x * 5 + r * 3 + y * 7) % 14), py + r, 1, 3)
      }
      break
    case 'checker':
      f(fin.accent, px, py, 8, 8)
      f(fin.accent, px + 8, py + 8, 8, 8)
      f('#ffffff', px + 9, py + 1, 2, 1)
      break
    case 'parquet':
      for (let by = 0; by < 16; by += 8)
        for (let bx = 0; bx < 16; bx += 8) {
          const vertical = (bx + by) % 16 === 0
          for (let i = 1; i < 8; i += 2)
            if (vertical) f(fin.accent, px + bx + i, py + by, 1, 8)
            else f(fin.accent, px + bx, py + by + i, 8, 1)
        }
      break
    default:
      for (let i = 0; i < 16; i += 2)
        for (let j = (i / 2) % 2; j < 16; j += 4) f(fin.accent, px + j, py + i)
  }
}

function trim(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#4a3a33', px, py, 16, 16)
  if (groundAt(m, x, y + 1) !== T.TRIM && y + 1 < m.h) f('#6a5448', px, py + 14, 16, 2)
  if (y === m.h - 1) f('#5a4840', px, py, 16, 3)
}

/** The static ground layer of a map, rendered once into its own canvas. */
export function renderGround(m: GameMap, wall?: string, floor?: string): HTMLCanvasElement {
  const [cv, c] = canvas(m.w * TS, m.h * TS)
  const f = pen(c)
  const wallFin = WALLPAPERS[wall ?? 'cream'] ?? WALLPAPERS.cream
  const floorFin = FLOORS[floor ?? 'oak'] ?? FLOORS.oak
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const px = x * TS
      const py = y * TS
      switch (m.ground[y * m.w + x]) {
        case T.GRASS:
          grass(f, px, py, x, y)
          break
        case T.FLOWERS:
          flowers(f, px, py, x, y)
          break
        case T.PATH:
          path(f, m, px, py, x, y)
          break
        case T.WATER:
          water(f, m, px, py, x, y)
          break
        case T.SAND:
          sand(f, m, px, py, x, y)
          break
        case T.STONE:
          stone(f, m, px, py, x, y)
          break
        case T.DIRT:
          dirt(f, m, px, py, x, y)
          break
        case T.PLOT:
          grass(f, px, py, x, y, '#83b552')
          break
        case T.HALL_FLOOR:
          hallFloor(f, px, py)
          break
        case T.HALL_WALL:
          hallWall(f, px, py, x, y)
          break
        case T.ROOM_FLOOR:
          roomFloor(f, floorFin, px, py, x, y)
          break
        case T.ROOM_WALL:
          roomWall(f, wallFin, px, py, x, y)
          break
        case T.TRIM:
          trim(f, m, px, py, x, y)
          break
      }
    }
  return cv
}

/** Little moving glints on the water, drawn every frame over the static layer. */
export function drawWaterGlints(
  c: Ctx,
  m: GameMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  time: number,
) {
  const f = pen(c)
  for (let y = Math.max(0, y0); y <= Math.min(m.h - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(m.w - 1, x1); x++) {
      if (m.ground[y * m.w + x] !== T.WATER) continue
      const phase = (time / 900 + hash(x, y, 9) * 6) % 6
      if (phase < 2) {
        const gx = x * TS + 3 + Math.floor(hash(x, y, 8) * 8) + Math.floor(phase * 2)
        const gy = y * TS + 4 + Math.floor(hash(y, x, 8) * 8)
        f('#9fd0f2', gx, gy, 3, 1)
        f('#cfe9fb', gx + 1, gy, 1, 1)
      }
    }
}

// --- crops -----------------------------------------------------------------------------------

/** Tilled soil: raised rows with clods, darker and glistening when watered. */
export function drawSoil(c: Ctx, px: number, py: number, wet: boolean) {
  const f = pen(c)
  const [base, furrow, ridge, clod] = wet
    ? ['#5a3620', '#3e2414', '#6e4529', '#7d5333']
    : ['#8e5b32', '#6a4024', '#a8713f', '#b98250']
  f(furrow, px + 1, py + 1, 14, 14)
  for (const r of [1, 6, 11]) {
    f(base, px + 1, py + r, 14, 4)
    f(ridge, px + 1, py + r, 14, 1)
    f(furrow, px + 1, py + r + 3, 14, 1)
  }
  for (let i = 0; i < 5; i++) {
    const cx = px + 2 + Math.floor(hash(px, py, 801 + i) * 11)
    const cy = py + 2 + Math.floor(hash(py, px, 806 + i) * 11)
    f(clod, cx, cy, 2, 1)
    f(furrow, cx + 1, cy + 1, 1, 1)
  }
  if (wet) {
    f('rgba(170,210,255,0.5)', px + 4, py + 2, 2, 1)
    f('rgba(170,210,255,0.5)', px + 10, py + 7, 2, 1)
    f('rgba(170,210,255,0.5)', px + 6, py + 12, 2, 1)
  }
}

/**
 * The raised wooden bed round a garden plot (w×h tiles), drawn once and cached. Yours has brass
 * caps on its corner posts.
 */
export function plotFrame(w: number, h: number, mine: boolean): HTMLCanvasElement {
  const W = w * TS + 8
  const H = h * TS + 10
  return cached(`plotframe${w}x${h}${mine}`, W, H, (f) => {
    const plank = (x: number, y: number, len: number, horiz: boolean) => {
      if (horiz) {
        f('#5e3a1d', x, y, len, 4)
        f('#a0703f', x, y, len, 3)
        f('#c08a52', x, y, len, 1)
        for (let i = 6; i < len; i += 11) f('#7d5530', x + i, y + 1, 3, 1)
        for (let i = 15; i < len; i += 16) f('#5e3a1d', x + i, y, 1, 3)
      } else {
        f('#5e3a1d', x, y, 4, len)
        f('#a0703f', x, y, 3, len)
        f('#c08a52', x, y, 1, len)
        for (let i = 7; i < len; i += 13) f('#7d5530', x + 1, y + i, 1, 3)
      }
    }
    // Shadow the bed casts down onto the path.
    f('rgba(40,20,5,0.25)', 2, H - 4, W - 2, 3)
    plank(0, 0, W, true)
    plank(0, H - 6, W, true)
    plank(0, 0, H - 4, false)
    plank(W - 4, 0, H - 4, false)
    for (const [cx, cy] of [
      [0, 0],
      [W - 5, 0],
      [0, H - 7],
      [W - 5, H - 7],
    ]) {
      f('#4a2c16', cx, cy, 5, 5)
      f(mine ? '#f2c94c' : '#8a5d34', cx + 1, cy + 1, 3, 3)
      f(mine ? '#fff0a8' : '#a87848', cx + 1, cy + 1, 1, 1)
    }
  })
}

/** stage: 0 seed, 1 sprout, 2 growing, 3 ripe. */
export function drawCrop(c: Ctx, id: string, stage: number, px: number, py: number, time = 0) {
  const def = CROPS[id]
  if (!def) return
  const f = pen(c)
  const L = def.leaf
  const LD = '#2f6b2a'
  const sway = Math.round(Math.sin(time / 700 + px * 0.3) * 0.6)
  if (stage === 0) {
    f('#6b4026', px + 6, py + 10, 4, 2)
    f(L, px + 7, py + 8, 1, 2)
    f(L, px + 8, py + 7, 1, 2)
    return
  }
  if (stage === 1) {
    f(LD, px + 8, py + 7, 1, 5)
    f(L, px + 5 + sway, py + 6, 3, 2)
    f(L, px + 9 + sway, py + 5, 3, 2)
    f(L, px + 7 + sway, py + 4, 2, 2)
    return
  }
  const ripe = stage === 3
  switch (id) {
    case 'radish':
    case 'carrot': {
      const leaf = (dx: number, h: number) => {
        f(LD, px + dx + sway, py + 9 - h, 1, h)
        f(L, px + dx - 1 + sway, py + 9 - h, 3, 2)
      }
      leaf(5, 5)
      leaf(8, 7)
      leaf(11, 5)
      if (ripe) {
        if (id === 'radish') {
          disc(f, px + 8, py + 11, 3.5, 3, def.fruit)
          f('#f7a0ac', px + 6, py + 10, 2, 1)
          f('#f1e6e0', px + 8, py + 14, 1, 2)
        } else {
          f(def.fruit, px + 6, py + 9, 5, 3)
          f(def.fruitDark, px + 7, py + 12, 3, 2)
          f('#ffb15c', px + 6, py + 9, 2, 1)
        }
      }
      break
    }
    case 'strawberry': {
      disc(f, px + 8, py + 9, 6, 4.5, LD)
      disc(f, px + 7, py + 8, 5, 3.5, L)
      f('#ffffff', px + 4, py + 7)
      f('#f5e04f', px + 4, py + 7)
      if (ripe)
        for (const [dx, dy] of [
          [3, 10],
          [8, 11],
          [11, 8],
          [6, 7],
        ]) {
          f(def.fruit, px + dx, py + dy, 3, 3)
          f(def.fruitDark, px + dx + 1, py + dy + 2)
          f('#fff3a8', px + dx, py + dy)
        }
      else f('#fffbe8', px + 9, py + 8, 2, 2)
      break
    }
    case 'tomato': {
      f('#9a7046', px + 3, py - 5, 1, 19)
      f('#9a7046', px + 12, py - 5, 1, 19)
      f('#9a7046', px + 3, py - 2, 10, 1)
      for (let i = 0; i < 4; i++) {
        disc(f, px + 8 + (i % 2 ? 2 : -2) + sway, py + 10 - i * 4, 4, 2.5, i % 2 ? L : LD)
      }
      if (ripe)
        for (const [dx, dy] of [
          [4, 8],
          [9, 4],
          [10, 10],
          [5, 0],
        ]) {
          disc(f, px + dx + 1.5, py + dy + 1.5, 2, 2, def.fruit)
          f('#ff8f7a', px + dx, py + dy)
        }
      break
    }
    case 'sunflower': {
      f(LD, px + 7, py - 6, 2, 19)
      f(L, px + 3 + sway, py + 5, 4, 2)
      f(L, px + 9 + sway, py + 1, 4, 2)
      if (ripe) {
        disc(f, px + 8 + sway, py - 8, 6, 6, def.fruit)
        disc(f, px + 8 + sway, py - 8, 3, 3, def.fruitDark)
        f('#ffe27a', px + 4 + sway, py - 12, 2, 1)
      } else {
        disc(f, px + 8 + sway, py - 7, 3, 3, '#8fbf4c')
      }
      break
    }
    case 'pumpkin': {
      f(LD, px + 1, py + 6, 14, 1)
      disc(f, px + 4, py + 5, 3, 2, L)
      disc(f, px + 12, py + 7, 3, 2, L)
      if (ripe) {
        disc(f, px + 8, py + 10, 7, 5, def.fruit)
        f(def.fruitDark, px + 5, py + 6, 1, 9)
        f(def.fruitDark, px + 10, py + 6, 1, 9)
        f('#ffb661', px + 3, py + 8, 1, 3)
        f('#5c7a2a', px + 7, py + 4, 2, 3)
      } else {
        disc(f, px + 8, py + 11, 3, 2.5, '#9fc25a')
      }
      break
    }
  }
}

/** A seed-packet / produce icon for the inventory bar. */
export function cropIcon(id: string, produce: boolean, size = 32): HTMLCanvasElement {
  const [cv, c] = canvas(16, 16)
  const f = pen(c)
  const def = CROPS[id]
  if (produce) {
    drawProduce(f, id)
  } else {
    f('#e9dcc0', 3, 2, 10, 13)
    f('#cdbb96', 3, 14, 10, 1)
    f(def.fruit, 4, 4, 8, 6)
    f(def.leaf, 6, 3, 4, 2)
    f('#8a6a44', 5, 11, 6, 1)
  }
  cv.style.width = cv.style.height = `${size}px`
  cv.style.imageRendering = 'pixelated'
  return cv
}

function drawProduce(f: Pen, id: string) {
  const def = CROPS[id]
  switch (id) {
    case 'radish':
      disc(f, 8, 10, 4, 4, def.fruit)
      f(def.leaf, 6, 2, 2, 4)
      f(def.leaf, 9, 2, 2, 4)
      f('#f7a0ac', 6, 8, 2, 2)
      break
    case 'carrot':
      for (let i = 0; i < 8; i++)
        f(i < 6 ? def.fruit : def.fruitDark, 5 + Math.floor(i / 3), 5 + i, 5 - Math.floor(i / 2), 1)
      f(def.leaf, 5, 1, 2, 4)
      f(def.leaf, 8, 1, 2, 4)
      break
    case 'strawberry':
      disc(f, 8, 9, 5, 5, def.fruit)
      f(def.leaf, 5, 3, 6, 2)
      f('#fff3a8', 6, 8)
      f('#fff3a8', 10, 10)
      f('#fff3a8', 8, 12)
      break
    case 'tomato':
      disc(f, 8, 9, 6, 5, def.fruit)
      f(def.leaf, 6, 3, 4, 2)
      f('#ff8f7a', 5, 6, 2, 2)
      break
    case 'sunflower':
      disc(f, 8, 8, 7, 7, def.fruit)
      disc(f, 8, 8, 3.5, 3.5, def.fruitDark)
      break
    case 'pumpkin':
      disc(f, 8, 10, 7, 5, def.fruit)
      f(def.fruitDark, 5, 6, 1, 9)
      f(def.fruitDark, 10, 6, 1, 9)
      f('#5c7a2a', 7, 2, 2, 4)
      break
  }
}

// --- outdoor & hall objects --------------------------------------------------------------------

const spriteCache = new Map<string, HTMLCanvasElement>()
function cached(key: string, w: number, h: number, draw: (f: Pen) => void): HTMLCanvasElement {
  return cachedCtx(key, w, h, (c) => draw(pen(c)))
}

function cachedCtx(key: string, w: number, h: number, draw: (c: Ctx) => void): HTMLCanvasElement {
  let cv = spriteCache.get(key)
  if (!cv) {
    const [nc, c] = canvas(w, h)
    draw(c)
    cv = nc
    spriteCache.set(key, cv)
  }
  return cv
}

/** A dark outline round everything opaque (alpha > 200), like the characters have. */
export function outlineCanvas(c: Ctx, w: number, h: number, color = [0x1c, 0x33, 0x1c]) {
  const img = c.getImageData(0, 0, w, h)
  const d = img.data
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 200
  const out: number[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push(x, y)
    }
  for (let i = 0; i < out.length; i += 2) {
    const o = (out[i + 1] * w + out[i]) * 4
    d[o] = color[0]
    d[o + 1] = color[1]
    d[o + 2] = color[2]
    d[o + 3] = 255
  }
  c.putImageData(img, 0, 0)
}

interface Greens {
  deep: string
  dark: string
  mid: string
  light: string
  glint: string
}

const LEAVES: Greens[] = [
  { deep: '#1b4a24', dark: '#27692c', mid: '#3a8d34', light: '#5cb13f', glint: '#8ed457' },
  { deep: '#1d4a22', dark: '#2c6e2a', mid: '#46972f', light: '#6dbb3a', glint: '#a6dc58' },
  { deep: '#1a4626', dark: '#245f30', mid: '#357f3a', light: '#529f45', glint: '#7fc75e' },
]

/** One clump of leaves: a shaded mound with little individual leaves on it. */
function leafClump(f: Pen, cx: number, cy: number, r: number, g: Greens, seed: number) {
  disc(f, cx + 0.6, cy + 1.2, r, r * 0.86, g.dark)
  disc(f, cx, cy, r * 0.88, r * 0.72, g.mid)
  disc(f, cx - r * 0.3, cy - r * 0.38, r * 0.42, r * 0.3, g.light)
  const n = Math.round(r * 1.8)
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i, 401) * Math.PI * 2
    const d = Math.sqrt(hash(i, seed, 402)) * r * 0.85
    const lx = Math.round(cx + Math.cos(a) * d)
    const ly = Math.round(cy + Math.sin(a) * d * 0.8)
    const top = ly < cy - r * 0.35
    // A leaf: two lit pixels with a dark one tucked under.
    f(top ? g.glint : g.light, lx, ly, 2, 1)
    f(top ? g.light : g.dark, lx + 1, ly + 1, 1, 1)
  }
  // A darker crease along the bottom of the clump.
  for (let x = Math.round(cx - r * 0.6); x < cx + r * 0.6; x += 2)
    f(g.deep, x, Math.round(cy + r * 0.72 + hash(x, seed, 403) * 1.5), 1, 1)
}

/*
 * Trees are 64/*
 * Trees are 64×80 (about 3.3 characters tall), pines 48×80. Both stand on a single tile: the
 * trunk is centred on it and the rest of the sprite rises above and around it.
 */
export const TREE_W = 64
export const TREE_H = 80
export const PINE_W = 48

function treeSprite(variant: number): HTMLCanvasElement {
  return cachedCtx(`tree${variant}`, TREE_W, TREE_H, (c) => {
    const f = pen(c)
    const g = LEAVES[variant % LEAVES.length]
    // Trunk with bark, and roots that spread into the grass.
    f('#5a341b', 27, 46, 10, 31)
    f('#7a4a26', 28, 46, 6, 31)
    f('#94603a', 29, 50, 2, 24)
    for (let y = 50; y < 76; y += 4) {
      f('#5a341b', 30 + (y % 8 === 2 ? 2 : 0), y, 1, 2)
      f('#a87348', 28, y + 1, 1, 1)
    }
    f('#5a341b', 23, 74, 18, 3)
    f('#7a4a26', 24, 74, 4, 2)
    f('#5a341b', 20, 76, 5, 2)
    f('#5a341b', 39, 76, 5, 2)
    f('#7a4a26', 36, 74, 4, 2)
    // Canopy: a deep-green mass, then clumps of leaves from the back (top) to the front.
    disc(f, 32, 31, 28, 25, g.deep)
    disc(f, 32, 52, 17, 6, g.deep)
    const clumps: [number, number, number][] = []
    for (let row = 0; row < 6; row++) {
      const y = 9 + row * 8
      const half = Math.sqrt(Math.max(0, 1 - ((y - 31) / 27) ** 2)) * 25
      const n = Math.max(1, Math.round(half / 7))
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1)
        const x = 32 - half + 4 + t * (half * 2 - 8) + (hash(row, i, variant) - 0.5) * 4
        clumps.push([x, y + (hash(i, row, variant + 9) - 0.5) * 3, 7 + hash(row, i, 77) * 2.5])
      }
    }
    clumps.forEach(([x, y, r], i) => leafClump(f, x, y, r, g, variant * 100 + i))
    if (variant === 2)
      for (let i = 0; i < 14; i++) {
        const ax = 10 + Math.floor(hash(i, 7) * 44)
        const ay = 12 + Math.floor(hash(7, i) * 36)
        f('#a8202a', ax, ay + 1, 3, 2)
        f('#e8473d', ax, ay, 3, 2)
        f('#ffb0a0', ax, ay, 1, 1)
      }
    outlineCanvas(c, TREE_W, TREE_H)
    // Shadow on the ground, under the outline.
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.22)', 14, 75, 36, 4)
    c.globalCompositeOperation = 'source-over'
  })
}

function pineSprite(): HTMLCanvasElement {
  return cachedCtx('pine', PINE_W, TREE_H, (c) => {
    const f = pen(c)
    f('#5a341b', 21, 62, 6, 15)
    f('#7a4a26', 22, 62, 3, 15)
    f('#5a341b', 18, 75, 12, 2)
    // Five tiers of needles, each with a jagged hem, lit on the left.
    for (let i = 0; i < 5; i++) {
      const top = 1 + i * 12
      const rows = 19
      for (let r = 0; r < rows; r++) {
        const half = Math.min(22, Math.floor(3 + (r + i * 3) * 0.82))
        const y = top + r
        f('#1f5a2c', 24 - half, y, half * 2, 1)
        f('#2f7a36', 24 - half, y, Math.floor(half * 1.3), 1)
        f('#47993f', 24 - half + 1, y, Math.max(1, Math.floor(half * 0.6)), 1)
        // Needle tufts.
        if (r % 3 === 1)
          for (let x = 24 - half + 2; x < 24 + half - 2; x += 4)
            f(x < 24 ? '#6cbc4f' : '#2a6d33', x + (r % 2), y, 2, 1)
      }
      // Jagged hem.
      const half = Math.min(22, Math.floor(3 + (rows - 1 + i * 3) * 0.82))
      for (let x = 24 - half; x < 24 + half; x += 3)
        f('#1f5a2c', x, top + rows, 2, 1 + Math.floor(hash(x, i, 501) * 2))
    }
    outlineCanvas(c, PINE_W, TREE_H)
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.22)', 12, 75, 24, 4)
    c.globalCompositeOperation = 'source-over'
  })
}

function bushSprite(berries: boolean): HTMLCanvasElement {
  return cachedCtx(`bush${berries}`, 20, 18, (c) => {
    const f = pen(c)
    const g = LEAVES[1]
    disc(f, 10, 10, 9, 7, g.deep)
    leafClump(f, 6, 10, 5, g, 11)
    leafClump(f, 14, 10, 5, g, 12)
    leafClump(f, 10, 7, 5.5, g, 13)
    if (berries)
      for (const [dx, dy] of [
        [5, 9],
        [12, 6],
        [14, 11],
        [8, 12],
      ]) {
        f('#a3203f', dx, dy + 1, 2, 1)
        f('#e2456a', dx, dy, 2, 1)
      }
    outlineCanvas(c, 20, 18)
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.2)', 3, 15, 14, 3)
    c.globalCompositeOperation = 'source-over'
  })
}

/** A picket fence post (16×22, drawn 6px above its tile) with rails towards its neighbours. */
function fenceSprite(l: boolean, r: boolean, u: boolean, d: boolean): HTMLCanvasElement {
  return cachedCtx(`fence${+l}${+r}${+u}${+d}`, 16, 22, (c) => {
    const f = pen(c)
    const rail = (x: number, y: number, w: number) => {
      f('#a0703f', x, y, w, 3)
      f('#c08a52', x, y, w, 1)
      f('#7d5530', x, y + 2, w, 1)
    }
    // Rails run behind the post: left and right halves, or up and down.
    if (l) {
      rail(0, 10, 8)
      rail(0, 15, 8)
    }
    if (r) {
      rail(8, 10, 8)
      rail(8, 15, 8)
    }
    if (u) {
      f('#7d5530', 6, 0, 4, 10)
      f('#a0703f', 7, 0, 2, 10)
    }
    if (d) {
      f('#7d5530', 6, 14, 4, 8)
      f('#a0703f', 7, 14, 2, 8)
    }
    // The post: a rounded top, lit left side, wood grain and a nail on each rail.
    f('#b98450', 5, 3, 6, 17)
    f('#d9a46c', 5, 3, 2, 17)
    f('#8a5d34', 10, 3, 1, 17)
    f('#b98450', 6, 2, 4, 1)
    f('#e6b77e', 6, 2, 2, 1)
    f('#8a5d34', 7, 8, 1, 3)
    f('#8a5d34', 8, 14, 1, 2)
    if (l || r) {
      f('#4a3a30', 7, 11, 1, 1)
      f('#4a3a30', 7, 16, 1, 1)
    }
    outlineCanvas(c, 16, 22, [0x4a, 0x2a, 0x14])
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.18)', 4, 20, 9, 2)
    c.globalCompositeOperation = 'source-over'
  })
}

/** A park bench, 32×24 (drawn 8px above its tiles): wooden slats on dark iron ends. */
function benchSprite(): HTMLCanvasElement {
  return cachedCtx('bench', 32, 24, (c) => {
    const f = pen(c)
    const slat = (y: number, h: number) => {
      f('#9a6438', 2, y, 28, h)
      f('#c48a52', 2, y, 28, 1)
      f('#6e4424', 2, y + h - 1, 28, 1)
      for (let x = 6; x < 28; x += 9) f('#83532d', x, y + 1, 3, 1)
    }
    // Iron ends with a little scroll.
    for (const x of [1, 27]) {
      f('#2e2c38', x, 2, 4, 20)
      f('#4a4858', x, 2, 1, 20)
      f('#2e2c38', x - 1, 20, 6, 2)
      f('#4a4858', x + (x < 16 ? 3 : -1), 12, 2, 2)
    }
    // Backrest, then the seat.
    slat(2, 3)
    slat(6, 3)
    f('#2e2c38', 2, 9, 28, 1)
    slat(11, 4)
    slat(15, 3)
    outlineCanvas(c, 32, 24, [0x2a, 0x1a, 0x10])
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.2)', 2, 21, 29, 3)
    c.globalCompositeOperation = 'source-over'
  })
}

/** A Victorian lamp post, 16×60, its glass at LAMP_LIGHT_Y above the tile. */
function lampSprite(): HTMLCanvasElement {
  return cachedCtx('lamp', 16, 60, (c) => {
    const f = pen(c)
    const iron = '#2c3438'
    const ironL = '#56646a'
    // Base: stepped plinth.
    f(iron, 3, 54, 10, 4)
    f(ironL, 3, 54, 10, 1)
    f(iron, 4, 51, 8, 3)
    f(ironL, 4, 51, 1, 3)
    f(iron, 5, 47, 6, 4)
    // Fluted pole with a ring half way up.
    f(iron, 7, 16, 3, 32)
    f(ironL, 7, 16, 1, 32)
    f(iron, 5, 30, 6, 2)
    f(ironL, 5, 30, 6, 1)
    // Crossbar with little scrolls.
    f(iron, 3, 15, 10, 2)
    f(ironL, 3, 15, 10, 1)
    f(iron, 2, 13, 2, 2)
    f(iron, 12, 13, 2, 2)
    // Lantern: four panes of warm glass in a frame.
    f(iron, 3, 5, 10, 10)
    f('#fbe7a6', 4, 6, 8, 8)
    f('#fff7d6', 4, 6, 3, 4)
    f('#e8c66c', 9, 10, 3, 4)
    f(iron, 7, 6, 2, 8)
    f(iron, 4, 9, 8, 1)
    // Cap and finial.
    f(iron, 2, 3, 12, 2)
    f(ironL, 2, 3, 12, 1)
    f(iron, 4, 1, 8, 2)
    f(iron, 7, 0, 2, 1)
    outlineCanvas(c, 16, 60, [0x14, 0x18, 0x1c])
    c.globalCompositeOperation = 'destination-over'
    pen(c)('rgba(0,0,0,0.2)', 2, 57, 12, 3)
    c.globalCompositeOperation = 'source-over'
  })
}

/** Height of a lamp's glass above the top of its tile, for the night glow. */
export const LAMP_LIGHT_Y = -33

export const FLAT_KINDS = new Set(['exitMat', 'hallRug'])

/** Draws a map object. `px, py` is the top-left of its tile (x, y) in buffer pixels. */
export function drawObject(
  c: Ctx,
  o: Obj,
  px: number,
  py: number,
  time: number,
  fenceAt: (x: number, y: number) => boolean,
) {
  const f = pen(c)
  switch (o.k) {
    case 'tree': {
      const v = Math.floor(hash(o.x, o.y, 4) * 3)
      c.drawImage(treeSprite(v), px + 8 - TREE_W / 2, py + 16 - TREE_H)
      break
    }
    case 'pine':
      c.drawImage(pineSprite(), px + 8 - PINE_W / 2, py + 16 - TREE_H)
      break
    case 'bush':
      c.drawImage(bushSprite(hash(o.x, o.y) < 0.5), px - 2, py - 3)
      break
    case 'fence': {
      const key = [
        fenceAt(o.x - 1, o.y),
        fenceAt(o.x + 1, o.y),
        fenceAt(o.x, o.y - 1),
        fenceAt(o.x, o.y + 1),
      ]
      c.drawImage(fenceSprite(key[0], key[1], key[2], key[3]), px, py - 6)
      break
    }
    case 'home':
      c.drawImage(
        cached(`home${o.w}x${o.h}`, o.w! * TS + PAD * 2, o.h! * TS + PAD_TOP, (g) =>
          drawHome(g, PAD, PAD_TOP, o.w!, o.h!),
        ),
        px - PAD,
        py - PAD_TOP,
      )
      break
    case 'coop':
      c.drawImage(
        cached(`coop${o.w}x${o.h}`, o.w! * TS + PAD * 2, o.h! * TS + PAD_TOP, (g) =>
          drawCoop(g, PAD, PAD_TOP, o.w!, o.h!),
        ),
        px - PAD,
        py - PAD_TOP,
      )
      break
    case 'kitchen':
      c.drawImage(
        cached(`kitchen${o.w}x${o.h}`, o.w! * TS + PAD * 2, o.h! * TS + PAD_TOP, (g) =>
          drawKitchen(g, PAD, PAD_TOP, o.w!, o.h!),
        ),
        px - PAD,
        py - PAD_TOP,
      )
      kitchenSmoke(f, px, py, o.w!, time)
      break
    case 'bench':
      c.drawImage(benchSprite(), px, py - 8)
      break
    case 'lamp':
      // About twice a character's height. LAMP_LIGHT_Y is where the glass is.
      c.drawImage(lampSprite(), px, py - 44)
      break
    case 'flowerbed':
      f('#7a4e2d', px, py + 7, 16, 8)
      f('#9b6a3e', px, py + 7, 16, 2)
      f('#5a3a22', px, py + 14, 16, 1)
      for (let i = 0; i < 5; i++) {
        const fx = px + 1 + i * 3
        const col = FLOWER_COLORS[(o.x + i) % FLOWER_COLORS.length]
        f('#4f8f36', fx + 1, py + 3, 1, 5)
        f(col, fx, py + 2 - (i % 2), 3, 2)
        f('#f5d547', fx + 1, py + 2 - (i % 2))
      }
      break
    case 'sign':
      f('#6b4526', px + 7, py + 6, 2, 9)
      f('#6b4526', px + 1, py, 14, 8)
      f('#c79a63', px + 2, py + 1, 12, 6)
      f('#8a6238', px + 4, py + 3, 8, 1)
      f('#8a6238', px + 4, py + 5, 6, 1)
      break
    case 'pump':
      f('rgba(0,0,0,0.18)', px + 3, py + 13, 10, 2)
      f('#55687a', px + 5, py + 2, 6, 12)
      f('#7890a6', px + 6, py + 2, 2, 12)
      f('#55687a', px + 10, py + 5, 5, 2)
      f('#3c4a57', px + 3, py, 3, 2)
      f('#3c4a57', px + 2, py - 3, 2, 4)
      f('#8a5d34', px + 1, py + 12, 14, 3)
      f('#7fb8e6', px + 2, py + 12, 12, 1)
      break
    case 'mailbox':
      f('#6b4526', px + 7, py + 6, 2, 9)
      f('#c0504d', px + 3, py, 10, 7)
      f('#e07a5f', px + 4, py, 8, 2)
      f('#f2b84b', px + 12, py - 3, 2, 5)
      break
    case 'cart':
      f('rgba(0,0,0,0.18)', px + 1, py + 13, 30, 2)
      f('#8a5d34', px, py + 4, 32, 8)
      f('#b98450', px, py + 4, 32, 2)
      f('#3c3330', px + 4, py + 10, 5, 5)
      f('#3c3330', px + 23, py + 10, 5, 5)
      for (let i = 0; i < 5; i++) {
        const col = ['#e0475b', '#f08a24', '#e5412f', '#ef8a1f', '#7fbf4f'][i]
        disc(f, px + 4 + i * 6, py + 3, 3, 2.5, col)
      }
      f('#c0504d', px - 1, py - 12, 34, 3)
      f('#fff6e6', px + 3, py - 12, 4, 3)
      f('#fff6e6', px + 11, py - 12, 4, 3)
      f('#fff6e6', px + 19, py - 12, 4, 3)
      f('#fff6e6', px + 27, py - 12, 4, 3)
      f('#6b4526', px, py - 9, 2, 13)
      f('#6b4526', px + 30, py - 9, 2, 13)
      break
    case 'hallDoor':
      f('#5b4030', px + 1, py + 1, 14, 31)
      f('#9a6a40', px + 2, py + 2, 12, 30)
      f('#85582f', px + 4, py + 5, 8, 9)
      f('#85582f', px + 4, py + 17, 8, 11)
      f('#f2d07a', px + 11, py + 17, 2, 2)
      f('#f4ecd8', px + 5, py - 2, 6, 3)
      break
    case 'window':
      f('#fff8ef', px + 1, py + 2, 14, 12)
      f('#9fc7e6', px + 2, py + 3, 12, 10)
      f('#c6e1f3', px + 3, py + 4, 3, 2)
      f('#fff8ef', px + 7, py + 3, 1, 10)
      f('#d98b8b', px, py + 1, 3, 13)
      f('#d98b8b', px + 13, py + 1, 3, 13)
      f('#7d5a3c', px - 1, py + 1, 18, 1)
      break
    case 'exitMat':
      f('#8a4f4f', px + 1, py + 2, (o.w ?? 1) * 16 - 2, 10)
      f('#a86565', px + 2, py + 3, (o.w ?? 1) * 16 - 4, 1)
      break
    case 'hallRug':
      f('#5b6fb5', px, py + 2, (o.w ?? 1) * 16, 12)
      f('#f2b84b', px + 1, py + 3, (o.w ?? 1) * 16 - 2, 1)
      f('#f2b84b', px + 1, py + 12, (o.w ?? 1) * 16 - 2, 1)
      for (let i = 4; i < (o.w ?? 1) * 16 - 4; i += 6) f('#8e9fd8', px + i, py + 7, 3, 2)
      break
    case 'desk':
      f('rgba(0,0,0,0.15)', px, py + 14, 48, 2)
      f('#7d5a3c', px, py + 2, 48, 13)
      f('#a87d52', px - 1, py, 50, 3)
      f('#6b4b33', px + 4, py + 6, 40, 1)
      f('#3c3a46', px + 32, py - 9, 10, 8)
      f('#7fb8e6', px + 33, py - 8, 8, 6)
      f('#3c3a46', px + 36, py - 1, 2, 1)
      f('#f2b84b', px + 8, py - 2, 4, 2)
      f('#c7a4ef', px + 20, py - 4, 3, 3)
      f('#f6a5c0', px + 23, py - 5, 3, 3)
      f('#4f8f36', px + 22, py - 1, 2, 1)
      break
    case 'plant':
      f('#b86a43', px + 4, py + 9, 8, 6)
      f('#cf8458', px + 4, py + 9, 8, 2)
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45
        for (let r = 0; r < 9; r++)
          f(
            i % 2 ? '#3f8a3a' : '#46a83a',
            px + 8 + Math.round(Math.cos(a) * r),
            py + 9 + Math.round(Math.sin(a) * r * 1.4),
          )
      }
      break
    case 'chairs':
      for (let i = 0; i < 3; i++) {
        const cx = px + i * 16
        f('#5b6fb5', cx + 2, py - 4, 12, 9)
        f('#4a5c9a', cx + 2, py + 5, 12, 5)
        f('#3c3330', cx + 3, py + 10, 2, 5)
        f('#3c3330', cx + 11, py + 10, 2, 5)
      }
      break
  }
}

/** Room around a building sprite for overhangs and chimneys. */
const PAD = 8
const PAD_TOP = 18

interface RoofColors {
  base: string[]
  dark: string
  light: string
  gap: string
}

/** Rows of overlapping shingles, each one shaded, with a little colour variation. */
function shingles(
  f: Pen,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: RoofColors,
  seed: number,
) {
  f(r.gap, x0, y0, w, h)
  for (let row = 0, y = y0; y < y0 + h; row++, y += 5) {
    const off = row % 2 ? 4 : 0
    for (let x = x0 - off; x < x0 + w; x += 8) {
      const sx = Math.max(x0, x)
      const sw = Math.min(x + 7, x0 + w) - sx
      if (sw <= 0) continue
      const col = r.base[Math.floor(hash(x, row, seed) * r.base.length)]
      const sh = Math.min(5, y0 + h - y)
      f(col, sx, y, sw, sh)
      f(r.light, sx, y, sw, 1)
      if (sh >= 4) f(r.dark, sx, y + sh - 1, sw, 1)
      // Rounded bottom corners.
      if (sh >= 4 && sw >= 6) {
        f(r.gap, sx, y + sh - 1, 1, 1)
        f(r.gap, sx + sw - 1, y + sh - 1, 1, 1)
      }
    }
  }
}

function bricks(
  f: Pen,
  x0: number,
  y0: number,
  w: number,
  h: number,
  cols: string[],
  mortar: string,
  seed: number,
) {
  f(mortar, x0, y0, w, h)
  for (let row = 0, y = y0; y < y0 + h; row++, y += 4) {
    const off = row % 2 ? 4 : 0
    for (let x = x0 - off; x < x0 + w; x += 8) {
      const bx = Math.max(x0, x)
      const bw = Math.min(x + 7, x0 + w) - bx
      if (bw <= 0) continue
      const col = cols[Math.floor(hash(x, row, seed) * cols.length)]
      const bh = Math.min(3, y0 + h - y)
      f(col, bx, y, bw, bh)
      f(shade(col, 0.07), bx, y, bw, 1)
    }
  }
}

function chimney(f: Pen, x: number, y: number, w: number, h: number) {
  bricks(f, x, y + 3, w, h - 3, ['#a5452e', '#b6533a', '#954029'], '#6e2e1e', x)
  f('#4b4644', x - 1, y, w + 2, 3)
  f('#6c6562', x - 1, y, w + 2, 1)
  f('#231c1c', x + 2, y + 1, w - 4, 1)
  f('rgba(0,0,0,0.25)', x + w - 2, y + 3, 2, h - 3)
}

function drawHome(f: Pen, px: number, py: number, w: number, h: number) {
  const W = w * TS
  const roofH = 4 * TS
  const wallY = py + roofH
  const wallH = (h - 4) * TS
  chimney(f, px + 40, py - 12, 12, 22)
  chimney(f, px + W - 56, py - 8, 12, 18)
  // Roof: terracotta shingles, a ridge cap and a fascia board with a shadow under it.
  shingles(
    f,
    px - 4,
    py + 2,
    W + 8,
    roofH - 2,
    {
      base: ['#b4533a', '#a9492f', '#bd5c40', '#a44730'],
      dark: '#7a3324',
      light: '#d77457',
      gap: '#6a2a1c',
    },
    7,
  )
  f('#7a3324', px - 4, py, W + 8, 3)
  f('#c9684b', px - 4, py, W + 8, 1)
  f('#5e2a1e', px - 5, py + roofH, W + 10, 3)
  f('#8a4a2c', px - 5, py + roofH, W + 10, 1)
  // Gable sign board with a gold trim.
  const mid = px + W / 2
  f('#5a3a22', mid - 39, py + 24, 78, 18)
  f('#c79a63', mid - 37, py + 26, 74, 14)
  f('#dcb27a', mid - 37, py + 26, 74, 2)
  f('#a87a48', mid - 37, py + 38, 74, 2)
  f('#f2b84b', mid - 36, py + 27, 72, 1)
  for (const sx of [mid - 35, mid + 33]) f('#8a6a3a', sx, py + 31, 2, 2)
  // Walls: siding boards, each with a lit top edge and a shadow under it.
  f('#f6d58e', px, wallY, W, wallH)
  for (let y = 3; y < wallH - 6; y += 5) {
    f('#fce6b0', px, wallY + y, W, 1)
    f('#dfae63', px, wallY + y + 3, W, 1)
    f('#e9c27c', px, wallY + y + 4, W, 1)
  }
  // Shadow from the eaves.
  f('rgba(80,40,10,0.22)', px, wallY + 3, W, 3)
  // Corner and centre trim boards.
  for (const tx of [px, px + W - 4, px + 108, px + W - 112]) {
    f('#fff3d6', tx, wallY + 3, 4, wallH - 9)
    f('#d9c39a', tx + 3, wallY + 3, 1, wallH - 9)
  }
  // Stone foundation.
  f('#8c8170', px, wallY + wallH - 6, W, 6)
  for (let x = 0; x < W; x += 6) {
    const sx = px + x + (hash(x, 3, 601) < 0.5 ? 0 : 1)
    f('#b3a893', sx, wallY + wallH - 5, 5, 2)
    f('#a09580', sx + 2, wallY + wallH - 3, 4, 2)
  }
  // Windows.
  for (const wx of homeWindows(W)) window2(f, px + wx, wallY + 8, true)
  // Porch roof on posts, and a panelled double door with glass.
  const dx = px + HOME_DOOR_PX
  f('#5e2a1e', dx - 7, wallY + 1, 46, 4)
  f('#b4533a', dx - 7, wallY - 2, 46, 3)
  f('#d77457', dx - 7, wallY - 2, 46, 1)
  for (const postX of [dx - 5, dx + 34]) {
    f('#fff3d6', postX, wallY + 5, 3, wallH - 9)
    f('#d9c39a', postX + 2, wallY + 5, 1, wallH - 9)
  }
  f('#2d4a33', dx - 1, wallY + 10, 34, wallH - 14)
  for (const leaf of [dx, dx + 16]) {
    f('#4f7a52', leaf, wallY + 11, 16, wallH - 15)
    f('#5f8f62', leaf, wallY + 11, 16, 1)
    f('#a6d4f2', leaf + 3, wallY + 14, 10, 8)
    f('#d6eefc', leaf + 4, wallY + 15, 3, 2)
    f('#2d4a33', leaf + 7, wallY + 14, 1, 8)
    // Lower panels.
    for (const py2 of [wallY + 26, wallY + 38]) {
      f('#3e6442', leaf + 3, py2, 10, 9)
      f('#6a9a6d', leaf + 3, py2, 10, 1)
      f('#2d4a33', leaf + 3, py2 + 8, 10, 1)
    }
  }
  f('#f2c94c', dx + 13, wallY + 32, 2, 2)
  f('#f2c94c', dx + 17, wallY + 32, 2, 2)
  // Doorstep.
  f('#b3a893', dx - 3, wallY + wallH - 4, 38, 4)
  f('#d2c8b2', dx - 3, wallY + wallH - 4, 38, 1)
}

const HOME_DOOR_PX = (23 - 14) * TS

/** x offsets (from the home's left edge) of its front windows. */
function homeWindows(W: number): number[] {
  const out: number[] = []
  for (let x = 12; x < W - 12; x += 32) {
    if (x > HOME_DOOR_PX - 28 && x < HOME_DOOR_PX + 40) continue
    out.push(x)
  }
  return out
}

/**
 * Window panes of a building, in buffer pixels relative to its top-left, so they can glow
 * warmly at night (the home's lights).
 */
export function buildingWindows(o: Obj): { x: number; y: number; w: number; h: number }[] {
  if (o.k === 'home')
    return homeWindows(o.w! * TS).map((x) => ({ x: x + 2, y: 4 * TS + 10, w: 16, h: 16 }))
  if (o.k === 'kitchen') {
    const W = o.w! * TS
    return [10, W - 30].map((x) => ({ x: x + 2, y: 3 * TS + 18, w: 16, h: 16 }))
  }
  return []
}

function window2(f: Pen, x: number, y: number, shutters = false) {
  if (shutters) {
    for (const sx of [x - 6, x + 21]) {
      f('#245f40', sx, y, 5, 20)
      f('#2f7a52', sx, y, 4, 20)
      f('#3f9666', sx, y, 4, 1)
      for (let r = 3; r < 19; r += 3) {
        f('#245f40', sx + 1, y + r, 3, 1)
        f('#3f9666', sx + 1, y + r - 1, 3, 1)
      }
    }
  }
  // Frame with a shadow on its lower right.
  f('#fff8ef', x, y, 20, 20)
  f('#d8cbb0', x + 19, y + 1, 1, 19)
  f('#d8cbb0', x + 1, y + 19, 19, 1)
  // Glass: sky reflection with a diagonal glint, and curtains tied back.
  f('#4f98d8', x + 2, y + 2, 16, 16)
  f('#6fb2ea', x + 2, y + 2, 16, 6)
  f('#c9e7fb', x + 4, y + 4, 2, 1)
  f('#c9e7fb', x + 3, y + 5, 2, 1)
  f('#c9e7fb', x + 12, y + 11, 2, 1)
  f('#e88aa0', x + 2, y + 2, 3, 9)
  f('#e88aa0', x + 15, y + 2, 3, 9)
  f('#c9657e', x + 4, y + 2, 1, 9)
  f('#c9657e', x + 15, y + 2, 1, 9)
  f('#fff8ef', x + 9, y + 2, 2, 16)
  f('#fff8ef', x + 2, y + 9, 16, 2)
  // Sill and flower box.
  f('#fff3d6', x - 2, y + 19, 24, 2)
  f('#8a5a35', x - 1, y + 21, 22, 4)
  f('#a8703f', x - 1, y + 21, 22, 1)
  f('#6b4526', x - 1, y + 24, 22, 1)
  for (let i = 0; i < 6; i++) {
    f('#3f8f36', x + i * 3 + 1, y + 19, 1, 2)
    f(FLOWER_COLORS[i % FLOWER_COLORS.length], x + i * 3, y + 18, 2, 2)
  }
}

/** Where the henhouse's nest boxes are, from its top-left (for drawing the eggs in them). */
export const NEST_SLOTS = [
  { x: 5, y: 47 },
  { x: 18, y: 47 },
  { x: 31, y: 47 },
]

function drawCoop(f: Pen, px: number, py: number, w: number, h: number) {
  const W = w * TS
  const H = h * TS
  const roofH = 26
  // Roof: red shingles with a ridge cap and a shadow under the eaves.
  shingles(
    f,
    px - 3,
    py + 2,
    W + 6,
    roofH - 2,
    {
      base: ['#c0473a', '#b43f33', '#c95244'],
      dark: '#832b22',
      light: '#e26a5a',
      gap: '#6e231c',
    },
    13,
  )
  f('#832b22', px - 3, py, W + 6, 3)
  f('#e26a5a', px - 3, py, W + 6, 1)
  f('#5e1e18', px - 4, py + roofH, W + 8, 2)
  // Whitewashed plank walls.
  const wy = py + roofH + 2
  const wh = H - roofH - 2
  f('#efe6d2', px, wy, W, wh)
  for (let x = 0; x < W; x += 6) {
    f('#d6c9ad', px + x + 5, wy, 1, wh)
    f('#fbf5e8', px + x, wy, 1, wh)
  }
  f('rgba(80,30,10,0.22)', px, wy, W, 3)
  // A little round window up top.
  f('#6b4526', px + 26, wy + 4, 10, 8)
  f('#5fa8e6', px + 27, wy + 5, 8, 6)
  f('#c9e7fb', px + 28, wy + 6, 2, 2)
  f('#6b4526', px + 30, wy + 5, 1, 6)
  // Three nest boxes full of straw along the front.
  for (const n of NEST_SLOTS) {
    const nx = px + n.x - 3
    const ny = py + n.y - 6
    f('#6b4526', nx, ny, 12, 11)
    f('#a0703f', nx + 1, ny + 1, 10, 9)
    f('#4a2c16', nx + 2, ny + 2, 8, 5)
    f('#e8c860', nx + 2, ny + 5, 8, 3)
    f('#f6dc84', nx + 3, ny + 5, 2, 1)
    f('#c9a43e', nx + 7, ny + 6, 2, 1)
    f('#c08a52', nx, ny, 12, 1)
  }
  // The hens' door with a ramp down into the run.
  const dx = px + W - 16
  f('#4a2c16', dx, wy + 14, 11, wh - 14)
  f('#2a1a10', dx + 1, wy + 15, 9, wh - 15)
  f('#a0703f', dx - 1, py + H - 3, 13, 3)
  for (let i = 0; i < 13; i += 3) f('#7d5530', dx - 1 + i, py + H - 3, 1, 3)
  // Foundation.
  f('#8c8170', px, py + H - 2, W - 18, 2)
}

function kitchenSmoke(f: Pen, px: number, py: number, w: number, time: number) {
  const W = w * TS
  for (let i = 0; i < 3; i++) {
    const t = (time / 1400 + i / 3) % 1
    const s = 3 + Math.floor(t * 4)
    f(
      `rgba(240,240,240,${0.6 * (1 - t)})`,
      px + W - 26 + Math.round(Math.sin(t * 6 + i) * 3),
      py - 18 - t * 26,
      s,
      s,
    )
  }
}

function drawKitchen(f: Pen, px: number, py: number, w: number, h: number) {
  const W = w * TS
  const roofH = 3 * TS
  const wallY = py + roofH
  const wallH = (h - 3) * TS
  chimney(f, px + W - 30, py - 14, 12, 22)
  shingles(
    f,
    px - 4,
    py + 2,
    W + 8,
    roofH - 2,
    {
      base: ['#3f8a8c', '#478f90', '#377d80', '#4c9799'],
      dark: '#245a5c',
      light: '#6fb6b6',
      gap: '#1d4547',
    },
    9,
  )
  f('#245a5c', px - 4, py, W + 8, 3)
  f('#6fb6b6', px - 4, py, W + 8, 1)
  f('#1f3f40', px - 5, py + roofH, W + 10, 3)
  // Brick walls, each brick a little different.
  bricks(
    f,
    px,
    wallY,
    W,
    wallH,
    ['#b5603f', '#c06a47', '#a95638', '#bb6444', '#9f4f33'],
    '#7e3f2a',
    3,
  )
  f('rgba(60,20,10,0.25)', px, wallY + 3, W, 2)
  // Striped awning with a scalloped hem and a shadow under it.
  f('rgba(60,20,10,0.3)', px + 2, wallY + 12, W - 4, 3)
  for (let x = 0; x < W; x += 8) {
    const red = x % 16 === 0
    f(red ? '#d4423c' : '#fff6e6', px + x, wallY + 2, 8, 8)
    f(red ? '#e8655e' : '#ffffff', px + x, wallY + 2, 8, 1)
    f(red ? '#a8302c' : '#e6dcc6', px + x + 7, wallY + 3, 1, 7)
    // Scallop.
    f(red ? '#d4423c' : '#fff6e6', px + x + 1, wallY + 10, 6, 1)
    f(red ? '#d4423c' : '#fff6e6', px + x + 2, wallY + 11, 4, 1)
  }
  window2(f, px + 10, wallY + 16)
  window2(f, px + W - 30, wallY + 16)
  // A panelled door with a little window and a brass handle.
  const dx = px + (40 - 36) * TS
  f('#4a3020', dx - 2, wallY + 21, 20, wallH - 21)
  f('#8a5a35', dx, wallY + 23, 16, wallH - 23)
  f('#a06c40', dx, wallY + 23, 16, 1)
  f('#a6d4f2', dx + 4, wallY + 26, 8, 6)
  f('#d6eefc', dx + 5, wallY + 27, 2, 1)
  f('#6b4526', dx + 3, wallY + 35, 10, 8)
  f('#a06c40', dx + 3, wallY + 35, 10, 1)
  f('#f2c94c', dx + 12, wallY + 38, 2, 2)
  f('#b3a893', dx - 3, wallY + wallH - 3, 22, 3)
  f('#d2c8b2', dx - 3, wallY + wallH - 3, 22, 1)
}

// --- furniture -----------------------------------------------------------------------------------

/** Draws a piece of furniture whose footprint's top-left tile is at (px, py). */
export function drawFurniture(c: Ctx, k: string, px: number, py: number, time: number) {
  const f = pen(c)
  const def = FURNITURE[k]
  if (!def) return
  const W = def.w * TS
  const H = def.h * TS
  const shadow = () => f('rgba(0,0,0,0.16)', px + 1, py + H - 3, W - 2, 3)
  switch (k) {
    case 'bed':
      shadow()
      f('#5e3d24', px + 1, py - 6, 30, 12)
      f('#7a5233', px + 2, py - 5, 28, 10)
      f('#94673f', px + 2, py - 5, 28, 2)
      f('#fffaf0', px + 4, py + 4, 24, 7)
      f('#e8dfcc', px + 4, py + 9, 24, 2)
      for (let y = 0; y < 30; y += 5)
        for (let x = 0; x < 28; x += 5) {
          const col = ['#d98b8b', '#8aa3c2', '#f3e6c8', '#a8bf8e'][((x + y) / 5) % 4]
          f(col, px + 2 + x, py + 12 + y, 5, 5)
        }
      f('#5e3d24', px + 1, py + 42, 30, 5)
      break
    case 'nightstand':
      shadow()
      f('#6b4526', px + 2, py + 2, 12, 12)
      f('#8a5d34', px + 3, py + 3, 10, 5)
      f('#8a5d34', px + 3, py + 9, 10, 4)
      f('#f2d07a', px + 7, py + 5, 2, 1)
      f('#f2d07a', px + 7, py + 10, 2, 1)
      f('#5b4030', px + 7, py - 2, 2, 4)
      f('#f3d38a', px + 4, py - 8, 8, 6)
      f('#e3bd6a', px + 4, py - 3, 8, 1)
      break
    case 'photos':
      for (const [x, y, w, h] of [
        [2, 2, 5, 6],
        [8, 1, 6, 5],
        [9, 8, 5, 5],
      ]) {
        f('#7a5233', px + x, py + y, w, h)
        f('#e8dcc6', px + x + 1, py + y + 1, w - 2, h - 2)
        f('#8a6a5a', px + x + 2, py + y + 2, 1, 1)
      }
      break
    case 'fern':
      shadow()
      f('#b86a43', px + 4, py + 8, 8, 7)
      f('#cf8458', px + 3, py + 8, 10, 2)
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42
        for (let r = 0; r < 10; r++)
          f(
            i % 2 ? '#3f8a3a' : '#69c244',
            px + 8 + Math.round(Math.cos(a) * r),
            py + 8 + Math.round(Math.sin(a) * r * 1.2),
          )
      }
      break
    case 'basket':
      shadow()
      f('#b88a4f', px + 2, py + 7, 12, 7)
      for (let x = 2; x < 14; x += 2) f('#9a713c', px + x, py + 7, 1, 7)
      disc(f, px + 5, py + 6, 2.5, 2.5, '#c56a9a')
      disc(f, px + 10, py + 6, 2.5, 2.5, '#4f8fa8')
      f('#d8cfbd', px + 8, py, 1, 7)
      f('#d8cfbd', px + 11, py + 1, 1, 6)
      break
    case 'painting':
      f('#b8862f', px + 1, py + 1, 14, 13)
      f('#f2d07a', px + 1, py + 1, 14, 1)
      f('#f6efd9', px + 3, py + 3, 10, 9)
      f('#4f8f36', px + 7, py + 7, 1, 4)
      disc(f, px + 6, py + 6, 1.5, 1.5, '#e0475b')
      disc(f, px + 10, py + 5, 1.5, 1.5, '#f6c636')
      f('#4f8f36', px + 10, py + 7, 1, 4)
      break
    case 'wallclock': {
      disc(f, px + 8, py + 8, 6.5, 6.5, '#6b4526')
      disc(f, px + 8, py + 8, 5, 5, '#fff8ef')
      const now = new Date()
      const hA = ((now.getHours() % 12) / 12 + now.getMinutes() / 720) * Math.PI * 2
      const mA = (now.getMinutes() / 60) * Math.PI * 2
      for (let r = 0; r < 3; r++)
        f('#1e2140', px + 8 + Math.round(Math.sin(hA) * r), py + 8 - Math.round(Math.cos(hA) * r))
      for (let r = 0; r < 5; r++)
        f('#b4533a', px + 8 + Math.round(Math.sin(mA) * r), py + 8 - Math.round(Math.cos(mA) * r))
      break
    }
    case 'lamp':
      shadow()
      f('#3c3330', px + 5, py + 12, 6, 3)
      f('#3c3330', px + 7, py - 6, 2, 18)
      f('#f3d38a', px + 2, py - 14, 12, 9)
      f('#e3bd6a', px + 2, py - 6, 12, 1)
      f('#fff1c4', px + 4, py - 13, 3, 6)
      break
    case 'armchair':
      shadow()
      f('#8a3f4a', px + 1, py - 6, 14, 12)
      f('#b5566a', px + 2, py - 5, 12, 10)
      f('#8a3f4a', px, py + 2, 4, 11)
      f('#8a3f4a', px + 12, py + 2, 4, 11)
      f('#c96a7f', px + 3, py + 4, 10, 7)
      f('#5e3d24', px + 2, py + 13, 2, 2)
      f('#5e3d24', px + 12, py + 13, 2, 2)
      break
    case 'rug': {
      const cx = px + W / 2
      const cy = py + H / 2
      const rings = ['#8a4f4f', '#e0b84a', '#4f8fa8', '#c56a9a', '#efe2c4', '#6f9e4f']
      rings.forEach((col, i) => disc(f, cx, cy, W / 2 - 1 - i * 3, H / 2 - 1 - i * 2.2, col))
      break
    }
    case 'table':
      shadow()
      f('#6b4526', px + 4, py + 6, 2, 9)
      f('#6b4526', px + 26, py + 6, 2, 9)
      f('#8a5d34', px + 1, py + 2, 30, 6)
      f('#fff8ef', px + 2, py + 1, 28, 2)
      f('#5b6fb5', px + 7, py - 4, 7, 5)
      f('#5b6fb5', px + 14, py - 3, 2, 2)
      f('#fff8ef', px + 20, py - 1, 4, 2)
      f('#fff8ef', px + 25, py - 1, 4, 2)
      break
    case 'rocker': {
      const rock = Math.round(Math.sin(time / 600) * 1)
      shadow()
      f('#6b4526', px + 2, py + 13 + rock, 12, 2)
      f('#7a5233', px + 3, py - 8 + rock, 2, 21)
      f('#7a5233', px + 11, py - 8 + rock, 2, 21)
      for (let y = -6; y < 4; y += 3) f('#94673f', px + 4, py + y + rock, 8, 1)
      f('#c0504d', px + 3, py + 5 + rock, 10, 4)
      f('#d8873f', px + 4, py + 5 + rock, 8, 1)
      break
    }
    case 'puzzle':
      shadow()
      f('#6b4526', px + 3, py + 8, 2, 7)
      f('#6b4526', px + 27, py + 8, 2, 7)
      f('#a87d52', px, py + 1, 32, 8)
      for (let i = 0; i < 14; i++) {
        const col = ['#4f8fa8', '#6f9e4f', '#e0b84a', '#c0504d'][i % 4]
        f(col, px + 2 + Math.floor(hash(i, 3) * 26), py + 2 + Math.floor(hash(3, i) * 5), 3, 2)
      }
      break
    case 'landscape':
      f('#b8862f', px + 1, py + 2, 30, 12)
      f('#9fc7e6', px + 3, py + 4, 26, 8)
      f('#8a8fb5', px + 6, py + 6, 6, 3)
      f('#8a8fb5', px + 9, py + 5, 3, 1)
      f('#5b6091', px + 14, py + 5, 8, 4)
      f('#4b93d1', px + 3, py + 9, 26, 3)
      f('#6f9e4f', px + 3, py + 11, 26, 1)
      f('#f2b84b', px + 24, py + 5, 2, 2)
      break
    case 'bookshelf':
      shadow()
      f('#5e3d24', px, py - 18, 32, 33)
      f('#7a5233', px + 2, py - 16, 28, 29)
      for (const shelf of [-16, -6, 4]) {
        f('#5e3d24', px + 2, py + shelf + 9, 28, 1)
        for (let x = 0; x < 26; x += 3) {
          const h = 6 + Math.floor(hash(x, shelf) * 3)
          const col = ['#c0504d', '#4f8fa8', '#e0b84a', '#6f9e4f', '#8e62a8', '#efe2c4'][
            Math.floor(hash(shelf, x) * 6)
          ]
          f(col, px + 3 + x, py + shelf + 9 - h, 2, h)
        }
      }
      break
    case 'quilt':
      f('#6b4526', px, py + 1, 32, 2)
      for (let y = 0; y < 12; y += 4)
        for (let x = 0; x < 28; x += 4) {
          const col = ['#d98b8b', '#8aa3c2', '#f3e6c8', '#a8bf8e', '#e0b84a'][((x + y * 3) / 4) % 5]
          f(col, px + 2 + x, py + 3 + y, 4, 4)
        }
      break
    case 'record': {
      shadow()
      f('#6b4526', px + 1, py + 3, 14, 12)
      f('#8a5d34', px + 2, py + 6, 12, 7)
      f('#5e3d24', px + 1, py + 1, 14, 3)
      disc(f, px + 7, py - 1, 5, 2.5, '#1d1b24')
      const a = time / 150
      f('#e07a5f', px + 7 + Math.round(Math.cos(a) * 2), py - 1 + Math.round(Math.sin(a)), 1, 1)
      f('#d8cfbd', px + 12, py - 4, 1, 4)
      break
    }
    case 'tv': {
      shadow()
      f('#6b4526', px + 2, py + 6, 28, 9)
      f('#8a5d34', px + 3, py + 7, 26, 3)
      f('#3c3a46', px + 6, py - 12, 20, 18)
      const flick = Math.floor(time / 900) % 3
      f(['#7fb8e6', '#a8d39a', '#f2d07a'][flick], px + 8, py - 10, 14, 13)
      f('#ffffff', px + 9, py - 9, 3, 2)
      f('#2b2838', px + 23, py - 8, 2, 2)
      f('#2b2838', px + 23, py - 4, 2, 2)
      f('#3c3a46', px + 11, py - 16, 1, 4)
      f('#3c3a46', px + 20, py - 16, 1, 4)
      break
    }
    case 'petbed': {
      shadow()
      disc(f, px + 8, py + 10, 7.5, 5, '#6b3f6b')
      disc(f, px + 8, py + 9.5, 7, 4.5, '#9a5a9a')
      disc(f, px + 8, py + 10.5, 5, 3, '#f2d8e8')
      disc(f, px + 8, py + 11, 4, 2.2, '#e6c2d8')
      f('#c486c4', px + 3, py + 6, 10, 1)
      f('#fff1f8', px + 6, py + 9, 3, 1)
      break
    }
    case 'catbed': {
      shadow()
      disc(f, px + 8, py + 10, 7, 4.5, '#8a4f4f')
      disc(f, px + 8, py + 9, 5.5, 3, '#e8dcc6')
      disc(f, px + 8, py + 7, 5, 3.5, '#e8933f')
      f('#c46f22', px + 5, py + 6, 1, 3)
      f('#c46f22', px + 9, py + 5, 1, 4)
      f('#e8933f', px + 2, py + 4, 4, 4)
      f('#e8933f', px + 2, py + 2, 1, 2)
      f('#e8933f', px + 5, py + 2, 1, 2)
      f('#1e2140', px + 3, py + 6, 2, 1)
      const tail = Math.sin(time / 500) > 0.6 ? -1 : 0
      f('#e8933f', px + 12, py + 6 + tail, 2, 4)
      break
    }
    case 'fishtank': {
      shadow()
      f('#5e3d24', px + 1, py + 8, 30, 7)
      f('#3c4a57', px + 1, py - 10, 30, 18)
      f('#5aa6d6', px + 2, py - 9, 28, 16)
      f('#82c1e6', px + 2, py - 9, 28, 2)
      f('#d9c58e', px + 2, py + 5, 28, 2)
      f('#3f8a3a', px + 5, py - 2, 1, 7)
      f('#3f8a3a', px + 24, py - 4, 1, 9)
      const fx = Math.round(((time / 80) % 40) - 6)
      const fx2 = Math.round(26 - ((time / 110) % 34))
      if (fx > 0 && fx < 25) f('#f08a24', px + 3 + fx, py - 4, 3, 2)
      if (fx2 > 0 && fx2 < 25) f('#f6c636', px + 3 + fx2, py + 1, 3, 2)
      break
    }
    case 'clock': {
      shadow()
      f('#5e3d24', px + 2, py - 20, 12, 35)
      f('#7a5233', px + 3, py - 19, 10, 33)
      disc(f, px + 8, py - 14, 3.5, 3.5, '#fff8ef')
      f('#1e2140', px + 8, py - 16, 1, 3)
      f('#3c2a1e', px + 5, py - 8, 6, 18)
      const swing = Math.round(Math.sin(time / 500) * 2)
      f('#b8862f', px + 8 + swing, py - 7, 1, 10)
      disc(f, px + 8.5 + swing, py + 4, 1.6, 1.6, '#f2d07a')
      break
    }
    case 'piano':
      shadow()
      f('#2b2235', px, py - 14, 32, 29)
      f('#3c3046', px + 1, py - 13, 30, 10)
      f('#fff8ef', px + 2, py - 2, 28, 4)
      for (let x = 3; x < 30; x += 3) f('#1e1a26', px + x, py - 2, 1, 2)
      f('#2b2235', px + 3, py + 8, 3, 7)
      f('#2b2235', px + 26, py + 8, 3, 7)
      f('#f2d07a', px + 12, py - 10, 8, 3)
      break
  }
}

/** A furniture preview for the catalog. */
export function furnitureIcon(k: string): HTMLCanvasElement {
  const def = FURNITURE[k]
  const w = def.w * TS + 8
  const h = def.h * TS + 22
  const [cv, c] = canvas(w, h)
  drawFurniture(c, k, 4, 20, 0)
  const scale = Math.max(2, Math.min(4, Math.floor(120 / Math.max(w, h))))
  cv.style.width = `${w * scale}px`
  cv.style.height = `${h * scale}px`
  cv.style.imageRendering = 'pixelated'
  return cv
}

export function finishSwatch(kind: 'wall' | 'floor', id: string): HTMLCanvasElement {
  const [cv, c] = canvas(32, 32)
  const f = pen(c)
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      if (kind === 'wall') wallpaper(f, WALLPAPERS[id], x * 16, y * 16, x, y, 16)
      else roomFloor(f, FLOORS[id], x * 16, y * 16, x, y)
    }
  cv.style.width = cv.style.height = '64px'
  cv.style.imageRendering = 'pixelated'
  return cv
}
