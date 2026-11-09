import { outlineCanvas, pen } from '../../art'
import type { ForestObj } from '../gen'

/*
 * The story's things, drawn in code like everything else: the Route 9 bus stop and its sign, the
 * letterbox with no house, the small finds and footprints. Each is a cached sprite, drawn once.
 * Colours are worn and damp; the forest's grade drains them further.
 */

type Ctx = CanvasRenderingContext2D
type Pen = ReturnType<typeof pen>

const cache = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, draw: (f: Pen, c: Ctx) => void, outline = true) {
  let cv = cache.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    draw(pen(c), c)
    if (outline) outlineCanvas(c, w, h, [0x12, 0x14, 0x14])
    cache.set(key, cv)
  }
  return cv
}

/** The bus shelter: rusted roof, cracked back panel, a bench, the timetable and a note. 3 tiles. */
function shelter() {
  return sprite('busstop', 50, 46, (f, c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'
    c.fillRect(2, 41, 46, 4)
    // The back panel: scratched, clouded plastic in a frame.
    f('#4f5654', 3, 6, 44, 30)
    f('#5d6563', 5, 8, 40, 26)
    for (let i = 0; i < 9; i++) f('#6a716e', 7 + ((i * 13) % 36), 10 + ((i * 7) % 20), 3, 1)
    f('#3c4241', 22, 9, 1, 12)
    f('#3c4241', 23, 20, 1, 7)
    f('#3c4241', 24, 26, 3, 1)
    // Posts.
    f('#3a3330', 1, 4, 3, 38)
    f('#3a3330', 46, 4, 3, 38)
    // Roof: a rusted slab, a drip line of rust under it.
    f('#4a3a2e', 0, 0, 50, 6)
    f('#5b4636', 0, 0, 50, 2)
    f('#6e4a32', 6, 6, 2, 3)
    f('#6e4a32', 30, 6, 1, 4)
    // The timetable, behind its plastic (left).
    f('#8d8774', 6, 12, 12, 15)
    f('#a29b85', 7, 13, 10, 3)
    for (let r = 0; r < 4; r++) f('#5c5748', 7, 18 + r * 2, 10, 1)
    // The bench.
    f('#4c3a2a', 6, 30, 38, 4)
    f('#5f4a36', 6, 30, 38, 1)
    f('#33281e', 8, 34, 2, 5)
    f('#33281e', 40, 34, 2, 5)
    // The note, nailed to the right-hand post: a torn, pale scrap.
    f('#b9b3a2', 40, 15, 7, 9)
    f('#cfc9b8', 41, 15, 5, 1)
    f('#2b2b2b', 41, 18, 5, 1)
    f('#2b2b2b', 41, 20, 4, 1)
    f('#707070', 43, 15, 1, 1)
  })
}

/** The bus stop sign on its pole: a round, flaking plate. */
function busSign() {
  return sprite('bussign', 14, 46, (f, c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'
    c.fillRect(3, 42, 8, 3)
    f('#3d3936', 6, 10, 2, 34)
    const disc = [
      [4, 7],
      [2, 9],
      [1, 10],
      [1, 10],
      [1, 10],
      [1, 10],
      [2, 9],
      [4, 7],
    ]
    disc.forEach(([a, b], i) => f(i < 2 ? '#7d8a7c' : '#6c7a6b', a + 1, 1 + i, b - a + 1, 1))
    // A little bus, half flaked away.
    f('#c7c0aa', 4, 3, 6, 3)
    f('#6c7a6b', 5, 4, 1, 1)
    f('#6c7a6b', 8, 4, 1, 1)
    f('#3d3936', 5, 6, 1, 1)
    f('#3d3936', 8, 6, 1, 1)
    f('#58645a', 9, 2, 2, 2)
  })
}

