import { outlineCanvas, pen } from '../../art'
import type { ForestObj } from '../gen'

/*
 * The story's things, drawn in code like everything else: the Route 9 bus stop and its sign, the
 * camp's buildings and fences, the small finds and footprints. Each is a cached sprite, drawn once.
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
  {
    w: number
    h: number
    dx?: number
    /** Raised (or lowered) by this many px from standing on its tile's bottom. */
    dy?: number
    draw: (f: Pen, v: number) => void
    outline?: false
  }
> = {
  // --- insides (story/map.ts INTERIORS) ---
  desk: {
    // A plank desk with a drawer, a lamp gone dark on it, papers.
    w: 32,
    h: 24,
    draw: (f) => {
      f('#5a4632', 0, 6, 32, 8)
      f('#6a5440', 0, 6, 32, 2)
      f('#4a3828', 1, 14, 3, 9)
      f('#4a3828', 28, 14, 3, 9)
      f('#4e3c2c', 6, 14, 12, 6)
      f('#c8a040', 11, 16, 2, 1)
      f('#3a3a36', 22, 1, 2, 6)
      f('#5a5a50', 19, 0, 8, 2)
      f('#d8d0b8', 4, 4, 8, 2)
      f('#b8a888', 14, 4, 5, 2)
    },
  },
  chair: {
    w: 14,
    h: 16,
    dx: 1,
    draw: (f) => {
      f('#5a4632', 2, 6, 10, 3)
      f('#4a3828', 2, 9, 2, 6)
      f('#4a3828', 10, 9, 2, 6)
      f('#5a4632', 2, 0, 2, 7)
    },
  },
  stove: {
    // A pot-bellied stove on four feet, its door hanging open, the pipe going up into the dark.
    w: 16,
    h: 34,
    draw: (f) => {
      f('#2a2a2c', 6, 0, 4, 12)
      f('#2e2e30', 2, 12, 12, 16)
      f('#3a3a3c', 3, 13, 10, 3)
      f('#0e0e10', 5, 18, 6, 6)
      f('#3a3a3c', 11, 18, 2, 6)
      f('#2a2a2c', 3, 28, 2, 5)
      f('#2a2a2c', 11, 28, 2, 5)
    },
  },
  papers: {
    w: 16,
    h: 12,
    outline: false,
    draw: (f) => {
      f('#8a8270', 2, 4, 7, 5)
      f('#76705e', 7, 6, 6, 5)
      f('#9a927c', 4, 2, 5, 3)
      f('#5a5446', 9, 7, 3, 1)
    },
  },
  cabinet: {
    // A grey steel filing cabinet, four drawers, one hanging open (v 1: all shut).
    w: 16,
    h: 34,
    draw: (f, v) => {
      f('#5a5e60', 1, 2, 14, 31)
      f('#6a6e70', 1, 2, 14, 2)
      for (let i = 0; i < 4; i++) {
        f('#4a4e50', 2, 6 + i * 7, 12, 1)
        f('#8a8e90', 6, 8 + i * 7, 4, 1)
      }
      if (!v) {
        f('#4a4e50', 0, 13, 16, 5)
        f('#c8c0a8', 2, 12, 12, 2)
      }
    },
  },
  exitdoor: {
    // The way out, in a front wall: a plank door paler than the wall round it, in a frame, with
    // its latch, and a thin line of grey light under it.
    w: 16,
    h: 18,
    draw: (f) => {
      f('#2a211b', 1, 0, 14, 18)
      f('#9a7e5c', 3, 1, 10, 15)
      f('#ab8f6a', 3, 1, 10, 2)
      for (const x of [6, 9]) f('#7a6248', x, 3, 1, 13)
      f('#e0b850', 11, 8, 2, 2)
      f('#c8ccc8', 3, 16, 10, 1)
    },
  },
  doormat: {
    // A worn doormat on the floor in front of the door, its border faded, its middle walked thin.
    w: 16,
    h: 14,
    outline: false,
    draw: (f) => {
      f('#8a4636', 1, 1, 14, 11)
      f('#a85e48', 2, 2, 12, 9)
      f('#94503e', 4, 4, 8, 5)
    },
  },
  window: {
    // On a back wall: grimy black glass (v 0), or boarded over (v 1).
    w: 16,
    h: 16,
    dy: -2,
    draw: (f, v) => {
      f('#4a3a2c', 1, 1, 14, 13)
      f('#0c1014', 2, 2, 12, 11)
      f('#4a3a2c', 7, 2, 2, 11)
      if (v) {
        f('#6a5642', 1, 3, 14, 3)
        f('#5c4936', 1, 8, 14, 3)
        f('#6a5642', 2, 6, 3, 2)
      } else f('#1e2830', 3, 3, 3, 2)
    },
  },
  bunkbed: {
    // Iron bunks, two high, thin striped mattresses, a grey blanket on the lower one.
    w: 32,
    h: 44,
    draw: (f) => {
      f('#3a3c3e', 1, 2, 2, 41)
      f('#3a3c3e', 29, 2, 2, 41)
      f('#4a4c4e', 1, 2, 30, 2)
      f('#8a8474', 3, 8, 26, 5)
      for (let x = 5; x < 29; x += 4) f('#6a6456', x, 8, 1, 5)
      f('#4a4c4e', 1, 13, 30, 2)
      f('#8a8474', 3, 26, 26, 5)
      f('#55585a', 3, 25, 20, 7)
      f('#4a4c4e', 1, 31, 30, 2)
    },
  },
  locker: {
    // A tall tin locker, its paint chipped; a vent at the top, a little dial lock (v 1: Bell's,
    // with a strip of tape for a name; v 2: Bell's, open, the door swung back on a shirt).
    w: 16,
    h: 36,
    draw: (f, v) => {
      f('#4e5a52', 1, 1, 14, 34)
      f('#5e6a62', 1, 1, 14, 2)
      for (let y = 4; y < 10; y += 2) f('#2e3632', 4, y, 8, 1)
      f('#7a4a35', 2, 22, 3, 4)
      if (v === 2) {
        f('#14161a', 2, 3, 12, 31)
        f('#6a5a46', 4, 6, 8, 14)
        f('#c8c0a8', 5, 22, 3, 4)
        f('#c8c0a8', 9, 23, 3, 4)
        f('#4e5a52', 13, 2, 3, 33)
        return
      }
      f('#3a423e', 8, 2, 1, 33)
      f('#a8a294', 10, 18, 4, 4)
      f('#2a2a2a', 11, 19, 2, 2)
      if (v === 1) {
        f('#d8d0b8', 3, 12, 10, 3)
        f('#6a6456', 4, 13, 8, 1)
      }
    },
  },
  frame: {
    // A framed typed notice on a wall, the glass cracked across a corner.
    w: 16,
    h: 16,
    dy: -2,
    draw: (f) => {
      f('#4a3828', 1, 1, 14, 14)
      f('#d8d0b8', 3, 3, 10, 10)
      for (let y = 5; y < 12; y += 2) f('#8a8270', 4, y, 8, 1)
      f('#f0ece0', 10, 3, 3, 1)
      f('#f0ece0', 12, 4, 1, 2)
    },
  },
  bench: {
    // A mechanic's bench: thick planks, a vice at one end, tools on hooks above, a clipboard on a
    // nail.
    w: 32,
    h: 34,
    draw: (f) => {
      f('#4a3a2c', 0, 0, 32, 2)
      f('#8a8a84', 4, 3, 1, 7)
      f('#8a8a84', 9, 3, 2, 6)
      f('#6a6a64', 14, 3, 1, 8)
      f('#c8c0a8', 22, 2, 7, 9)
      f('#8a8270', 23, 4, 5, 1)
      f('#8a8270', 23, 6, 5, 1)
      f('#5a4632', 0, 14, 32, 7)
      f('#6a5440', 0, 14, 32, 2)
      f('#4a4a48', 2, 10, 6, 4)
      f('#4a3828', 1, 21, 3, 12)
      f('#4a3828', 28, 21, 3, 12)
    },
  },
  burnt: {
    // What the fire left: two saws charred black and a scorched can, swept against the wall.
    w: 32,
    h: 16,
    draw: (f) => {
      f('#1a1816', 1, 9, 30, 5)
      f('#2a2624', 3, 6, 12, 4)
      f('#3a3634', 4, 7, 9, 1)
      f('#2a2624', 17, 5, 13, 5)
      f('#5a3020', 20, 7, 3, 2)
      f('#24201e', 23, 1, 6, 13)
      f('#3a3634', 24, 2, 4, 1)
    },
  },
  bay: {
    // The storage bay in the shed's front wall, seen from inside: the back of the roller shutter
    // down over it, jammed (v 1: rolled up into its drum, the shelves either side showing a shoebox,
    // a coil of rope and a tin, and the grey of outside through the opening).
    w: 48,
    h: 30,
    draw: (f, v) => {
      f('#3a3c3e', 0, 0, 48, 29)
      f('#4a4c4e', 0, 0, 48, 3)
      if (v) {
        f('#5a5c58', 2, 3, 44, 5)
        f('#4a4c4e', 2, 7, 44, 1)
        f('#1a1c20', 2, 8, 44, 20)
        f('#3c4450', 10, 10, 28, 18)
        f('#3e3024', 2, 14, 8, 2)
        f('#7a6a50', 3, 9, 6, 5)
        f('#3e3024', 38, 14, 8, 2)
        f('#6a5a46', 39, 10, 5, 4)
        f('#7a7a74', 40, 19, 4, 4)
        f('#3e3024', 38, 23, 8, 2)
        return
      }
      for (let y = 4; y < 27; y += 3) f('#5a5c58', 2, y, 44, 2)
      f('#7a4a35', 10, 10, 6, 2)
      f('#7a4a35', 30, 19, 8, 2)
      f('#c8c0a8', 2, 27, 44, 1)
    },
  },
  winch: {
    // The shutter's winch on a post: a spool with a crank, a catch and a toothed ratchet.
    w: 16,
    h: 30,
    draw: (f) => {
      f('#3a3c3e', 6, 0, 4, 29)
      f('#6a6a64', 2, 8, 12, 9)
      f('#8a7a60', 3, 10, 10, 5)
      f('#4a4a48', 13, 11, 3, 2)
      f('#2a2a2a', 14, 13, 1, 5)
      for (let y = 19; y < 25; y += 2) f('#8a8a84', 3, y, 4, 1)
      f('#a03028', 10, 20, 3, 3)
    },
  },
  diagram: {
    // A tin plate on a short post: a rope, a pulley, a spool, three numbered steps.
    w: 16,
    h: 28,
    draw: (f) => {
      f('#3a3c3e', 7, 14, 2, 13)
      f('#8a8a84', 1, 1, 14, 14)
      f('#a8a8a0', 1, 1, 14, 1)
      f('#3a3a36', 7, 3, 1, 7)
      f('#3a3a36', 6, 3, 3, 2)
      f('#3a3a36', 4, 9, 6, 3)
      f('#3a3a36', 11, 4, 2, 1)
      f('#3a3a36', 11, 7, 2, 1)
      f('#3a3a36', 11, 10, 2, 1)
    },
  },
  noticeboard: {
    // On a back wall: cork in a frame, a typed sheet pinned to it, a few scraps.
    w: 32,
    h: 18,
    dy: -2,
    draw: (f) => {
      f('#4a3828', 0, 1, 32, 15)
      f('#8a6a48', 2, 3, 28, 11)
      f('#d8d0b8', 5, 4, 10, 9)
      f('#8a8270', 6, 6, 8, 1)
      f('#8a8270', 6, 8, 7, 1)
      f('#8a8270', 6, 10, 8, 1)
      f('#b8a888', 19, 5, 7, 5)
      f('#a03028', 9, 4, 1, 1)
      f('#a03028', 22, 5, 1, 1)
    },
  },
  wire: {
    // The camp's perimeter: a tall chain-link fence on steel posts, barbed wire along the top.
    // Along a row (v 0), or down a column seen end on (v 1).
    w: 16,
    h: 34,
    outline: false,
    draw: (f, v) => {
      if (v) {
        f('#2b2e2e', 6, 0, 4, 33)
        f('#575c5a', 7, 0, 2, 33)
        f('#7a7f7a', 7, 2, 1, 28)
        f('#3a3d3c', 5, 30, 6, 3)
        return
      }
      f('#3a3d3c', 0, 3, 3, 30)
      f('#6a706c', 1, 3, 1, 30)
      // The mesh: diamonds, rusting.
      for (let y = 7; y < 31; y += 3)
        for (let x = 3; x < 16; x += 3) f((x + y) % 2 ? '#5c625e' : '#6e5a48', x, y, 1, 1)
      for (let y = 8; y < 31; y += 3) for (let x = 4; x < 16; x += 3) f('#4c524e', x, y, 1, 1)
      f('#5c625e', 0, 6, 16, 1)
      f('#4a4f4c', 0, 31, 16, 1)
      // Barbed wire along the top.
      f('#6a706c', 0, 2, 16, 1)
      for (const x of [2, 7, 12]) f('#8a8f8a', x, 1, 2, 3)
    },
  },
  servicegate: {
    // A steel vehicle gate between two posts, a pipe frame with a brace, chained shut in the
    // middle with a heavy padlock (v 0); or swung right back against its post, the chain hanging
    // loose and the padlock open on it (v 1: P05 solved).
    w: 64,
    h: 36,
    draw: (f, v) => {
      for (const x of [0, 59]) {
        f('#3a3d3c', x, 2, 5, 33)
        f('#5a605c', x + 1, 2, 1, 33)
        f('#2a2c2c', x, 0, 5, 3)
      }
      if (v) {
        // Seen end on, swung back against the left post: a narrow frame of bars.
        f('#6a6e5a', 5, 6, 6, 3)
        f('#6a6e5a', 5, 30, 6, 3)
        f('#5a5e4c', 5, 6, 2, 27)
        f('#5a5e4c', 9, 6, 2, 27)
        f('#7a4a35', 6, 12, 2, 4)
        for (let i = 0; i < 6; i++) f(i % 2 ? '#8a8a80' : '#6a6a62', 12, 14 + i * 2, 2, 2)
        f('#a08a40', 11, 26, 5, 5)
        f('#2a2620', 12, 25, 3, 2)
        return
      }
      f('#6a6e5a', 5, 8, 54, 3)
      f('#6a6e5a', 5, 28, 54, 3)
      for (const x of [5, 20, 31, 44, 56]) f('#5a5e4c', x, 8, 3, 23)
      for (let i = 0; i < 18; i++) f('#5a5e4c', 8 + i * 2, 27 - i, 3, 2)
      for (let i = 0; i < 18; i++) f('#5a5e4c', 36 + i, 11 + i, 2, 2)
      // Rust.
      f('#7a4a35', 12, 9, 6, 2)
      f('#7a4a35', 47, 29, 5, 2)
      // The chain round the middle uprights, and the padlock.
      for (let i = 0; i < 6; i++) f(i % 2 ? '#8a8a80' : '#6a6a62', 27 + i * 2, 16, 2, 2)
      f('#a08a40', 29, 18, 7, 7)
      f('#c8b060', 30, 19, 5, 2)
      f('#2a2620', 31, 22, 3, 1)
    },
  },
  cabin: {
    // The foreman's cabin: plank walls, a tin roof, a door hanging a little open, one window.
    w: 64,
    h: 60,
    draw: (f) => {
      f('#5a4836', 0, 24, 64, 35)
      for (let y = 26; y < 58; y += 4) f('#4a3a2c', 0, y, 64, 1)
      // Tin roof, ridged and rusting.
      f('#6a6c66', 0, 6, 64, 20)
      for (let x = 2; x < 64; x += 5) f('#575954', x, 6, 2, 20)
      f('#7a4a35', 10, 18, 9, 4)
      f('#7a4a35', 44, 10, 6, 3)
      f('#4a4c48', 0, 24, 64, 2)
      // The door, ajar: dark inside.
      f('#2a211b', 32, 34, 14, 25)
      f('#0e0c0c', 34, 36, 6, 23)
      f('#4a3a2c', 40, 35, 6, 24)
      // A window, grimed over.
      f('#4a3a2c', 7, 33, 16, 13)
      f('#3c4a4a', 8, 34, 14, 11)
      f('#4a3a2c', 14, 34, 2, 11)
      // The tin plate by the door.
      f('#a8a294', 1, 40, 6, 4)
    },
  },
  shed: {
    // The maintenance shed: corrugated roof, a roller shutter jammed a little way up, a stencil.
    w: 64,
    h: 54,
    draw: (f, v) => {
      f('#5e5a50', 0, 20, 64, 33)
      for (let y = 22; y < 52; y += 4) f('#4e4a42', 0, y, 64, 1)
      f('#5c5e5a', 0, 4, 64, 17)
      for (let x = 1; x < 64; x += 3) f('#4a4c48', x, 4, 1, 17)
      f('#7a4a35', 30, 8, 10, 3)
      // The shutter, jammed: slats down to a dark gap at the bottom (v 1: P03 solved from inside,
      // rolled up into its drum, the bay's shelves dim behind it).
      f('#3c3e3a', 4, 26, 34, 27)
      if (v) {
        f('#5a5c58', 5, 26, 32, 5)
        f('#0e0e10', 5, 31, 32, 22)
        f('#3e3024', 6, 38, 30, 2)
        f('#5a4c3a', 9, 33, 8, 5)
        f('#4a4038', 26, 34, 6, 4)
      } else {
        for (let y = 27; y < 49; y += 3) f('#6a6c66', 5, y, 32, 2)
        f('#0c0c0c', 5, 50, 32, 3)
      }
      // The side door, under the stencil: planks, a latch.
      f('#2a211b', 49, 36, 12, 17)
      f('#4a3a2c', 50, 37, 10, 16)
      f('#3a2e24', 54, 37, 1, 16)
      f('#b0a080', 57, 44, 2, 2)
      // MAINTENANCE, stencilled.
      f('#c7c0aa', 42, 30, 18, 4)
      f('#5e5a50', 44, 31, 2, 2)
      f('#5e5a50', 50, 31, 2, 2)
      f('#5e5a50', 56, 31, 2, 2)
    },
  },
  forksign: {
    // A signpost with two arms: west and east.
    w: 22,
    h: 44,
    dx: -3,
    draw: (f) => {
      f('#4a3a2c', 10, 6, 3, 37)
      f('#5c4936', 10, 6, 1, 37)
      f('#6a5642', 0, 8, 12, 5)
      f('#6a5642', 0, 10, 1, 1)
      f('#c7bea0', 2, 10, 8, 1)
      f('#6a5642', 11, 17, 11, 5)
      f('#c7bea0', 13, 19, 7, 1)
      f('#3f5a32', 12, 30, 3, 3)
    },
  },
  closedsign: {
    // A ROAD CLOSED board on two legs, striped red and white, faded.
    w: 20,
    h: 26,
    dx: -2,
    draw: (f) => {
      f('#4a3a2c', 3, 12, 2, 13)
      f('#4a3a2c', 15, 12, 2, 13)
      f('#cfc8b8', 0, 4, 20, 9)
      for (let x = 0; x < 20; x += 6) f('#8a3a30', x, 4, 3, 9)
      f('#2a2420', 2, 14, 16, 1)
    },
  },
  bedroll: {
    // A bedroll tied with string, and a thermos beside it.
    w: 32,
    h: 16,
    outline: false,
    draw: (f) => {
      f('rgba(0,0,0,0.25)', 2, 12, 26, 3)
      f('#3a4a5a', 2, 4, 22, 9)
      f('#4a5c6e', 2, 4, 22, 3)
      f('#2e3a46', 23, 4, 2, 9)
      for (const x of [8, 17]) f('#c7bea0', x, 4, 1, 9)
      f('#e0d8c0', 10, 5, 5, 3)
      f('#8a3a30', 27, 3, 4, 10)
      f('#a8a294', 27, 2, 4, 2)
    },
  },
  firepit: {
    // A ring of stones round grey ash, a thread of smoke, a tin mug on one stone.
    w: 16,
    h: 16,
    outline: false,
    draw: (f) => {
      for (const [x, y] of [
        [2, 8],
        [5, 5],
        [9, 5],
        [12, 8],
        [10, 12],
        [4, 12],
      ])
        f('#6f6c64', x, y, 3, 3)
      f('#5a5850', 5, 8, 7, 4)
      f('#7a7670', 6, 9, 4, 2)
      f('#2a2420', 7, 9, 2, 1)
      // The mug.
      f('#8a8f8a', 12, 4, 3, 4)
      f('#6a706c', 15, 5, 1, 2)
    },
  },
  kettle: {
    // Nora's tea kettle, dented on one side, blackened underneath.
    w: 14,
    h: 16,
    dx: 1,
    draw: (f) => {
      f('#8a8f8a', 2, 6, 10, 8)
      f('#a8aca6', 3, 6, 8, 2)
      f('#6a706c', 9, 9, 2, 3)
      f('#2a2c2c', 2, 13, 10, 2)
      f('#6a706c', 0, 7, 2, 3)
      f('#4a4f4c', 4, 3, 6, 2)
      f('#4a4f4c', 4, 2, 1, 2)
      f('#4a4f4c', 9, 2, 1, 2)
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

// Daniel Bell's locker (PUZZLES.md P02): a locker with his name taped on, and once its dial lock is
// worked (Forest.open: v 1), swung open.
PROP_ART.belllocker = { ...PROP_ART.locker, draw: (f, v) => PROP_ART.locker.draw(f, v ? 2 : 1) }

function propSprite(id: string, v: number) {
  const a = PROP_ART[id]
  if (!a) return null
  return sprite(`prop:${id}:${v}`, a.w, a.h, (f) => a.draw(f, v), a.outline ?? true)
}

/**
 * The Route 9 bus, side on, facing left: a long cream-and-green body gone to rust, the door at the
 * front, ROUTE 9 on the destination board. `open`: its door folded open. `full`: a crew run, its
 * windows faintly lit with the shapes of people standing inside; otherwise the windows are black
 * (no one aboard, no one driving). Drawn facing `dir` (-1 left, 1 right), with its middle at x and
 * its wheels on y (px), at `alpha`.
 */
export function drawBus(
  c: Ctx,
  x: number,
  y: number,
  open: boolean,
  full: boolean,
  dir: -1 | 1 = -1,
  alpha = 1,
) {
  const bus = sprite(
    `bus${open ? 1 : 0}${full ? 1 : 0}`,
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
      // Windows: black and empty, or dimly lit with the crew standing in them.
      for (let i = 0; i < 7; i++) {
        const wx = 18 + i * 11
        f(full ? '#3d3a2c' : '#151619', wx, 10, 9, 10)
        if (full) {
          // Heads and shoulders, a little different in each, some turned away: very faint, barely
          // darker than the lit glass.
          const hx = wx + 2 + ((i * 3) % 4)
          f('#322f24', hx, 12 + (i % 2), 3, 3)
          f('#322f24', hx - 1, 15 + (i % 2), 5, 5)
          if (i % 3 === 0) {
            f('#322f24', wx + 7, 13, 2, 3)
            f('#322f24', wx + 6, 16, 3, 4)
          }
        }
      }
      f(full ? '#3d3a2c' : '#151619', 4, 10, 10, 10)
      f('#2a2c30', 5, 11, 4, 3)
      // The door, just behind the front.
      f(open ? (full ? '#2a2820' : '#0c0c0e') : '#3c4a40', 15, 10, 8, 24)
      if (!open) f(full ? '#3d3a2c' : '#151619', 16, 12, 6, 9)
      // Destination board: HOLLOW PINES on a crew run, SUNSET ACRES on the empty one.
      f('#1e1f22', 22, 4, 26, 4)
      if (full) {
        f('#d8b860', 24, 5, 10, 2)
        f('#d8b860', 36, 5, 10, 2)
      } else {
        f('#d8b860', 24, 5, 12, 2)
        f('#d8b860', 38, 5, 8, 2)
      }
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
  c.save()
  c.globalAlpha *= alpha
  c.translate(Math.round(x), Math.round(y - 44))
  if (dir === 1) c.scale(-1, 1)
  c.drawImage(bus, -50, 0)
  c.restore()
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
      const sp = propSprite(id, o.v)
      if (sp)
        c.drawImage(sp, px + (PROP_ART[id].dx ?? 0), py + 16 - sp.height + (PROP_ART[id].dy ?? 0))
      return
    }
  }
}

/** Builds the story's sprites up front (under the fade into the forest). */
export function warmStory() {
  shelter()
  busSign()
  for (const id of Object.keys(FIND_ART)) findSprite(id)
  for (let d = 0; d < 4; d++) for (let v = 0; v < 2; v++) prints(d, v)
  for (const id of Object.keys(PROP_ART)) for (let v = 0; v < 3; v++) propSprite(id, v)
  const c = document.createElement('canvas').getContext('2d')!
  for (const open of [false, true])
    for (const full of [false, true]) drawBus(c, -200, -200, open, full)
}

/** Flat on the ground (drawn under people): finds that aren't on a tree, and footprints. */
export function flatStory(o: ForestObj): boolean {
  return (
    o.k === 'prints' ||
    (o.k === 'prop' &&
      (o.id === 'rail' ||
        o.id === 'bedroll' ||
        o.id === 'firepit' ||
        o.id === 'papers' ||
        o.id === 'chair' ||
        o.id === 'doormat')) ||
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

/**
 * A key, for your pocket and the board: an old brass key on a paper tag (`tag`: its colour), drawn
 * at `size` px square (a cached canvas, pixel-scaled).
 */
export function keyIcon(tag: string, size: number): HTMLCanvasElement {
  const small = sprite(`keyicon:${tag}`, 16, 16, (f) => {
    f('#c8a040', 2, 3, 6, 6)
    f('#e0bc58', 3, 3, 4, 1)
    f('#2a211b', 4, 5, 2, 2)
    f('#c8a040', 7, 5, 7, 2)
    f('#c8a040', 11, 7, 1, 3)
    f('#c8a040', 13, 7, 1, 2)
    // The tag, on a bit of string.
    f('#8a7a60', 5, 9, 1, 2)
    f(tag, 3, 11, 6, 4)
    f('#6a5a46', 4, 12, 4, 1)
  })
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  c.drawImage(small, 0, 0, size, size)
  return cv
}
