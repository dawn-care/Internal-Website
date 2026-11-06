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

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [cv, ctx]
}

// --- ground tiles ----------------------------------------------------------------------------

const GRASS = '#7bbd4e'
const GRASS_D = '#66a63f'
const GRASS_L = '#95d066'

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

function grass(f: Pen, px: number, py: number, x: number, y: number, base = GRASS) {
  f(base, px, py, 16, 16)
  speckle(f, px, py, x, y, 7, [GRASS_D, GRASS_D, GRASS_L], 11)
  for (let i = 0; i < 3; i++) {
    const bx = px + Math.floor(hash(x, y, 40 + i) * 14) + 1
    const by = py + Math.floor(hash(y, x, 50 + i) * 13) + 2
    f(GRASS_D, bx, by, 1, 2)
    f(GRASS_D, bx + 1, by - 1, 1, 2)
  }
}

const FLOWER_COLORS = ['#fff6e6', '#f6a5c0', '#c7a4ef', '#ffd35c', '#ff8a6b']

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
  f('#dcbf86', px, py, 16, 16)
  speckle(f, px, py, x, y, 9, ['#c9a96e', '#ead2a0', '#c9a96e'], 21)
  const sx = px + Math.floor(hash(x, y, 22) * 12) + 1
  const sy = py + Math.floor(hash(y, x, 23) * 12) + 2
  f('#b39467', sx, sy, 3, 2)
  f('#efdcb3', sx, sy, 2, 1)
  fringe(f, m, px, py, x, y)
}

function dirt(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#b38b58', px, py, 16, 16)
  speckle(f, px, py, x, y, 10, ['#9f7849', '#c49c69', '#a88050'], 31)
  fringe(f, m, px, py, x, y)
}

function stone(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#cfc6b4', px, py, 16, 16)
  for (let r = 0; r < 2; r++) {
    const off = (y + r) % 2 === 0 ? 0 : 4
    f('#b3a993', px, py + r * 8 + 7, 16, 1)
    for (let cx = off; cx < 16; cx += 8) f('#b3a993', px + cx, py + r * 8, 1, 7)
    f('#ddd6c6', px + ((off + 2) % 8), py + r * 8 + 1, 3, 1)
  }
  speckle(f, px, py, x, y, 3, ['#c2b8a4'], 41)
  fringe(f, m, px, py, x, y)
}

function sand(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#e6d29b', px, py, 16, 16)
  speckle(f, px, py, x, y, 8, ['#d4bd82', '#f0e0b4'], 51)
  fringe(f, m, px, py, x, y)
}

