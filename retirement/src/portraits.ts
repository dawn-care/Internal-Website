import { HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES } from '../shared/catalog'
import type { Look } from '../shared/schema'
import { pen } from './art'
import { lookKey } from './people'

/*
 * Dialogue portraits: a 48×48 head-and-shoulders bust drawn from a Look, with much more detail
 * than the 16×24 walking sprites (shaded skin, eyes with whites and a glint, brows, nose, lips,
 * smile lines, hair with highlights). Frames for talking and blinking. Shown at 3× in the dialogue
 * box.
 *
 * Every feature is drawn by its own function from a Face description, so the forest can
 * later make an impostor's face go wrong in stages (FOREST.md, "Refusing a fake") by changing the
 * Face (drained colours, black eyes, no blink, a tilted or stretched head) instead of new art.
 */

export const PORTRAIT = 48

export interface PortraitOptions {
  /** Residents get smile lines and crow's feet; staff (Nurse Ada, Chef Rosa) don't. */
  old?: boolean
  /** Mouth open (alternates with closed while the text types out). */
  talk?: boolean
  /** Eyes closed. */
  blink?: boolean
}

/** Everything a portrait is drawn from. The forest can tamper with these. */
export interface Face {
  look: Look
  skin: string
  hair: string
  outfit: string
  eye: string
  old: boolean
  talk: boolean
  blink: boolean
}

const EYE_COLORS = ['#5b3a22', '#3d6fb0', '#4b7d41', '#6e5434', '#46607a']
const OUTLINE = '#2b1d22'

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  return `#${((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1)}`
}

function strHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function faceFor(look: Look, opts: PortraitOptions = {}): Face {
  return {
    look,
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[0],
    hair: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    outfit: OUTFIT_COLORS[look.outfit] ?? OUTFIT_COLORS[0],
    // Look has no eye colour; pick a steady one from the name so a person always matches.
    eye: EYE_COLORS[strHash(look.name) % EYE_COLORS.length],
    old: opts.old ?? true,
    talk: opts.talk ?? false,
    blink: opts.blink ?? false,
  }
}

const cache = new Map<string, HTMLCanvasElement>()