/** A letterbox on a post, no house behind it. A small number plate: 14. */
function letterbox() {
  return sprite('letterbox', 16, 30, (f, c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'
    c.fillRect(3, 26, 10, 3)
    f('#3d3127', 7, 11, 3, 17)
    // The box: rounded top, rusted, its door a little open.
    f('#5d4e44', 2, 4, 12, 8)
    f('#6d5d51', 3, 3, 10, 1)
    f('#6d5d51', 2, 4, 12, 2)
    f('#3a2f28', 13, 5, 1, 6)
    f('#7a4a35', 4, 8, 2, 2)
    // Its flag, down.
    f('#7a3b30', 14, 7, 1, 4)
    // The number plate.
    f('#b4ad98', 5, 12, 6, 3)
    f('#3a3530', 6, 13, 1, 1)
    f('#3a3530', 8, 13, 2, 1)
  })
}

/** The small finds, each its own little sprite (flat on the ground, or on a tree's trunk). */
const FIND_ART: Record<string, (f: Pen) => void> = {
  slipper: (f) => {
    f('#8a7a8e', 4, 7, 8, 4)
    f('#a495a6', 5, 6, 5, 2)
    f('#5f5462', 4, 10, 8, 1)
    f('#3e4a33', 6, 8, 1, 1)
  },
  nametag: (f) => {
    f('#b7b2a2', 4, 7, 8, 5)
    f('#6b7f8a', 4, 7, 8, 2)
    f('#4a4a4a', 5, 10, 5, 1)
  },
  wheel: (f) => {
    for (let a = 0; a < 16; a++) {
      const x = Math.round(8 + Math.cos((a / 16) * Math.PI * 2) * 5)
      const y = Math.round(9 + Math.sin((a / 16) * Math.PI * 2) * 3)
      f('#4a4542', x, y, 1, 1)
    }
    f('#6e6560', 7, 8, 2, 2)
    f('#5b4e44', 5, 9, 6, 1)
    f('#2f3a2a', 3, 11, 4, 1)
  },
  drawing: (f) => {
    // On a trunk: a soft, rain-spotted sheet, a house and a tall grey figure.
    f('#c9c2ae', 0, 0, 10, 11)
    f('#9c6a4a', 1, 5, 4, 4)
    f('#7a3e34', 1, 4, 4, 1)
    f('#c9a94a', 7, 1, 2, 2)
    f('#6f6f70', 7, 4, 1, 6)
    f('#6f6f70', 6, 5, 3, 1)
    f('#8a8370', 3, 1, 1, 1)
    f('#5a5a5a', 4, 0, 1, 1)
  },
  bracelet: (f) => {
    f('#d3d0c6', 4, 8, 3, 2)
    f('#d3d0c6', 6, 9, 5, 2)
    f('#aaa79c', 10, 8, 2, 1)
    f('#7d8fa0', 7, 9, 2, 1)
  },
  glasses: (f) => {
    f('#3a3633', 4, 9, 3, 2)
    f('#3a3633', 9, 9, 3, 2)
    f('#8ea0a8', 5, 9, 1, 1)
    f('#8ea0a8', 10, 9, 1, 1)
    f('#3a3633', 7, 9, 2, 1)
  },
  arrow: (f) => {
    // On a trunk: an old red arrow, the paint run.
    f('#7a2c25', 1, 4, 7, 2)
    f('#7a2c25', 6, 2, 1, 6)
    f('#7a2c25', 7, 3, 1, 4)
    f('#7a2c25', 8, 4, 1, 2)
    f('#5e231e', 2, 6, 1, 3)
    f('#5e231e', 5, 6, 1, 2)
  },
  teacup: (f) => {
    f('#4b4744', 2, 9, 12, 4)
    f('#5e5955', 3, 9, 10, 1)
    f('#d7d2c8', 6, 6, 5, 3)
    f('#b8b2a6', 6, 8, 5, 1)
    f('#8a6a44', 7, 6, 3, 1)
    f('#d7d2c8', 11, 7, 1, 1)
  },
  wool: (f) => {
    f('#4f6b9a', 4, 8, 4, 4)
    f('#6684b4', 5, 8, 2, 1)
    // The strand runs off, out of the tile.
    for (let i = 0; i < 8; i++) f('#4f6b9a', 8 + i, 10 - (i >> 2), 1, 1)
  },
  tray: (f) => {
    f('#9a8f7a', 2, 6, 12, 7)
    f('#b0a58e', 2, 6, 12, 1)
    f('#d9d3c6', 4, 7, 5, 5)
    f('#7a8a4a', 5, 8, 2, 2)
    f('#9a5a3a', 7, 9, 1, 2)
    f('#e6e1d6', 10, 8, 3, 3)
  },
  tinbox: (f) => {
    // A rusted biscuit tin, its lid pushed a little askew.
    f('#5a4636', 3, 7, 10, 6)
    f('#7a5a40', 3, 7, 10, 2)
    f('#8a3b30', 4, 10, 8, 1)
    f('#6a5040', 2, 6, 11, 2)
    f('#9a7a58', 5, 6, 4, 1)
    f('#d8d0b8', 11, 8, 2, 2)
  },
  mitten: (f) => {
    f('#9a2c28', 5, 6, 6, 7)
    f('#b8403a', 6, 6, 4, 2)
    f('#9a2c28', 10, 8, 2, 3)
    f('#e8e0d0', 5, 12, 6, 2)
  },
  ticket: (f) => {
    f('#c1b78f', 5, 8, 7, 4)
    f('#8a7a4a', 6, 9, 4, 1)
    f('#a39a76', 5, 11, 7, 1)
  },
}