function water(f: Pen, m: GameMap, px: number, py: number, x: number, y: number) {
  f('#4b93d1', px, py, 16, 16)
  const notWater = (gx: number, gy: number) => groundAt(m, gx, gy) !== T.WATER
  if (notWater(x, y - 1)) {
    f('#d9c58e', px, py, 16, 2)
    f('#7fb8e6', px, py + 2, 16, 1)
  }
  if (notWater(x, y + 1)) f('#3b7fbd', px, py + 14, 16, 2)
  if (notWater(x - 1, y)) f('#7fb8e6', px, py, 1, 16)
  if (notWater(x + 1, y)) f('#7fb8e6', px + 15, py, 1, 16)
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

export function drawSoil(c: Ctx, px: number, py: number, wet: boolean) {
  const f = pen(c)
  const [base, furrow, hi] = wet
    ? ['#5f3b22', '#4b2d19', '#6e4529']
    : ['#8b5a33', '#74472a', '#a06d42']
  f(base, px + 1, py + 1, 14, 14)
  for (const r of [4, 8, 12]) {
    f(furrow, px + 2, py + r, 12, 1)
    f(hi, px + 2, py + r - 1, 12, 1)
  }
  if (wet) {
    f('#7a5236', px + 4, py + 3)
    f('#7a5236', px + 10, py + 9)
  }
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
  let cv = spriteCache.get(key)
  if (!cv) {
    const [nc, c] = canvas(w, h)
    draw(pen(c))
    cv = nc
    spriteCache.set(key, cv)
  }
  return cv
}

/*
 * Trees are 64×80 (about 3.3 characters tall), pines 48×80. Both stand on a single tile: the
 * trunk is centred on it and the rest of the sprite rises above and around it.
 */
export const TREE_W = 64
export const TREE_H = 80
export const PINE_W = 48

function treeSprite(variant: number): HTMLCanvasElement {
  return cached(`tree${variant}`, TREE_W, TREE_H, (f) => {
    disc(f, 32, 77, 15, 3, 'rgba(0,0,0,0.18)')
    // Trunk and roots.
    f('#5c3920', 27, 48, 10, 30)
    f('#7a4e2d', 28, 48, 7, 30)
    f('#8f6038', 29, 52, 2, 20)
    f('#5c3920', 23, 75, 18, 3)
    f('#5c3920', 21, 77, 4, 2)
    f('#5c3920', 39, 77, 4, 2)
    // Canopy: a dark silhouette with lumpy edges, lit from the top left.
    disc(f, 32, 32, 29, 26, '#2f6a2a')
    disc(f, 9, 40, 9, 8, '#2f6a2a')
    disc(f, 55, 40, 9, 8, '#2f6a2a')
    disc(f, 32, 54, 18, 6, '#2f6a2a')
    disc(f, 18, 10, 10, 8, '#2f6a2a')
    disc(f, 46, 10, 10, 8, '#2f6a2a')
    disc(f, 29, 29, 25, 22, '#428a35')
    disc(f, 12, 37, 6, 5, '#428a35')
    disc(f, 26, 24, 18, 15, '#58a33f')
    disc(f, 19, 11, 7, 5, '#58a33f')
    disc(f, 21, 18, 8, 6, '#74bb52')
    for (let i = 0; i < 70; i++) {
      const lx = 6 + Math.floor(hash(i, variant, 1) * 52)
      const ly = 6 + Math.floor(hash(variant, i, 2) * 50)
      f(i % 3 ? '#346f2d' : '#6db34c', lx, ly, 2, 1)
    }
    if (variant === 2)
      for (let i = 0; i < 12; i++) {
        const ax = 10 + Math.floor(hash(i, 7) * 44)
        const ay = 14 + Math.floor(hash(7, i) * 34)
        f('#e8473d', ax, ay, 3, 3)
        f('#ff8a7a', ax, ay, 1, 1)
      }
  })
}

function pineSprite(): HTMLCanvasElement {
  return cached('pine', PINE_W, TREE_H, (f) => {
    disc(f, 24, 77, 12, 3, 'rgba(0,0,0,0.18)')
    f('#5c3920', 21, 64, 6, 15)
    f('#7a4e2d', 22, 64, 3, 15)
    for (let i = 0; i < 5; i++) {
      const top = 2 + i * 13
      for (let r = 0; r < 18; r++) {
        const half = Math.min(23, Math.floor(2 + (r + i * 3) * 0.85))
        f(r < 4 ? '#3d7f3a' : '#2c6331', 24 - half, top + r, half * 2, 1)
        f('#4d9446', 24 - half, top + r, Math.max(1, Math.floor(half * 0.55)), 1)
      }
      f(
        '#22502a',
        24 - Math.min(23, Math.floor(2 + (17 + i * 3) * 0.85)),
        top + 17,
        Math.min(46, 2 * Math.floor(2 + (17 + i * 3) * 0.85)),
        1,
      )
    }
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
      disc(f, px + 8, py + 13, 7, 2, 'rgba(0,0,0,0.18)')
      disc(f, px + 8, py + 8, 8, 7, '#2f6a2a')
      disc(f, px + 7, py + 7, 6, 5, '#4b9139')
      f('#6db34c', px + 4, py + 4, 3, 2)
      if (hash(o.x, o.y) < 0.5)
        for (const [dx, dy] of [
          [4, 8],
          [10, 5],
          [11, 10],
        ])
          f('#d94a6a', px + dx, py + dy, 2, 2)
      break
    case 'fence': {
      const h = fenceAt(o.x - 1, o.y) || fenceAt(o.x + 1, o.y)
      const v = fenceAt(o.x, o.y - 1) || fenceAt(o.x, o.y + 1)
      if (h) {
        for (const side of [-1, 1]) {
          if (!fenceAt(o.x + side, o.y)) continue
          const rx = side < 0 ? px : px + 8
          f('#a0703f', rx, py + 5, 8, 2)
          f('#a0703f', rx, py + 10, 8, 2)
        }
        f('#7d5530', px, py + 7, 16, 1)
        f('#7d5530', px, py + 12, 16, 1)
      }
      if (v) {
        if (fenceAt(o.x, o.y - 1)) f('#a0703f', px + 6, py - 2, 4, 8)
        if (fenceAt(o.x, o.y + 1)) f('#a0703f', px + 6, py + 8, 4, 8)
      }
      f('#6b4526', px + 5, py + 1, 6, 14)
      f('#b98450', px + 6, py + 1, 4, 13)
      f('#d3a06a', px + 6, py + 1, 4, 1)
      break
    }
    case 'home':
      drawHome(f, px, py, o.w!, o.h!)
      break
    case 'kitchen':
      drawKitchen(f, px, py, o.w!, o.h!, time)
      break
    case 'bench':
      f('rgba(0,0,0,0.15)', px + 1, py + 13, 30, 2)
      f('#6b4526', px + 2, py + 9, 2, 5)
      f('#6b4526', px + 28, py + 9, 2, 5)
      f('#a0703f', px, py + 2, 32, 3)
      f('#8a5d34', px, py + 5, 32, 1)
      f('#b98450', px, py + 7, 32, 3)
      f('#8a5d34', px, py + 10, 32, 1)
      break
    case 'lamp':
      // About twice a character's height. LAMP_LIGHT_Y is where the glass is.
      f('rgba(0,0,0,0.18)', px + 3, py + 13, 10, 2)
      f('#2f3b3a', px + 4, py + 11, 8, 4)
      f('#2f3b3a', px + 6, py + 8, 4, 3)
      f('#2f3b3a', px + 7, py - 28, 2, 37)
      f('#46524f', px + 7, py - 28, 1, 37)
      f('#2f3b3a', px + 6, py - 4, 4, 2)
      f('#2f3b3a', px + 3, py - 29, 10, 2)
      f('#f7e3a1', px + 4, py - 36, 8, 7)
      f('#fff6cf', px + 5, py - 35, 2, 4)
      f('#2f3b3a', px + 7, py - 36, 2, 7)
      f('#2f3b3a', px + 3, py - 38, 10, 2)
      f('#2f3b3a', px + 5, py - 40, 6, 2)
      f('#2f3b3a', px + 7, py - 42, 2, 2)
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
            i % 2 ? '#3f8a3a' : '#58a33f',
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

function drawHome(f: Pen, px: number, py: number, w: number, h: number) {
  const W = w * TS
  const roofH = 4 * TS
  const wallY = py + roofH
  const wallH = (h - 4) * TS
  // Chimneys.
  f('#8f3f2c', px + 40, py - 10, 12, 20)
  f('#a6533b', px + 40, py - 12, 12, 3)
  f('#8f3f2c', px + W - 56, py - 6, 12, 16)
  f('#a6533b', px + W - 56, py - 8, 12, 3)
  // Roof.
  f('#7a3324', px - 4, py, W + 8, roofH + 2)
  for (let r = 0; r < roofH; r += 5) {
    f(r % 10 === 0 ? '#b4533a' : '#a9492f', px - 3, py + r + 1, W + 6, 4)
    for (let x = r % 10 === 0 ? 0 : 4; x < W + 6; x += 8) f('#8f3f2c', px - 3 + x, py + r + 1, 1, 4)
  }
  f('#cc6a4c', px - 3, py + 1, W + 6, 1)
  f('#5e2a1e', px - 4, py + roofH, W + 8, 2)
  // Gable with the sign.
  const mid = px + W / 2
  f('#6e4a2f', mid - 38, py + 26, 76, 16)
  f('#c79a63', mid - 36, py + 28, 72, 12)
  f('#f2b84b', mid - 36, py + 28, 72, 1)
  // Walls.
  f('#f1e4c6', px, wallY, W, wallH)
  for (let y = 3; y < wallH; y += 4) f('#dccdaa', px, wallY + y, W, 1)
  f('#c9b48f', px, wallY + wallH - 3, W, 3)
  // Windows.
  const door0 = (23 - 14) * TS
  for (let x = 12; x < W - 12; x += 32) {
    if (x > door0 - 28 && x < door0 + 40) continue
    window2(f, px + x, wallY + 8)
  }
  // Porch roof and double door.
  const dx = px + door0
  f('#5e2a1e', dx - 6, wallY + 2, 44, 3)
  f('#b4533a', dx - 6, wallY - 1, 44, 3)
  f('#fff8ef', dx - 4, wallY + 5, 2, wallH - 5)
  f('#fff8ef', dx + 34, wallY + 5, 2, wallH - 5)
  f('#3e5e41', dx, wallY + 12, 32, wallH - 12)
  f('#4f7a52', dx + 1, wallY + 13, 14, wallH - 13)
  f('#4f7a52', dx + 17, wallY + 13, 14, wallH - 13)
  f('#9fc7e6', dx + 4, wallY + 16, 8, 6)
  f('#9fc7e6', dx + 20, wallY + 16, 8, 6)
  f('#f2d07a', dx + 13, wallY + 32, 2, 2)
  f('#f2d07a', dx + 17, wallY + 32, 2, 2)
  f('#d8cfbd', dx - 4, wallY + wallH - 2, 40, 2)
}

function window2(f: Pen, x: number, y: number) {
  f('#fff8ef', x, y, 20, 20)
  f('#8ab4d8', x + 2, y + 2, 16, 16)
  f('#b8d6ee', x + 3, y + 3, 5, 3)
  f('#fff8ef', x + 9, y + 2, 2, 16)
  f('#fff8ef', x + 2, y + 9, 16, 2)
  f('#8a5a35', x - 1, y + 20, 22, 4)
  for (let i = 0; i < 5; i++) f(FLOWER_COLORS[i], x + i * 4, y + 18, 3, 2)
}

function drawKitchen(f: Pen, px: number, py: number, w: number, h: number, time: number) {
  const W = w * TS
  const roofH = 3 * TS
  const wallY = py + roofH
  const wallH = (h - 3) * TS
  f('#6d6361', px + W - 30, py - 14, 12, 22)
  // Smoke puffs.
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
  f('#2f5a5b', px - 4, py, W + 8, roofH + 2)
  for (let r = 0; r < roofH; r += 5) {
    f(r % 10 === 0 ? '#4f8a8b' : '#467d7e', px - 3, py + r + 1, W + 6, 4)
    for (let x = r % 10 === 0 ? 0 : 4; x < W + 6; x += 8) f('#386b6c', px - 3 + x, py + r + 1, 1, 4)
  }
  f('#1f3f40', px - 4, py + roofH, W + 8, 2)
  // Brick walls.
  f('#b5654a', px, wallY, W, wallH)
  for (let y = 0; y < wallH; y += 4) {
    f('#9a523c', px, wallY + y + 3, W, 1)
    for (let x = y % 8 === 0 ? 0 : 4; x < W; x += 8) f('#9a523c', px + x, wallY + y, 1, 3)
  }
  // Striped awning.
  for (let x = 0; x < W; x += 8) f(x % 16 === 0 ? '#c0504d' : '#fff6e6', px + x, wallY + 2, 8, 7)
  for (let x = 0; x < W; x += 8)
    f(x % 16 === 0 ? '#c0504d' : '#fff6e6', px + x + 1, wallY + 9, 6, 2)
  window2(f, px + 10, wallY + 16)
  window2(f, px + W - 30, wallY + 16)
  const dx = px + (40 - 36) * TS
  f('#5b4030', dx - 1, wallY + 22, 18, wallH - 22)
  f('#8a5a35', dx + 1, wallY + 24, 14, wallH - 24)
  f('#9fc7e6', dx + 4, wallY + 26, 8, 5)
  f('#f2d07a', dx + 12, wallY + 38, 2, 2)
  f('#d8cfbd', dx - 2, wallY + wallH - 2, 20, 2)
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
            i % 2 ? '#3f8a3a' : '#6db34c',
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
