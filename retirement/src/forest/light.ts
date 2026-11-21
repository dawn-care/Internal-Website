import {
  DARK_DEEP,
  DARK_FULL_AT,
  MAP_DARK,
  DARK_NEAR,
  DARK_NIGHT,
  FOG_ALPHA,
  FOG_BANKS,
  GRADE_STEPS,
  LIGHT_DEEP,
  LIGHT_NEAR,
} from './tuning'

/*
 * Darkness, your circle of light, fog, and the colour grade, for the outskirts and the forest.
 * All of it is cheap per frame: the glow and fog sprites are made once (per size), and the
 * darkness is one fill and one cut-out on a canvas the size of the (small) scene.
 */

type Ctx = CanvasRenderingContext2D

// --- the colour grade -----------------------------------------------------------------------------

/** The property's bright grade, and the drained one the outskirts fade towards at the treeline. */
const PROPERTY = { sat: 1.18, con: 1.06, bri: 1 }
const TREELINE = { sat: 0.7, con: 1.08, bri: 0.94 }
/** In the forest: at the entry, and deep in (a touch brighter than MOODS.forest in src/game.ts, which the darkness layer makes up for). */
const FOREST_NEAR = { sat: 0.42, con: 1.15, bri: 0.95 }
const FOREST_DEEP = { sat: 0.26, con: 1.2, bri: 0.85 }
/** Deepest of all: where the empty bus lets you off. Almost no colour left, and darker. */
const FOREST_DEEPEST = { sat: 0.1, con: 1.3, bri: 0.72 }

const grades = new Map<string, string>()
function grade(a: typeof PROPERTY, b: typeof PROPERTY, t: number): string {
  const step = Math.round(Math.max(0, Math.min(1, t)) * GRADE_STEPS)
  const key = `${a.sat},${b.sat},${step}`
  let g = grades.get(key)
  if (!g) {
    const k = step / GRADE_STEPS
    const l = (p: number, q: number) => (p + (q - p) * k).toFixed(3)
    g = `saturate(${l(a.sat, b.sat)}) contrast(${l(a.con, b.con)}) brightness(${l(a.bri, b.bri)})`
    grades.set(key, g)
  }
  return g
}

/** The grade on the grounds, `wild` (0 in the established area, 1 at the treeline) out. */
export function outskirtsGrade(wild: number): string {
  return grade(PROPERTY, TREELINE, wild)
}

/**
 * The grade in the forest, `deep` (0 at the entry, 1 as dark as it gets) in; `deepest` (0–1) goes
 * on past that, to where the empty bus lets you off.
 */
export function forestGrade(deep: number, deepest = 0): string {
  if (deepest > 0) return grade(FOREST_DEEP, FOREST_DEEPEST, deepest)
  return grade(FOREST_NEAR, FOREST_DEEP, deep)
}

/** How dark it is on the map (0–1), from your distance to the entry (MAP_DARK). */
export function mapDeepness(depth: number): number {
  const pts = MAP_DARK
  if (depth <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [d1, v1] = pts[i]
    if (depth <= d1) {
      const [d0, v0] = pts[i - 1]
      return v0 + ((v1 - v0) * (depth - d0)) / (d1 - d0)
    }
  }
  return pts[pts.length - 1][1]
}

/** How deep in you are, 0–1, from your distance to the entry. */
export function deepness(depth: number): number {
  return Math.max(0, Math.min(1, depth / DARK_FULL_AT))
}

// --- light and darkness ---------------------------------------------------------------------------

const glows = new Map<string, HTMLCanvasElement>()
/** A soft round glow: opaque in the middle, fading to nothing at radius r (px). */
function glow(r: number, color = '255,255,255'): HTMLCanvasElement {
  const key = `${r}|${color}`
  let cv = glows.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = cv.height = r * 2
    const c = cv.getContext('2d')!
    const g = c.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, `rgba(${color},1)`)
    g.addColorStop(0.45, `rgba(${color},0.85)`)
    g.addColorStop(0.75, `rgba(${color},0.35)`)
    g.addColorStop(1, `rgba(${color},0)`)
    c.fillStyle = g
    c.fillRect(0, 0, r * 2, r * 2)
    glows.set(key, cv)
  }
  return cv
}

/** Your circle of light's radius (tiles) at a depth. */
export function lightRadius(deep: number): number {
  return LIGHT_NEAR + (LIGHT_DEEP - LIGHT_NEAR) * deep
}

/** How dark it is beyond your light (0–1). `night` is 0 by day, 1 at full night. */
export function darknessAt(deep: number, night: number): number {
  return Math.min(0.97, DARK_NEAR + (DARK_DEEP - DARK_NEAR) * deep + DARK_NIGHT * night)
}

const beams = new Map<number, HTMLCanvasElement>()

/**
 * Your lantern's beam, pointing right from its origin at (BEAM_AT, height / 2): a wedge `half`
 * radians either side, fading out over `len` px and soft at its edges. Cached per length (in steps
 * of 8 px), so it's drawn with one rotated drawImage a frame.
 */