function findSprite(id: string) {
  const onTree = id === 'drawing' || id === 'arrow'
  return sprite(`find:${id}`, onTree ? 10 : 16, onTree ? 11 : 16, (f) => FIND_ART[id]?.(f), !onTree)
}

/**
 * One shoe print pressed into the litter, going the way `dir` points (left and right feet
 * alternate with `v`): a dark sole and heel, with a pale rim of pushed-up earth.
 */
function prints(dir: number, v: number) {
  return sprite(
    `prints${dir}${v}`,
    16,
    16,
    (f) => {
      const sole = '#1d1915'
      const rim = '#7a7064'
      // Drawn pointing up, then turned for the other directions.
      const cells: [number, number, number, number, string][] = [
        [5, 2, 4, 1, rim],
        [4, 3, 6, 1, rim],
        [5, 3, 4, 5, sole],
        [4, 4, 1, 3, sole],
        [9, 4, 1, 3, sole],
        [5, 8, 4, 1, rim],
        [5, 10, 4, 1, rim],
        [5, 11, 4, 3, sole],
      ]
      const off = v ? 2 : -2
      for (const [x, y, w, h, col] of cells) {
        let rx = x + off
        let ry = y
        let rw = w
        let rh = h
        // 3 up (as drawn), 0 down, 1 left, 2 right.
        if (dir === 0) ry = 15 - y - h + 1
        else if (dir === 1 || dir === 2) {
          rx = dir === 1 ? y : 15 - y - h + 1
          ry = x + off
          rw = h
          rh = w
        }
        f(col, rx, ry, rw, rh)
      }
    },
    false,
  )
}

// --- the map's props (story/map.ts) ----------------------------------------------------------

/** Each prop's sprite: its size (px) and how it's drawn. Drawn with its bottom on its tile's. */
const PROP_ART: Record<
  string,
  { w: number; h: number; dx?: number; draw: (f: Pen, v: number) => void; outline?: false }