export function portrait(look: Look, opts: PortraitOptions = {}): HTMLCanvasElement {
  const face = faceFor(look, opts)
  const key = `${lookKey(look)}|${look.name}|${face.old}|${face.talk}|${face.blink}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = drawFace(face)
  cache.set(key, cv)
  return cv
}

/** Draws a Face onto a fresh canvas. */
export function drawFace(face: Face): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = PORTRAIT
  cv.height = PORTRAIT
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  const f = pen(c)
  const fill = (color: string, cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry
      if (Math.abs(dy) > 1) continue
      const half = rx * Math.sqrt(1 - dy * dy)
      const x0 = Math.round(cx - half)
      const x1 = Math.round(cx + half)
      if (x1 > x0) f(color, x0, y, x1 - x0, 1)
    }
  }

  const hairBack = face.look.hair === 'long'
  if (hairBack) drawHairBack(f, fill, face)
  drawShoulders(f, fill, face)
  drawHead(f, fill, face)
  drawHair(f, fill, face)
  outline(c)
  drawEyes(f, face)
  drawBrows(f, face)
  drawNose(f, face)
  drawMouth(f, face)
  if (face.old) drawLines(f, face)
  drawAccessory(f, fill, face)
  return cv
}

type Pen = ReturnType<typeof pen>
type Fill = (color: string, cx: number, cy: number, rx: number, ry: number) => void

function drawShoulders(f: Pen, fill: Fill, face: Face) {
  const top = face.outfit
  const topD = shade(top, -0.14)
  const topL = shade(top, 0.08)
  // Shoulders and chest, rounded at the top.
  fill(top, 24, 47, 20, 10)
  f(top, 4, 44, 40, 4)
  fill(topL, 17, 43, 9, 4)
  f(topD, 34, 40, 8, 8)
  // Neck.
  const neck = shade(face.skin, -0.06)
  f(neck, 20, 30, 8, 8)
  f(shade(face.skin, -0.16), 20, 33, 8, 2)
  // Blouse collar points.
  f('#fff8ef', 17, 37, 6, 3)
  f('#fff8ef', 25, 37, 6, 3)
  f('#fff8ef', 19, 40, 3, 1)
  f('#fff8ef', 26, 40, 3, 1)
  f('#e8dcc6', 22, 38, 4, 2)
  // Cardigan opening and buttons.
  f(topD, 23, 40, 2, 8)
  f('#f4e8c8', 21, 43, 1, 1)
  f('#f4e8c8', 21, 46, 1, 1)
}

function drawHead(f: Pen, fill: Fill, face: Face) {
  const skin = face.skin
  const skinD = shade(skin, -0.09)
  const skinL = shade(skin, 0.06)
  const male = face.look.body === 'male'
  // Ears.
  fill(skinD, 13.5, 22.5, 2.5, 3.5)
  fill(skinD, 34.5, 22.5, 2.5, 3.5)
  f(shade(skin, -0.18), 13, 22, 1, 2)
  f(shade(skin, -0.18), 35, 22, 1, 2)
  // Face: a soft oval, a little squarer at the jaw for men.
  fill(skin, 24, 21, 10.5, 12)
  if (male) f(skin, 15, 24, 18, 6)
  // Shading: light from the top left.
  fill(skinD, 31, 23, 3.5, 9)
  f(skinD, 17, 31, 14, 2)
  fill(skinL, 19, 15, 4, 3)
  fill(skinL, 18, 25, 2.5, 2)
}

function hairShades(face: Face) {
  const hair = face.hair
  return { hair, hairD: shade(hair, -0.16), hairL: shade(hair, 0.1), hairDD: shade(hair, -0.28) }
}

function drawHairBack(f: Pen, fill: Fill, face: Face) {
  const { hair, hairD } = hairShades(face)
  f(hairD, 11, 18, 26, 24)
  f(hair, 12, 18, 6, 26)
  f(hair, 30, 18, 6, 26)
  fill(hair, 24, 16, 14, 10)
}

function drawHair(f: Pen, fill: Fill, face: Face) {
  const { hair, hairD, hairL, hairDD } = hairShades(face)
  const strands = (x0: number, y0: number, w: number, h: number) => {
    for (let x = x0; x < x0 + w; x += 3) f(hairD, x, y0, 1, h)
  }
  switch (face.look.hair) {
    case 'bun':
      fill(hair, 24, 4.5, 6, 4.5)
      fill(hairL, 22.5, 3.5, 2.5, 1.5)
      f(hairDD, 19, 8, 10, 1)
      fill(hair, 24, 13, 12, 6.5)
      f(hair, 12, 12, 4, 11)
      f(hair, 32, 12, 4, 11)
      strands(15, 9, 18, 4)
      fill(hairL, 19, 9.5, 4, 1.5)
      break
    case 'short':
      // Cropped above the ears with a side parting and a fringe swept across.
      fill(hair, 24, 12, 12.5, 6.5)
      f(hair, 12, 12, 4, 9)
      f(hair, 32, 12, 4, 9)
      f(hairD, 12, 19, 2, 2)
      f(hairD, 34, 19, 2, 2)
      f(hair, 15, 15, 4, 2)
      for (let i = 0; i < 4; i++) f(hair, 19 + i * 3, 15 + (i > 1 ? 1 : 0), 5 - i, 2)
      f(hairDD, 18, 6, 1, 7)
      f(hairD, 19, 13, 9, 1)
      for (const [x, y] of [
        [14, 10],
        [27, 9],
        [31, 11],
        [22, 11],
      ])
        f(hairD, x, y, 3, 1)
      fill(hairL, 15.5, 9.5, 2.5, 1.2)
      fill(hairL, 25, 8, 4, 1.2)
      break
    case 'curly':
    case 'perm': {
      const big = face.look.hair === 'perm'
      const curls = big
        ? [
            [13, 13],
            [18, 9],
            [24, 7.5],
            [30, 9],
            [35, 13],
            [11, 19],
            [37, 19],
            [11, 25],
            [37, 25],
          ]
        : [
            [15, 12],
            [20, 9],
            [26, 9],
            [32, 12],
            [13, 18],
            [35, 18],
            [13, 23],
            [35, 23],
          ]
      const r = big ? 5 : 4
      for (const [x, y] of curls) fill(hair, x, y, r, r)
      for (const [x, y] of curls) {
        f(hairD, x - 1, y + 1, 3, 1)
        f(hairL, x - 2, y - 2, 2, 1)
      }
      fill(hair, 24, 13, 9, 3)
      break
    }
    case 'long':
      fill(hair, 24, 12.5, 12.5, 7)
      f(hair, 11, 12, 5, 30)
      f(hair, 32, 12, 5, 30)
      strands(12, 16, 4, 24)
      strands(33, 16, 4, 24)
      // Centre parting.
      f(hairDD, 24, 7, 1, 7)
      fill(hairL, 19, 9.5, 3, 1.5)
      fill(hairL, 29, 9.5, 3, 1.5)
      break
    case 'bald':
      // A fringe of hair round the sides, and a shiny scalp.
      f(hair, 12, 15, 4, 10)
      f(hair, 32, 15, 4, 10)
      f(hairD, 13, 18, 2, 6)
      f(hairD, 33, 18, 2, 6)
      f(shade(face.skin, 0.1), 19, 10, 4, 2)
      break
  }
}

function drawEyes(f: Pen, face: Face) {
  const lid = shade(face.skin, -0.22)
  for (const x of [17, 27]) {
    if (face.blink) {
      f(OUTLINE, x, 22, 5, 1)
      f(lid, x + 1, 21, 3, 1)
      continue
    }
    f('#fff8ef', x, 21, 5, 3)
    f(face.eye, x + 1, 21, 3, 3)
    f('#1f1418', x + 2, 22, 1, 2)
    f('#ffffff', x + 1, 21, 1, 1)
    // Upper lid and lashes.
    f(OUTLINE, x, 20, 5, 1)
    f(OUTLINE, x + (x < 24 ? -1 : 5), 21, 1, 1)
    f(lid, x, 24, 5, 1)
  }
}

function drawBrows(f: Pen, face: Face) {
  // White or pale hair still gets visible brows: a soft grey.
  const n = parseInt(face.hair.slice(1), 16)
  const light = ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 560
  const brow = light ? '#9b938a' : shade(face.hair, -0.25)
  f(brow, 16, 18, 6, 1)
  f(brow, 17, 17, 4, 1)
  f(brow, 26, 18, 6, 1)
  f(brow, 27, 17, 4, 1)
}

function drawNose(f: Pen, face: Face) {
  const d = shade(face.skin, -0.14)
  f(d, 25, 22, 1, 4)
  f(d, 22, 26, 4, 1)
  f(shade(face.skin, -0.22), 23, 26, 1, 1)
  f(shade(face.skin, 0.08), 23, 23, 1, 2)
}

function drawMouth(f: Pen, face: Face) {
  const lip = face.look.body === 'female' ? '#c0565a' : shade(face.skin, -0.25)
  if (face.talk) {
    f('#5a2228', 21, 28, 6, 3)
    f('#fff8ef', 22, 28, 4, 1)
    f('#c06a6a', 22, 30, 4, 1)
    f(lip, 20, 28, 1, 1)
    f(lip, 27, 28, 1, 1)
  } else {
    // A warm closed smile.
    f(lip, 21, 29, 6, 1)
    f(lip, 20, 28, 1, 1)
    f(lip, 27, 28, 1, 1)
    f(shade(face.skin, -0.1), 22, 30, 4, 1)
  }
  // Rosy cheeks.
  f('rgba(232,110,110,0.35)', 16, 26, 3, 2)
  f('rgba(232,110,110,0.35)', 29, 26, 3, 2)
}

function drawLines(f: Pen, face: Face) {
  const w = shade(face.skin, -0.13)
  // Crow's feet, smile lines and a forehead crease.
  f(w, 15, 22, 1, 1)
  f(w, 14, 23, 1, 1)
  f(w, 32, 22, 1, 1)
  f(w, 33, 23, 1, 1)
  f(w, 19, 27, 1, 2)
  f(w, 28, 27, 1, 2)
  f(w, 20, 15, 8, 1)
}

function drawAccessory(f: Pen, fill: Fill, face: Face) {
  switch (face.look.accessory) {
    case 'glasses':
      for (const x of [16, 26]) {
        f('#6b4a2a', x - 1, 19, 8, 1)
        f('#6b4a2a', x - 1, 25, 8, 1)
        f('#6b4a2a', x - 1, 19, 1, 7)
        f('#6b4a2a', x + 6, 19, 1, 7)
        f('rgba(200,230,255,0.18)', x, 20, 6, 5)
      }
      f('#6b4a2a', 23, 21, 3, 1)
      f('#6b4a2a', 12, 21, 3, 1)
      f('#6b4a2a', 33, 21, 3, 1)
      break
    case 'hat': {
      const band = shade(face.outfit, -0.05)
      fill('#e9c46a', 24, 10, 20, 3.5)
      f('#c9a24a', 5, 11, 38, 1)
      fill('#f2d283', 24, 5, 10, 5.5)
      f(band, 14, 7, 20, 2)
      f('#fff1b8', 18, 2, 5, 1)
      break
    }
    case 'pearls':
      for (let i = 0; i < 9; i++) {
        const x = 17 + i * 1.6
        const y = 36 + Math.round(Math.sin((i / 8) * Math.PI) * 2)
        f('#fffaf0', Math.round(x), y, 1, 1)
      }
      break
    case 'scarf': {
      const scarf = face.look.outfit === 0 ? '#e0b84a' : '#c0504d'
      f(scarf, 17, 33, 14, 4)
      f(shade(scarf, -0.15), 17, 36, 14, 1)
      f(scarf, 25, 36, 4, 7)
      f(shade(scarf, 0.1), 18, 34, 6, 1)
      break
    }
    default:
      break
  }
}

/** A dark outline round the silhouette, like the walking sprites. */
function outline(c: CanvasRenderingContext2D) {
  const img = c.getImageData(0, 0, PORTRAIT, PORTRAIT)
  const d = img.data
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < PORTRAIT && y < PORTRAIT && d[(y * PORTRAIT + x) * 4 + 3] > 0
  const out: number[] = []
  for (let y = 0; y < PORTRAIT; y++)
    for (let x = 0; x < PORTRAIT; x++) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push(x, y)
    }
  for (let i = 0; i < out.length; i += 2) {
    const o = (out[i + 1] * PORTRAIT + out[i]) * 4
    d[o] = 0x2b
    d[o + 1] = 0x1d
    d[o + 2] = 0x22
    d[o + 3] = 255
  }
  c.putImageData(img, 0, 0)
}
