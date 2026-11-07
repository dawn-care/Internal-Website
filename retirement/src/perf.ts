/*
 * Performance guardrails (dev builds only; production never creates a Perf).
 *
 * - Each frame is split into named sections (update, ground, garden, sort+draw, light, overlay…)
 *   with performance.now(). Cheap enough to leave on in dev.
 * - Press ` (backtick) to show the readout: a graph of the last 120 frames (the green line is
 *   16.7 ms, one 60 fps frame; the bars are the time between frames, the dark part the game's own
 *   JavaScript) and the slowest sections on average.
 * - A frame whose own work takes over SLOW_MS logs a console warning with its breakdown (at most
 *   once a second), so a hitch shows up while you're working on something else.
 * - `?stress` (with the offline stand-in) fills every allotment and the grounds with neighbours: the
 *   worst case, to check a change against. Aim to keep the game's work under BUDGET_MS there.
 */

const N = 120
const SLOW_MS = 20
export const BUDGET_MS = 4

export class Perf {
  private gaps = new Float32Array(N)
  private work = new Float32Array(N)
  private i = 0
  private avg = new Map<string, number>()
  private now = new Map<string, number>()
  private t0 = 0
  private open: { name: string; t: number } | null = null
  private lastWarn = 0
  private el: HTMLCanvasElement | null = null
  shown = false

  constructor() {
    addEventListener('keydown', (e) => {
      if (e.key !== '`') return
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return
      this.toggle()
    })
  }

  /** Start of a frame; `gap` is the time since the last one (ms). */
  begin(gap: number) {
    this.t0 = performance.now()
    this.now.clear()
    this.gaps[this.i] = gap
  }

  /** Ends the open section (if any) and starts `name`. */
  mark(name: string) {
    const t = performance.now()
    if (this.open)
      this.now.set(this.open.name, (this.now.get(this.open.name) ?? 0) + t - this.open.t)
    this.open = { name, t }
  }

  end() {
    this.mark('')
    this.open = null
    const work = performance.now() - this.t0
    this.work[this.i] = work
    this.i = (this.i + 1) % N
    for (const [k, v] of this.now) this.avg.set(k, (this.avg.get(k) ?? v) * 0.95 + v * 0.05)
    if (work > SLOW_MS && this.t0 - this.lastWarn > 1000) {
      this.lastWarn = this.t0
      const parts = [...this.now]
        .filter(([k]) => k)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v.toFixed(1)}`)
      console.warn(`[perf] slow frame: ${work.toFixed(1)} ms (${parts.join(', ')})`)
    }
    if (this.shown) this.draw()
  }

  private toggle() {
    this.shown = !this.shown
    if (!this.el) {
      this.el = document.createElement('canvas')
      this.el.className = 'perf'
      this.el.width = 280
      this.el.height = 110
      document.body.append(this.el)
    }
    this.el.hidden = !this.shown
  }

  private draw() {
    const c = this.el!.getContext('2d')!
    const W = 280
    const H = 70
    c.fillStyle = 'rgba(20,16,28,0.85)'
    c.fillRect(0, 0, W, 110)
    const y = (ms: number) => H - Math.min(H, (ms / 50) * H)
    for (let k = 0; k < N; k++) {
      const j = (this.i + k) % N
      const x = 10 + k * 2.2
      c.fillStyle = this.gaps[j] > 20 ? '#e0625a' : '#7a8fb5'
      c.fillRect(x, y(this.gaps[j]), 2, H - y(this.gaps[j]))
      c.fillStyle = '#2a3a6a'
      c.fillRect(x, y(this.work[j]), 2, H - y(this.work[j]))
    }
    c.fillStyle = '#6fbf73'
    c.fillRect(10, y(16.7), W - 20, 1)
    const sorted = [...this.work].sort((a, b) => a - b)
    const gaps = [...this.gaps].sort((a, b) => a - b)
    c.fillStyle = '#fff8ef'
    c.font = '11px system-ui, sans-serif'
    c.fillText(
      `${Math.round(1000 / Math.max(1, gaps[N >> 1]))} fps · work ${sorted[N >> 1].toFixed(1)} ms, p95 ${sorted[Math.floor(N * 0.95)].toFixed(1)} (budget ${BUDGET_MS})`,
      10,
      H + 16,
    )
    const top = [...this.avg]
      .filter(([k]) => k)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k} ${v.toFixed(2)}`)
    c.fillStyle = '#c9c3d8'
    c.fillText(top.join(' · '), 10, H + 32)
  }
}

/** Dev builds only. */
export const perf: Perf | null = import.meta.env.DEV ? new Perf() : null