> = {
  gatepost: {
    w: 10,
    h: 30,
    dx: 3,
    draw: (f) => {
      f('#4a3a2c', 2, 2, 6, 27)
      f('#5c4936', 2, 2, 2, 27)
      f('#3a2d22', 1, 0, 8, 3)
      // The enamel number: 14.
      f('#c9c4b4', 2, 10, 6, 5)
      f('#2c3d5a', 3, 11, 1, 3)
      f('#2c3d5a', 5, 11, 1, 3)
      f('#2c3d5a', 6, 12, 1, 1)
      f('#2c3d5a', 5, 12, 2, 1)
    },
  },
  chimney: {
    w: 18,
    h: 50,
    dx: -1,
    draw: (f) => {
      f('#6a3e30', 2, 4, 14, 45)
      for (let y = 6; y < 48; y += 4)
        for (let x = 2 + ((y / 4) % 2) * 3; x < 16; x += 6) f('#56322a', x, y, 1, 3)
      for (let y = 7; y < 48; y += 4) f('#58342a', 2, y, 14, 1)
      f('#4a2c24', 1, 0, 16, 5)
      f('#2a1e1a', 4, 1, 10, 2)
      // The hearth's mouth, black with soot.
      f('#1a1414', 5, 34, 8, 14)
      f('#2b2220', 6, 35, 6, 2)
    },
  },
  ruinwall: {
    w: 16,
    h: 24,
    draw: (f, v) => {
      const top = [12, 6, 16][v % 3]
      for (let x = 0; x < 16; x++) {
        const t = top + ((x * 7 + v * 3) % 5) - 2
        f('#6f6c64', x, t, 1, 23 - t)
      }
      for (let y = 8; y < 23; y += 4) f('#5c5a53', 0, y, 16, 1)
      f('#4c5a3a', 2, 20, 5, 3)
      f('#4c5a3a', 11, 21, 4, 2)
    },
  },
  steps: {
    w: 16,
    h: 14,
    draw: (f) => {
      f('#6a6862', 1, 8, 14, 5)
      f('#77756e', 2, 4, 12, 4)
      f('#85837b', 3, 1, 10, 3)
      f('#3e3d39', 6, 2, 4, 1)
    },
  },
  bed: {
    w: 32,
    h: 26,
    draw: (f, v) => {
      f('#4b3828', 1, 14, 30, 11)
      f('#5c4532', 1, 14, 30, 2)
      f('#3c3222', 3, 16, 26, 7)
      // Canes and netting (tomatoes), or raspberry canes.
      for (let x = 5; x < 29; x += 5) {
        f('#7a6a4a', x, v ? 4 : 1, 1, v ? 13 : 16)
        if (!v) f('#a39f8e', x - 2, 5, 5, 1)
      }
      for (let i = 0; i < 14; i++)
        f(i % 3 ? '#4f6a3a' : '#7a3a2e', 3 + ((i * 11) % 26), 6 + ((i * 7) % 10), 2, 2)
    },
  },
  fence: {
    w: 16,
    h: 18,
    draw: (f, v) => {
      f('#4a3a2c', 2, 3, 3, 14)
      f('#4a3a2c', 11, v ? 6 : 3, 3, v ? 11 : 14)
      f('#5a4836', 0, 6, 16, 2)
      if (!v) f('#5a4836', 0, 11, 16, 2)
      else f('#5a4836', 0, 12, 8, 2)
    },
  },
  pole: {
    w: 14,
    h: 74,
    dx: 1,
    draw: (f) => {
      f('#3e3128', 5, 4, 4, 69)
      f('#4c3d31', 5, 4, 1, 69)
      f('#3a2e26', 0, 8, 14, 3)
      f('#8a8a84', 1, 6, 2, 2)
      f('#8a8a84', 11, 6, 2, 2)
    },
  },
  roadsign: {
    w: 18,
    h: 34,
    dx: -1,
    draw: (f) => {
      f('#3d3936', 8, 12, 2, 21)
      f('#3a5a44', 1, 2, 16, 11)
      f('#c7c0aa', 2, 3, 14, 1)
      f('#c7c0aa', 3, 6, 10, 1)
      f('#c7c0aa', 3, 9, 7, 1)
      // Ivy over it.
      for (let i = 0; i < 9; i++) f('#3f5a32', 1 + ((i * 5) % 15), 2 + ((i * 3) % 18), 2, 2)
    },
  },
  swings: {
    w: 50,
    h: 40,
    dx: -1,
    draw: (f, v) => {
      void v
      // A-frames at each end, a bar across.
      for (const x of [2, 46]) {
        f('#4f5254', x - 2, 4, 2, 35)
        f('#4f5254', x + 2, 4, 2, 35)
      }
      f('#5d6062', 1, 3, 48, 3)
      // Three swings: the outer two hang a little askew (they're moving).
      const seats: [number, number][] = [
        [12, 2],
        [25, 0],
        [38, -2],
      ]
      for (const [x, lean] of seats) {
        f('#7a7a74', x, 6, 1, 22)
        f('#7a7a74', x + 6, 6, 1, 22)
        f('#4a3528', x - 1 + lean, 28, 9, 3)
      }
    },
  },
  table: {
    w: 32,
    h: 20,
    draw: (f) => {
      f('#5a4a3a', 0, 9, 32, 3)
      f('#5a4a3a', 0, 4, 32, 4)
      f('#6a5846', 0, 4, 32, 1)
      f('#4a3c2e', 3, 12, 2, 7)
      f('#4a3c2e', 27, 12, 2, 7)
      f('#3c3026', 13, 5, 5, 1)
    },
  },
  bin: {
    w: 12,
    h: 18,
    dx: 2,
    draw: (f) => {
      f('#5a4a3a', 1, 4, 10, 13)
      f('#6a5a46', 1, 4, 10, 2)
      f('#2a2420', 2, 4, 8, 1)
      f('#7a4a35', 3, 9, 3, 3)
    },
  },
  car: {
    w: 48,
    h: 28,
    draw: (f) => {
      f('#4a5a62', 2, 10, 44, 14)
      f('#57686f', 4, 10, 40, 3)
      f('#3e4c53', 10, 2, 26, 9)
      f('#5e7076', 12, 3, 9, 6)
      f('#5e7076', 24, 3, 10, 6)
      f('#7a4a35', 30, 14, 10, 4)
      f('#1e2224', 6, 21, 8, 6)
      f('#1e2224', 34, 21, 8, 6)
      // Ferns through the windows.
      f('#4f6a3a', 14, 4, 4, 4)
      f('#4f6a3a', 27, 5, 5, 3)
      f('#d8d0a8', 44, 14, 2, 3)
    },
  },
  truck: {
    w: 48,
    h: 32,
    draw: (f) => {
      f('#5a6a3c', 2, 12, 44, 13)
      f('#68784a', 4, 12, 40, 2)
      f('#4c5a32', 4, 2, 16, 11)
      f('#6e8088', 6, 4, 12, 5)
      f('#3c4228', 22, 8, 24, 5)
      f('#c7c0aa', 26, 16, 14, 3)
      f('#1e2224', 6, 23, 8, 7)
      f('#1e2224', 34, 23, 8, 7)
    },
  },
  bunk: {
    w: 80,
    h: 64,
    draw: (f, v) => {
      // Plank walls, a low tar-paper roof.
      f('#4a3c2e', 0, 24, 80, 39)
      for (let y = 26; y < 62; y += 4) f('#3e3226', 0, y, 80, 1)
      f('#2e2a28', -0, 6, 80, 20)
      f('#3a3532', 0, 6, 80, 3)
      for (let x = 3; x < 80; x += 9) f('#26221f', x, 10, 1, 15)
      // The door, and windows (one broken out).
      f('#2a211b', 58, 38, 12, 25)
      f('#3a2e24', 59, 39, 10, 23)
      f('#d8d0b8', 66, 50, 1, 2)
      for (const x of [8, 32]) {
        f('#5a4836', x - 1, 35, 16, 13)
        f(v ? '#0e0c0c' : '#3c4a52', x, 36, 14, 11)
        f('#5a4836', x + 6, 36, 2, 11)
        f('#5a4836', x, 41, 14, 1)
      }
      if (!v) {
        f('#0e0c0c', 10, 37, 4, 4)
        f('#0e0c0c', 12, 42, 3, 3)
      }
    },
  },
  office: {
    w: 64,
    h: 64,
    draw: (f) => {
      f('#5a4a3a', 0, 22, 64, 41)
      for (let y = 24; y < 62; y += 4) f('#4c3e30', 0, y, 64, 1)
      f('#3a2e28', 0, 4, 64, 20)
      f('#4a3c34', 0, 4, 64, 3)
      // A porch step and the door.
      f('#2a211b', 34, 36, 14, 27)
      f('#3e3024', 35, 37, 12, 26)
      f('#b0a080', 44, 50, 2, 2)
      // Windows boarded over, the boards on the inside of the glass.
      for (const x of [6, 20]) {
        f('#2a2622', x, 34, 11, 13)
        f('#6a5a46', x, 36, 11, 2)
        f('#6a5a46', x, 41, 11, 2)
        f('#3c4a52', x, 34, 11, 1)
      }
      // A small sign: FIELD OFFICE.
      f('#c7c0aa', 34, 27, 14, 6)
      f('#4a4a44', 36, 29, 10, 1)
      f('#4a4a44', 36, 31, 7, 1)
    },
  },
  flagpole: {
    w: 8,
    h: 68,
    dx: 4,
    draw: (f) => {
      f('#8a8a84', 3, 2, 2, 64)
      f('#a8a8a0', 2, 0, 4, 3)
      f('#6a6a64', 5, 6, 1, 40)
      f('#4a4a44', 1, 62, 6, 5)
    },
  },
  campsign: {
    w: 96,
    h: 50,
    draw: (f) => {
      for (const x of [4, 84]) {
        f('#4a3a2c', x, 6, 8, 43)
        f('#5c4936', x, 6, 2, 43)
      }
      f('#5a4836', 0, 4, 96, 16)
      f('#6a5642', 0, 4, 96, 2)
      // Letters, worn: just pale strokes at this size.
      for (let i = 0; i < 13; i++) f('#c7bea0', 10 + i * 6, 9, 4, 7)
      f('#5a4836', 46, 9, 6, 7)
    },
  },
  leanto: {
    // Branches leant against a fallen trunk, a shelter just big enough to sit in, old and grey.
    w: 34,
    h: 30,
    dx: -1,
    draw: (f) => {
      f('#3e3128', 0, 22, 34, 6)
      f('#4c3d31', 0, 22, 34, 2)
      for (let i = 0; i < 9; i++) {
        const x = 2 + i * 3.6
        for (let y = 0; y < 20; y++)
          f(i % 2 ? '#4a4138' : '#5a5046', Math.round(x + y * 0.25), 3 + y, 2, 1)
      }
      f('#1a1614', 12, 14, 10, 9)
      f('#3f4a3c', 4, 2, 6, 2)
      f('#3f4a3c', 22, 4, 5, 2)
      // A strip of red cloth tied to one branch: your mark.
      f('#8a2c25', 27, 6, 3, 2)
      f('#6e231e', 29, 8, 1, 3)
    },
  },
  waymark: {
    w: 14,
    h: 26,
    dx: 1,
    draw: (f, v) => {
      // A short post with a white band, and a little arrow board (or two).
      f('#4a3a2c', 5, 6, 4, 19)
      f('#5c4936', 5, 6, 1, 19)
      f('#d8d2c2', 5, 10, 4, 3)
      f('#6a5642', 1, 3, 10, 3)
      f('#6a5642', 11, 4, 2, 1)
      f('#c7bea0', 3, 4, 6, 1)
      if (!v) {
        f('#6a5642', 3, 14, 10, 3)
        f('#6a5642', 1, 15, 2, 1)
        f('#c7bea0', 5, 15, 6, 1)
      }
    },
  },
  rail: {
    w: 16,
    h: 16,
    outline: false,
    draw: (f, v) => {
      const x = v ? 1 : 12
      f('#4a3a2c', x, 0, 3, 16)
      f('#5c4936', x, 0, 1, 16)
      f('#3a2e24', x - 1, 3, 5, 2)
      f('#3a2e24', x - 1, 11, 5, 2)
    },
  },
}