export function beamSprite(len: number, half: number): HTMLCanvasElement {
  const L = Math.max(16, Math.round(len / 8) * 8)
  let cv = beams.get(L)
  if (cv) return cv
  const spread = Math.tan(half) * L
  cv = document.createElement('canvas')
  cv.width = L + BEAM_AT * 2
  cv.height = Math.ceil(spread * 2) + BEAM_AT * 2
  const c = cv.getContext('2d')!
  const cy = cv.height / 2
  c.filter = 'blur(5px)'
  const g = c.createRadialGradient(BEAM_AT, cy, 0, BEAM_AT, cy, L)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.65, 'rgba(0,0,0,0.85)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g
  c.beginPath()
  c.moveTo(BEAM_AT, cy - 4)
  c.lineTo(BEAM_AT + L, cy - spread)
  c.lineTo(BEAM_AT + L, cy + spread)
  c.lineTo(BEAM_AT, cy + 4)
  c.closePath()
  c.fill()
  beams.set(L, cv)
  return cv
}
/** Room round the beam's sprite for its soft edges (px). */
const BEAM_AT = 12

/** Your lantern's beam for this frame: which way (radians), how far (px), how wide, how lit. */
export interface Beam {
  angle: number
  len: number
  half: number
  a: number
}

export class Darkness {
  private cv = document.createElement('canvas')
  private c = this.cv.getContext('2d')!

  /**
   * Darkens the scene except round (lx, ly) (px). `glows` are other lights (the home's windows
   * through the trees): each cuts a softer hole and adds a little warm colour.
   */
  draw(
    scene: Ctx,
    w: number,
    h: number,
    lx: number,
    ly: number,
    radiusPx: number,
    dark: number,
    others: { x: number; y: number; r: number; a: number }[],
    /** More cut out of the dark, faintly (the paths, so you can see where they go). */
    cut?: (c: Ctx) => void,
    /** Your lantern's beam, from (lx, ly), as well as the light round you (`radiusPx`). */
    beam?: Beam,
  ) {
    if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width = w
      this.cv.height = h
    }
    const c = this.c
    c.globalCompositeOperation = 'source-over'
    c.clearRect(0, 0, w, h)
    c.fillStyle = `rgba(3,6,11,${dark})`
    c.fillRect(0, 0, w, h)
    c.globalCompositeOperation = 'destination-out'
    // Quantized, so a handful of sprite sizes covers every depth.
    const r = Math.max(8, Math.round(radiusPx / 4) * 4)
    c.drawImage(glow(r), Math.round(lx - r), Math.round(ly - r))
    if (beam && beam.a > 0.01) {
      const sp = beamSprite(beam.len, beam.half)
      c.save()
      c.globalAlpha = beam.a
      c.translate(Math.round(lx), Math.round(ly))
      c.rotate(beam.angle)
      c.drawImage(sp, -BEAM_AT, -sp.height / 2)
      c.restore()
    }
    if (cut) {
      c.save()
      cut(c)
      c.restore()
    }
    for (const o of others) {
      const or = Math.max(8, Math.round(o.r / 4) * 4)
      c.globalAlpha = o.a
      c.drawImage(glow(or), Math.round(o.x - or), Math.round(o.y - or))
      c.globalAlpha = 1
    }
    c.globalCompositeOperation = 'source-over'
    scene.drawImage(this.cv, 0, 0)
    // The warm colour of the far-off lights, on top.
    for (const o of others) {
      const or = Math.max(8, Math.round(o.r / 4) * 4)
      scene.globalCompositeOperation = 'lighter'
      scene.globalAlpha = o.a * 0.35
      scene.drawImage(glow(or, '255,170,90'), Math.round(o.x - or), Math.round(o.y - or))
      scene.globalAlpha = 1
      scene.globalCompositeOperation = 'source-over'
    }
  }
}

// --- fog --------------------------------------------------------------------------------------

/**
 * Slow banks of fog drifting through the trees: big soft grey blobs, each a cached sprite,
 * moving with time and wrapping round the view. `cx, cy` is the camera (px), so they stay put in
 * the world rather than following you.
 */
export function drawFog(
  c: Ctx,
  w: number,
  h: number,
  camX: number,
  camY: number,
  t: number,
  thick: number,
) {
  const span = Math.max(w, h) + 240
  for (let i = 0; i < FOG_BANKS; i++) {
    const r = 70 + ((i * 37) % 50)
    const speed = 4 + (i % 3) * 2.5
    const wx = i * 211 + (t / 1000) * speed
    const wy = i * 157 + Math.sin(t / 9000 + i) * 30
    const x = ((((wx - camX * 0.9) % span) + span) % span) - 120
    const y = ((((wy - camY * 0.9) % span) + span) % span) - 120
    c.globalAlpha = FOG_ALPHA * thick * (0.6 + 0.4 * Math.sin(t / 5000 + i * 2))
    // Mist lying low: each bank wide and flat, cold grey.
    c.drawImage(
      glow(r, '150,160,172'),
      Math.round(x - r * 1.8),
      Math.round(y - r * 0.4),
      Math.round(r * 3.6),
      Math.round(r * 0.8),
    )
  }
  c.globalAlpha = 1
}
