import { audioContext, isMuted, onMuteChange } from '../audio'
import { FOREST_AMBIENCE } from './tuning'

/*
 * The forest's sound, synthesized with Web Audio like the game's other synth sounds (there's no
 * recording of it): a low wind that swells and drops, a thin high whistle in the branches, and,
 * every so often, a creak of wood or a far-off knock you can't place. Plus a twig snapping
 * underfoot now and then. All of it follows "Sound: on/off" and goes quiet while the tab is
 * hidden.
 */

let master: GainNode | null = null
let wind: GainNode | null = null
let built = false
let level = 0
let timer = 0

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      d[i] = last * 3.5
    } else d[i] = white
  }
  return buf
}

let white: AudioBuffer | null = null
/** The pet's warnings still sounding (their output gains), so crossing over can cut them. */
const warnings = new Set<GainNode>()

/** Silences any growl or hiss still sounding: you don't hear the grounds from the forest. */
export function hushWarnings() {
  const ctx = audioContext()
  if (!ctx) return
  for (const g of warnings) {
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
  }
  warnings.clear()
}

function build(ctx: AudioContext) {
  if (built) return
  built = true
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  white = noiseBuffer(ctx, 2, false)

  // The wind: looped brown noise, low-passed, with its level swelling slowly.
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 6, true)
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  wind = ctx.createGain()
  wind.gain.value = 0.5
  src.connect(lp).connect(wind).connect(master)
  src.start()

  // A thin whistle high in the branches: band-passed noise, very quiet.
  const hi = ctx.createBufferSource()
  hi.buffer = noiseBuffer(ctx, 4, false)
  hi.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1500
  bp.Q.value = 9
  const hg = ctx.createGain()
  hg.gain.value = 0.035
  hi.connect(bp).connect(hg).connect(master)
  hi.start()
  // The whistle's pitch wanders.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const depth = ctx.createGain()
  depth.gain.value = 350
  lfo.connect(depth).connect(bp.frequency)
  lfo.start()

  onMuteChange(() => apply(400))
  document.addEventListener('visibilitychange', () => apply(300))
}

function apply(ms: number) {
  const ctx = audioContext()
  if (!ctx || !master) return
  const to = isMuted() || document.hidden ? 0 : level * FOREST_AMBIENCE
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setTargetAtTime(to, ctx.currentTime, ms / 3000)
}

/** Every few seconds: the wind swells or drops, and now and then a creak or a knock. */
function tick() {
  const ctx = audioContext()
  if (!ctx || !wind || level <= 0) return
  wind.gain.setTargetAtTime(0.3 + Math.random() * 0.6, ctx.currentTime, 1.8)
  const r = Math.random()
  if (r < 0.35) creak(ctx)
  else if (r < 0.5) knock(ctx)
  timer = window.setTimeout(tick, 3500 + Math.random() * 6000)
}

/**
 * Wood creaking: the stick-slip of one branch rubbing on another, a slow, uneven train of clicks
 * (a sawtooth at 12–35 a second) ringing through a narrow, higher band. Kept well away from the
 * pitch and buzz of the pet's growl, so nothing in the forest sounds like a dog.
 */
function creak(ctx: AudioContext) {
  if (!master) return
  const t = ctx.currentTime + Math.random() * 0.5
  const len = 0.6 + Math.random() * 0.8
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  const f0 = 12 + Math.random() * 10
  o.frequency.setValueAtTime(f0, t)
  o.frequency.linearRampToValueAtTime(f0 * (1.4 + Math.random() * 0.8), t + len * 0.6)
  o.frequency.linearRampToValueAtTime(f0 * (0.9 + Math.random() * 0.4), t + len)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900 + Math.random() * 700
  bp.Q.value = 14
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 400
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.12, t + len * 0.2)
  g.gain.linearRampToValueAtTime(0.08, t + len * 0.7)
  g.gain.linearRampToValueAtTime(0, t + len)
  const pan = ctx.createStereoPanner()
  pan.pan.value = Math.random() * 1.6 - 0.8
  o.connect(hp).connect(bp).connect(g).connect(pan).connect(master)
  o.start(t)
  o.stop(t + len + 0.05)
}

/** Something far off: two dull knocks, muffled by distance. */
function knock(ctx: AudioContext) {
  if (!master) return
  const pan = ctx.createStereoPanner()
  pan.pan.value = Math.random() * 1.8 - 0.9
  pan.connect(master)
  for (let i = 0; i < 2; i++) {
    const t = ctx.currentTime + 0.2 + i * (0.35 + Math.random() * 0.2)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(110, t)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.15)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.09, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    o.connect(g).connect(pan)
    o.start(t)
    o.stop(t + 0.25)
  }
}

/** Fades the forest's ambience to `to` (0–1). Cheap to call every frame: it acts on changes. */
export function setForestAmbience(to: number, ms = 2500) {
  const v = Math.round(to * 20) / 20
  if (v === level) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const was = level
  level = v
  apply(ms)
  if (was <= 0 && v > 0) {
    clearTimeout(timer)
    timer = window.setTimeout(tick, 2000)
  }
  if (v <= 0) clearTimeout(timer)
}

/** A twig snapping underfoot: two sharp little cracks of filtered noise. */
export function twigSnap(volume = 1) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  for (let i = 0; i < 2; i++) {
    const t = ctx.currentTime + i * 0.035
    const src = ctx.createBufferSource()
    src.buffer = white
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800 + i * 900
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22 * volume * (i ? 0.6 : 1), t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    src.connect(hp).connect(g).connect(ctx.destination)
    src.start(t, Math.random())
    src.stop(t + 0.04)
  }
}

/**
 * A synthesized growl (a low, rattling rumble) or hiss. The rumble is layered under the recorded
 * growl and hiss at the treeline; both stand in for the recordings if those are ever missing.
 */
export function synthWarning(kind: 'growl' | 'hiss', volume = 1, seconds = 1.4) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const t = ctx.currentTime
  const g = ctx.createGain()
  g.connect(ctx.destination)
  warnings.add(g)
  window.setTimeout(() => warnings.delete(g), (seconds + 0.2) * 1000)
  if (kind === 'growl') {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    const k = seconds / 1.4
    o.frequency.setValueAtTime(82, t)
    o.frequency.linearRampToValueAtTime(96, t + 0.6 * k)
    o.frequency.linearRampToValueAtTime(78, t + 1.3 * k)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    // The rattle of a growl: amplitude wobbling quickly.
    const trem = ctx.createGain()
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 23
    const ld = ctx.createGain()
    ld.gain.value = 0.5
    trem.gain.value = 0.5
    lfo.connect(ld).connect(trem.gain)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.22 * volume, t + 0.15 * k)
    g.gain.linearRampToValueAtTime(0.18 * volume, t + 1.1 * k)
    g.gain.linearRampToValueAtTime(0, t + seconds)
    o.connect(lp).connect(trem).connect(g)
    o.start(t)
    lfo.start(t)
    o.stop(t + seconds + 0.05)
    lfo.stop(t + seconds + 0.05)
  } else {
    const src = ctx.createBufferSource()
    src.buffer = white
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3200
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.16 * volume, t + 0.05)
    g.gain.linearRampToValueAtTime(0.12 * volume, t + 0.7)
    g.gain.linearRampToValueAtTime(0, t + 0.95)
    src.connect(hp).connect(g)
    src.start(t)
    src.stop(t + 1)
  }
}