function propSprite(id: string, v: number) {
  const a = PROP_ART[id]
  if (!a) return null
  return sprite(`prop:${id}:${v}`, a.w, a.h, (f) => a.draw(f, v), a.outline ?? true)
}

/**
 * The Route 9 bus, side on, facing left (the way it drives): a long cream-and-green body gone to
 * rust, dark windows, the door at the front, ROUTE 9 · HOLLOW PINES on the destination board.
 * `open`: its door folded open. Drawn with its middle at x and its wheels on y (px).
 */
export function drawBus(c: Ctx, x: number, y: number, open: boolean) {
  const bus = sprite(
    `bus${open ? 1 : 0}`,
    100,
    46,
    (f) => {
      // Body.
      f('#c9bf9e', 2, 6, 96, 30)
      f('#4f6a52', 2, 24, 96, 12)
      f('#d8cfae', 2, 6, 96, 3)
      f('#7a4a35', 30, 30, 9, 3)
      f('#7a4a35', 70, 26, 6, 4)
      // Roof.
      f('#a8a084', 4, 3, 92, 4)
      // Windows, all dark: no one aboard, no one driving.
      for (let i = 0; i < 7; i++) f('#151619', 18 + i * 11, 10, 9, 10)
      f('#151619', 4, 10, 10, 10)
      f('#2a2c30', 5, 11, 4, 3)
      // The door, just behind the front.
      f(open ? '#0c0c0e' : '#3c4a40', 15, 10, 8, 24)
      if (!open) f('#151619', 16, 12, 6, 9)
      // Destination board.
      f('#1e1f22', 22, 4, 26, 4)
      f('#d8b860', 24, 5, 3, 2)
      f('#d8b860', 29, 5, 2, 2)
      f('#d8b860', 33, 5, 12, 2)
      // Headlight and bumper.
      f('#e8e0b0', 2, 26, 3, 3)
      f('#3a3a36', 0, 33, 100, 3)
      // Wheels.
      for (const wx of [14, 74]) {
        f('#121212', wx, 32, 14, 12)
        f('#4a4a46', wx + 4, 36, 6, 4)
      }
    },
    true,
  )
  c.drawImage(bus, Math.round(x - 50), Math.round(y - 44))
}

