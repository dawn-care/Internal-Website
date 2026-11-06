import { HAIR_COLORS, OUTFIT_COLORS, PANTS_COLORS, SKIN_TONES } from '../shared/catalog'
import type { Dir, Look } from '../shared/schema'
import { pen } from './art'

/*
 * Little old people: 16×24 sprites drawn procedurally from a Look, with four directions and
 * a 4-frame shuffle. Each combination is rendered once and cached, with a dark outline added
 * around the opaque pixels for that Stardew-ish look.
 */

export const SPR_W = 16
export const SPR_H = 24

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const cache = new Map<string, HTMLCanvasElement>()

export function lookKey(l: Look): string {
  return `${l.body}.${l.skin}.${l.hair}.${l.hairColor}.${l.outfit}.${l.pants}.${l.accessory}`
}

/** dir: 0 down, 1 left, 2 right, 3 up. frame: 0–3 (1 and 3 are steps). */
export function personSprite(look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  const key = `${lookKey(look)}|${dir}|${frame}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = SPR_W
  cv.height = SPR_H
  const c = cv.getContext('2d')!
  if (dir === 1) {
    // Left is the right-facing sprite, mirrored.
    c.translate(SPR_W, 0)
    c.scale(-1, 1)
    c.drawImage(personSprite(look, 2, frame), 0, 0)
  } else {
    drawPerson(c, look, dir, frame)
    outline(c)
  }
  cache.set(key, cv)
  return cv
}

function outline(c: CanvasRenderingContext2D) {
  const img = c.getImageData(0, 0, SPR_W, SPR_H)
  const d = img.data
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < SPR_W && y < SPR_H && d[(y * SPR_W + x) * 4 + 3] > 0
  const out: number[] = []
  for (let y = 0; y < SPR_H; y++)
    for (let x = 0; x < SPR_W; x++) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push(x, y)
    }
  for (let i = 0; i < out.length; i += 2) {
    const o = (out[i + 1] * SPR_W + out[i]) * 4
    d[o] = 0x2b
    d[o + 1] = 0x1d
    d[o + 2] = 0x22
    d[o + 3] = 255
  }
  c.putImageData(img, 0, 0)
}

function drawPerson(c: CanvasRenderingContext2D, look: Look, dir: Dir, frame: number) {
  const f = pen(c)
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0]
  const skinD = shade(skin, -0.12)
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  const hairD = shade(hair, -0.18)
  const top = OUTFIT_COLORS[look.outfit] ?? OUTFIT_COLORS[0]
  const topD = shade(top, -0.15)
  const pants = PANTS_COLORS[look.pants] ?? PANTS_COLORS[0]
  const shoe = '#3b2a26'
  const step = frame % 2 === 1
  const bob = step ? 1 : 0
  const side = dir === 2
  const back = dir === 3

  const skirt = look.body === 'female'
  // Under a skirt the legs are stockings.
  const legs = skirt ? '#e6d6c2' : pants

  // Legs and shoes (they don't bob).
  if (side) {
    const fwd = frame === 1 ? 2 : frame === 3 ? -2 : 0
    f(legs, 6 + Math.max(0, -fwd) / 2, 18, 3, 3)
    f(legs, 7 + fwd / 2, 18, 3, 3)
    f(shoe, 5 + Math.max(0, -fwd), 21, 4, 2)
    f(shoe, 7 + Math.max(0, fwd), 21, 4, 2)
  } else {
    const l = frame === 1 ? -1 : 0
    const r = frame === 3 ? -1 : 0
    f(legs, 5, 18, 3, 3 + l)
    f(legs, 8, 18, 3, 3 + r)
    f(shoe, 5, 21 + l, 3, 2)
    f(shoe, 8, 21 + r, 3, 2)
  }

  const y0 = -bob // everything above the legs bobs up on a step

  // Body: a cardigan.
  if (side) {
    f(top, 5, 11 + y0, 7, 8)
    f(topD, 5, 17 + y0, 7, 1)
    f(topD, 10, 11 + y0, 2, 7)
    // Arm, swinging with the step.
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0
    f(topD, 7 + swing, 12 + y0, 3, 5)
    f(skin, 7 + swing, 17 + y0, 3, 2)
  } else {
    f(top, 4, 11 + y0, 8, 8)
    f(topD, 4, 17 + y0, 8, 1)
    f(topD, 3, 12 + y0, 1, 5)
    f(topD, 12, 12 + y0, 1, 5)
    f(skin, 3, 17 + y0, 1, 2)
    f(skin, 12, 17 + y0, 1, 2)
    if (!back) {
      f('#fff8ef', 7, 11 + y0, 2, 2)
      f(topD, 8, 13 + y0, 1, 5)
      f('#f2e6c8', 7, 14 + y0)
      f('#f2e6c8', 7, 16 + y0)
    } else {
      f(topD, 7, 12 + y0, 2, 6)
    }
  }

  // A skirt over the top of the legs, flaring at the hem.
  if (skirt) {
    const hem = shade(pants, -0.15)
    if (side) {
      f(pants, 5, 17 + y0, 7, 2)
      f(pants, 4, 19 + y0, 9, 1)
      f(hem, 4, 20 + y0, 9, 1)
    } else {
      f(pants, 4, 17 + y0, 8, 2)
      f(pants, 3, 19 + y0, 10, 1)
      f(hem, 3, 20 + y0, 10, 1)
    }
  }

  // Head.
  const hx = side ? 4 : 4
  f(skin, hx, 3 + y0, 8, 8)
  f(skinD, hx, 10 + y0, 8, 1)
  if (dir === 0) {
    f('#2b1d22', 6, 7 + y0)
    f('#2b1d22', 9, 7 + y0)
    if (skirt) {
      f('#f0a0a0', 5, 8 + y0)
      f('#f0a0a0', 10, 8 + y0)
    }
    f(skinD, 7, 9 + y0, 2, 1)
    f(shade(skin, -0.2), 6, 6 + y0, 1, 1)
    f(shade(skin, -0.2), 9, 6 + y0, 1, 1)
  } else if (side) {
    f('#2b1d22', 10, 7 + y0)
    f(skin, 12, 7 + y0, 1, 2)
    if (skirt) f('#f0a0a0', 9, 8 + y0)
    f(skinD, 6, 6 + y0, 1, 3) // ear
  }

  drawHair(f, look.hair, dir, y0, hair, hairD)
  // Bushy eyebrows for the gents.
  if (!skirt && look.hair !== 'perm') {
    if (dir === 0) {
      f(hairD, 5, 5 + y0, 2, 1)
      f(hairD, 9, 5 + y0, 2, 1)
    } else if (side) f(hairD, 9, 5 + y0, 3, 1)
  }

  // Accessories.
  switch (look.accessory) {
    case 'glasses':
      if (dir === 0) {
        f('#5a4a5e', 5, 6 + y0, 3, 1)
        f('#5a4a5e', 8, 6 + y0, 3, 1)
        f('#5a4a5e', 5, 7 + y0, 1, 1)
        f('#5a4a5e', 7, 7 + y0, 2, 1)
        f('#5a4a5e', 10, 7 + y0, 1, 1)
        f('#c9e4f2', 6, 7 + y0)
        f('#c9e4f2', 9, 7 + y0)
      } else if (side) {
        f('#5a4a5e', 9, 6 + y0, 3, 1)
        f('#5a4a5e', 6, 6 + y0, 3, 1)
        f('#c9e4f2', 10, 7 + y0)
      }
      break
    case 'hat':
      f('#e9d39a', 1, 3 + y0, 14, 2)
      f('#e9d39a', 4, 0 + y0, 8, 4)
      f(top, 4, 2 + y0, 8, 1)
      f('#f4e4b4', 5, 0 + y0, 4, 1)
      break
    case 'cane':
      if (!back) {
        const cx = side ? 12 : 13
        f('#7a4e2d', cx, 14 + y0, 1, 9 + bob)
        f('#7a4e2d', cx - 1, 13 + y0, 2, 1)
      }
      break
    case 'pearls':
      if (!back) for (let x = side ? 6 : 5; x < (side ? 11 : 11); x += 2) f('#fffdf6', x, 11 + y0)
      break
    case 'scarf': {
      const sc = shade(top, 0.25)
      f(sc, side ? 5 : 4, 10 + y0, side ? 7 : 8, 2)
      if (!back) f(sc, side ? 5 : 9, 12 + y0, 2, 4)
      break
    }
  }
}

type Pen = ReturnType<typeof pen>

function drawHair(f: Pen, style: Look['hair'], dir: Dir, y0: number, h: string, hd: string) {
  const side = dir === 2
  const back = dir === 3
  const y = (v: number) => v + y0
  switch (style) {
    case 'bald':
      if (side) {
        f(h, 4, y(6), 2, 3)
      } else {
        f(h, 4, y(6), 1, 3)
        f(h, 11, y(6), 1, 3)
        if (back) f(h, 4, y(7), 8, 2)
      }
      f('#ffffff', 6, y(3), 2, 1) // shine
      break
    case 'short':
      f(h, 4, y(2), 8, 3)
      f(hd, 4, y(4), 8, 1)
      if (side) f(h, 4, y(4), 3, 4)
      else {
        f(h, 4, y(4), 1, 3)
        f(h, 11, y(4), 1, 3)
      }
      if (back) f(h, 4, y(4), 8, 5)
      break
    case 'bun':
      f(h, 4, y(2), 8, 3)
      f(hd, 5, y(4), 6, 1)
      f(h, side ? 2 : 6, y(side ? 2 : -1), 4, 4)
      f(hd, side ? 2 : 6, y(side ? 5 : 2), 4, 1)
      if (side) f(h, 4, y(4), 3, 4)
      else {
        f(h, 4, y(4), 1, 4)
        f(h, 11, y(4), 1, 4)
      }
      if (back) f(h, 4, y(4), 8, 5)
      break
    case 'curly':
      for (let x = 3; x < 13; x += 2) f(x % 4 === 1 ? hd : h, x, y(1 + (x % 4 === 1 ? 1 : 0)), 2, 3)
      f(h, 3, y(3), 10, 2)
      if (side) f(h, 3, y(4), 4, 5)
      else {
        f(h, 3, y(4), 2, 4)
        f(h, 11, y(4), 2, 4)
        f(hd, 3, y(7), 1, 1)
        f(hd, 12, y(7), 1, 1)
      }
      if (back) f(h, 3, y(4), 10, 6)
      break
    case 'perm':
      f(h, 2, y(0), 12, 5)
      f(h, 3, y(-1), 10, 1)
      f(hd, 3, y(4), 10, 1)
      for (let x = 2; x < 14; x += 3) f(hd, x, y(1), 1, 1)
      if (side) f(h, 2, y(4), 5, 6)
      else {
        f(h, 2, y(4), 2, 6)
        f(h, 12, y(4), 2, 6)
      }
      if (back) f(h, 2, y(4), 12, 7)
      break
    case 'long':
      f(h, 4, y(2), 8, 3)
      f(hd, 4, y(4), 8, 1)
      if (side) f(h, 3, y(4), 4, 10)
      else {
        f(h, 3, y(4), 2, 10)
        f(h, 11, y(4), 2, 10)
      }
      if (back) f(h, 3, y(4), 10, 10)
      break
  }
}
