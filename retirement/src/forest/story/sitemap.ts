import type { LeadId, SiteId } from '../../../shared/story'
import { LANDMARKS, LINES, type Pt } from './map'

/*
 * The rough site map (MAP.md "Environmental and layout rules" 7): a hand-drawn sketch of the places
 * you've been and the locks you've found there, in your notepad and on your board. It never shows a
 * place you haven't reached: only the roads and paths near the places you have, in pencil.
 */

/** How near a place (tiles) a road or path is drawn: you saw that much of it, going there. */
const SEEN_NEAR = 24
/** Where each lead's lock is (drawn as a little padlock and a question mark beside its place). */
const LEAD_AT: Record<LeadId, SiteId | null> = {
  office_locked: 'ADMIN_OFFICE',
  service_gate_locked: 'SERVICE_GATE',
  night_crew_code: null,
  bell_locker_locked: 'BUNKHOUSE',
  locker_rule: null,
  bell_number: null,
  shutter_jammed: 'MAINTENANCE',
  closet_locked: null,
  shelter_blocked: 'SHELTER_EXTERIOR',
}

/** A small wobble, the same every time for the same point (a hand isn't a ruler). */
function wobble(x: number, y: number, k: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453
  return (s - Math.floor(s) - 0.5) * 2
}

/**
 * Draws the sketch for the places in `sites` and the locks in `leads` onto a new canvas `w` px wide
 * (its height follows the map's shape).
 */
export function drawSiteMap(sites: ReadonlySet<string>, leads: ReadonlySet<LeadId>, w: number) {
  // The sketch covers everything walkable on the map (it's drawn to the same scale every time, so
  // what you've drawn stays where it was).
  const xs: number[] = []
  const ys: number[] = []
  for (const l of LINES)
    if (l.walk)
      for (const [x, y] of l.pts) {
        xs.push(x)
        ys.push(y)
      }
  const pad = 8
  const x0 = Math.min(...xs) - pad
  const x1 = Math.max(...xs) + pad
  const y0 = Math.min(...ys) - pad
  const y1 = Math.max(...ys) + pad
  const scale = w / (x1 - x0)
  const h = Math.round((y1 - y0) * scale)
  const cv = document.createElement('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = `${w}px`
  cv.style.height = `${h}px`
  const c = cv.getContext('2d')!
  c.scale(dpr, dpr)
  const px = (x: number) => (x - x0) * scale
  const py = (y: number) => (y - y0) * scale

  const visited = LANDMARKS.filter((lm) => sites.has(lm.id))
  const near = (x: number, y: number) =>
    visited.some((lm) => Math.hypot(lm.x - x, lm.y - y) < SEEN_NEAR)

  // The roads, paths and creek: only the stretches near where you've been, in pencil.
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const line of LINES) {
    c.strokeStyle = line.ground === 'water' ? 'rgba(70,95,120,0.75)' : 'rgba(55,48,40,0.85)'
    c.lineWidth = line.ground === 'road' ? 2.2 : line.ground === 'water' ? 1.6 : 1.2
    c.setLineDash(line.ground === 'path' ? [4, 3] : [])
    // Walk along it in small steps, drawing only what's near a place you've been.
    let drawing = false
    for (let k = 1; k < line.pts.length; k++) {
      const [ax, ay] = line.pts[k - 1]
      const [bx, by] = line.pts[k]
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2))
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n
        const y = ay + ((by - ay) * i) / n
        const show = near(x, y)
        const p: Pt = [px(x) + wobble(x, y, 1) * 0.8, py(y) + wobble(x, y, 2) * 0.8]
        if (show && !drawing) {
          c.beginPath()
          c.moveTo(p[0], p[1])
          drawing = true
        } else if (show) c.lineTo(p[0], p[1])
        else if (drawing) {
          c.stroke()
          drawing = false
        }
      }
    }
    if (drawing) c.stroke()
  }
  c.setLineDash([])

  // The camp's fence, as a row of little crosses, where you've seen it.
  c.strokeStyle = 'rgba(55,48,40,0.6)'
  c.lineWidth = 1
  for (const lm of LANDMARKS)
    for (const p of lm.props) {
      if (p.id !== 'wire' || (p.x + p.y) % 4 !== 0 || !near(p.x, p.y)) continue
      const x = px(p.x + 0.5)
      const y = py(p.y + 0.5)
      c.beginPath()
      c.moveTo(x - 1.6, y - 1.6)
      c.lineTo(x + 1.6, y + 1.6)
      c.moveTo(x + 1.6, y - 1.6)
      c.lineTo(x - 1.6, y + 1.6)
      c.stroke()
    }

  // Each place you've been: a mark and its name.
  c.font = 'italic 11px Georgia, "Times New Roman", serif'
  c.textBaseline = 'middle'
  for (const lm of visited) {
    const x = px(lm.x)
    const y = py(lm.y)
    c.fillStyle = 'rgba(55,48,40,0.9)'
    c.beginPath()
    c.arc(x, y, 2.2, 0, Math.PI * 2)
    c.fill()
    const label = lm.name.replace(/^The /, '')
    const right = x < w * 0.62
    c.textAlign = right ? 'left' : 'right'
    c.fillText(label, x + (right ? 5 : -5), y)
  }

  // Locks you've found and haven't opened: a padlock and a question mark, in red pencil.
  c.strokeStyle = 'rgba(150,50,40,0.9)'
  c.fillStyle = 'rgba(150,50,40,0.9)'
  for (const lead of leads) {
    const at = LEAD_AT[lead]
    const lm = at && LANDMARKS.find((l) => l.id === at)
    if (!lm || !sites.has(lm.id)) continue
    const x = px(lm.x) - 9
    const y = py(lm.y) - 9
    c.lineWidth = 1.2
    c.strokeRect(x - 3, y - 1, 6, 5)
    c.beginPath()
    c.arc(x, y - 1, 2, Math.PI, 0)
    c.stroke()
    c.textAlign = 'center'
    c.fillText('?', x + 7, y + 1)
  }

  // The way you came in, at the bottom: always known.
  c.fillStyle = 'rgba(55,48,40,0.7)'
  c.textAlign = 'center'
  c.fillText('home', px(0.5), py(2) + 2)
  return cv
}