/** Draws one of the story's objects with its tile's top-left at (px, py). */
export function drawStoryObj(c: Ctx, o: ForestObj, px: number, py: number) {
  switch (o.k) {
    case 'find':
      if (o.id === 'drawing' || o.id === 'arrow')
        return c.drawImage(findSprite(o.id), px + 3, py - 18)
      return c.drawImage(findSprite(o.id ?? ''), px, py)
    case 'prints':
      return c.drawImage(prints(Number(o.id ?? 0), o.v), px, py)
    case 'prop': {
      const id = o.id ?? ''
      if (id === 'busstop') return c.drawImage(shelter(), px - 1, py + 16 - 46)
      if (id === 'bussign') return c.drawImage(busSign(), px + 1, py + 16 - 46)
      if (id === 'letterbox') return c.drawImage(letterbox(), px, py + 16 - 30)
      const sp = propSprite(id, o.v)
      if (sp) c.drawImage(sp, px + (PROP_ART[id].dx ?? 0), py + 16 - sp.height)
      return
    }
  }
}

/** Builds the story's sprites up front (under the fade into the forest). */
export function warmStory() {
  shelter()
  busSign()
  letterbox()
  for (const id of Object.keys(FIND_ART)) findSprite(id)
  for (let d = 0; d < 4; d++) for (let v = 0; v < 2; v++) prints(d, v)
  for (const id of Object.keys(PROP_ART)) for (let v = 0; v < 3; v++) propSprite(id, v)
  const c = document.createElement('canvas').getContext('2d')!
  drawBus(c, -200, -200, false)
  drawBus(c, -200, -200, true)
}

/** Flat on the ground (drawn under people): finds that aren't on a tree, and footprints. */
export function flatStory(o: ForestObj): boolean {
  return (
    o.k === 'prints' ||
    (o.k === 'prop' && (o.id === 'rail' || o.id === 'steps')) ||
    (o.k === 'find' && o.id !== 'drawing' && o.id !== 'arrow')
  )
}

/**
 * A keepsake framed for your room (furniture `keep_<id>`): a little shadow box with the thing
 * inside, on a cream backing. Drawn at a wall tile's top-left.
 */
export function drawKeepsake(c: Ctx, id: string, px: number, py: number) {
  const box = sprite(
    `keepsake:${id}`,
    16,
    16,
    (f, cc) => {
      f('#5e3d24', 1, 1, 14, 14)
      f('#efe6d2', 2, 2, 12, 12)
      f('#d8ccb4', 2, 2, 12, 1)
      cc.save()
      cc.beginPath()
      cc.rect(2, 2, 12, 12)
      cc.clip()
      const art = FIND_ART[id]
      if (art) {
        // The thing, a touch smaller, centred in the box.
        cc.translate(2, 1)
        cc.scale(0.78, 0.78)
        art(pen(cc))
      }
      cc.restore()
    },
    false,
  )
  c.drawImage(box, px, py)
}
