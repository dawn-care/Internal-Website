import { audioContext, isMuted, onMuteChange } from '../audio'
import { CHASE_SOUND, FOREST_AMBIENCE, SWELL } from './tuning'

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

// --- the chase (FOREST.md "The chase") --------------------------------------------------------
//
// While something is coming for you: your heartbeat, quickening as it closes in; a dissonant drone
// that throbs faster, rises and brightens; a thin high shimmer of tension; and its heavy
// footfalls and ragged breath when it's close. Nothing sudden: it all swells and fades.
//
// Everything has its body above about 100 Hz and its character in the few hundred Hz above that:
// laptop and phone speakers barely play anything lower (the first version's heartbeat and drone
// were down at 40–70 Hz and simply couldn't be heard on them).

const DRONE = [98, 103.5, 146.8, 207.7] // two notes beating against each other, a fifth, a tritone

let chase: {
  out: GainNode
  filter: BiquadFilterNode
  oscs: OscillatorNode[]
  trem: OscillatorNode
  tremDepth: GainNode
  shimmer: GainNode
} | null = null
let chaseLevel = 0
let beatTimer = 0

function buildChase(ctx: AudioContext) {
  if (chase) return chase
  const out = ctx.createGain()
  out.gain.value = 0
  // A throb: the drone's level wobbles, faster as it closes in.
  const throb = ctx.createGain()
  throb.gain.value = 0.7
  const trem = ctx.createOscillator()
  trem.frequency.value = 3
  const tremDepth = ctx.createGain()
  tremDepth.gain.value = 0.25
  trem.connect(tremDepth).connect(throb.gain)
  trem.start()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 500
  filter.Q.value = 5
  filter.connect(throb).connect(out).connect(ctx.destination)
  const oscs = DRONE.map((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = [0.5, 0.45, 0.3, 0.22][i]
    o.connect(g).connect(filter)
    o.start()
    return o
  })
  // A thin, high shimmer: two notes a few Hz apart, beating. Tension you feel more than hear.
  const shimmer = ctx.createGain()
  shimmer.gain.value = 0
  shimmer.connect(ctx.destination)
  for (const f of [1174, 1181]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    o.connect(shimmer)
    o.start()
  }
  chase = { out, filter, oscs, trem, tremDepth, shimmer }
  return chase
}

/** A short burst of noise through a filter: the body of a thud, a breath, a click. */
function noiseHit(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  vol: number,
  type: BiquadFilterType,
  freq: number,
  q = 1,
) {
  build(ctx)
  const src = ctx.createBufferSource()
  src.buffer = white
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(dest)
  src.start(t, Math.random())
  src.stop(t + dur + 0.02)
}

/** A falling sine thump. */
function thump(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  from: number,
  to: number,
  vol: number,
) {
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(to, t + 0.12)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.22)
}

/** One heartbeat, lub-dub: a thump with an overtone and a soft muffled knock on top of each. */
export function heartbeat(
  ctx: BaseAudioContext,
  volume: number,
  dest: AudioNode = ctx.destination,
) {
  const c = ctx as AudioContext
  for (const [delay, v] of [
    [0, 1],
    [0.17, 0.65],
  ]) {
    const t = ctx.currentTime + delay
    const k = 0.55 * volume * v
    thump(c, dest, t, 120, 70, k)
    thump(c, dest, t, 240, 140, k * 0.5)
    noiseHit(c, dest, t, 0.06, k * 0.6, 'lowpass', 700)
  }
}

function beat() {
  const ctx = audioContext()
  if (!ctx || chaseLevel <= 0) return
  // Your heartbeat comes in from the second stage of the transformation (dread 0.25 and up).
  if (!isMuted() && !document.hidden && chaseLevel >= 0.25)
    heartbeat(ctx, (0.45 + 0.55 * chaseLevel) * CHASE_SOUND)
  // From about 70 beats a minute far off to about 150 when it's on you.
  beatTimer = window.setTimeout(beat, 860 - 460 * chaseLevel)
}

/**
 * How close the chase is, 0 (none) to 1 (it's on you); call every frame (cheap: it only
 * retunes). The drone and heartbeat swell in with it and fade out when it's over.
 */
export function setChase(level: number) {
  const v = Math.round(Math.max(0, Math.min(1, level)) * 20) / 20
  if (v === chaseLevel) return
  const ctx = audioContext()
  if (!ctx) return
  const was = chaseLevel
  chaseLevel = v
  const c = buildChase(ctx)
  const t = ctx.currentTime
  const off = isMuted() || document.hidden
  c.out.gain.cancelScheduledValues(t)
  c.out.gain.setTargetAtTime(
    off ? 0 : (0.05 + 0.13 * v) * (v > 0 ? 1 : 0) * CHASE_SOUND,
    t,
    v > was ? 0.2 : 0.6,
  )
  c.filter.frequency.setTargetAtTime(500 + 1800 * v, t, 0.3)
  c.trem.frequency.setTargetAtTime(3 + 6 * v, t, 0.4)
  c.tremDepth.gain.setTargetAtTime(0.15 + 0.3 * v, t, 0.4)
  c.shimmer.gain.setTargetAtTime(off ? 0 : Math.max(0, v - 0.4) * 0.03 * CHASE_SOUND, t, 0.4)
  // The drone creeps up in pitch as it closes (a semitone at most).
  for (const [i, o] of c.oscs.entries())
    o.frequency.setTargetAtTime(DRONE[i] * (1 + 0.06 * v), t, 0.5)
  if (was <= 0 && v > 0) {
    clearTimeout(beatTimer)
    beat()
  }
  if (v <= 0) clearTimeout(beatTimer)
}

/**
 * Its footfall while it runs at you: a heavy thud panned to where it is, and when it's close
 * (`close` 0–1), its ragged breath.
 */
export function stomp(volume: number, pan: number, close = 0) {
  if (isMuted() || volume <= 0.02) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  p.connect(ctx.destination)
  const t = ctx.currentTime
  const v = volume * CHASE_SOUND
  thump(ctx, p, t, 150, 80, 0.4 * v)
  noiseHit(ctx, p, t, 0.09, 0.35 * v, 'lowpass', 800)
  if (close > 0.4)
    noiseHit(ctx, p, t + 0.05, 0.3, 0.12 * close * v, 'bandpass', 650 + Math.random() * 300, 2)
}

/**
 * A slow rising swell as a fake changes in front of you (stage 1–3, each one bigger): breathy
 * noise sweeping up through a narrow band over about two seconds, with a low note sliding up under
 * it, then fading. No sting, no sudden noise.
 */
export function swell(stage: number) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const t = ctx.currentTime
  const len = 1.6 + stage * 0.4
  const peak = SWELL * (0.35 + 0.22 * stage) * CHASE_SOUND
  const src = ctx.createBufferSource()
  src.buffer = white
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 6
  bp.frequency.setValueAtTime(220, t)
  bp.frequency.exponentialRampToValueAtTime(900 + 300 * stage, t + len)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak * 0.5, t + len * 0.85)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6)
  src.connect(bp).connect(g).connect(ctx.destination)
  src.start(t, Math.random())
  src.stop(t + len + 0.7)
  // A low note sliding up a fourth underneath, in the range small speakers play.
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(110, t)
  o.frequency.exponentialRampToValueAtTime(147, t + len)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 700
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(peak * 0.12, t + len * 0.85)
  og.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6)
  o.connect(lp).connect(og).connect(ctx.destination)
  o.start(t)
  o.stop(t + len + 0.7)
}

/** Something giving itself away in the dark: a slow breath as eyes open, or a whoosh as it draws back. */
export function threatSound(kind: 'eyes' | 'snatch', volume: number, pan: number) {
  if (isMuted() || volume <= 0.02) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  p.connect(ctx.destination)
  const t = ctx.currentTime
  if (kind === 'eyes') {
    // A long, low breath in, then out.
    noiseHit(ctx, p, t, 0.9, 0.09 * volume, 'bandpass', 380, 3)
    noiseHit(ctx, p, t + 1.0, 1.1, 0.07 * volume, 'bandpass', 300, 3)
  } else {
    // A quick rush of air, falling, as it pulls back into the dark.
    const src = ctx.createBufferSource()
    src.buffer = white
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 2
    f.frequency.setValueAtTime(1800, t)
    f.frequency.exponentialRampToValueAtTime(300, t + 0.35)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.35 * volume, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    src.connect(f).connect(g).connect(p)
    src.start(t, Math.random())
    src.stop(t + 0.45)
  }
}

// --- uncanny moments (story/events.ts) and the story's small sounds ---------------------------

/**
 * Something the forest does with nothing behind it: three knocks on wood, a few notes of a music
 * box, or your name called from far off (a voice with no words, two falling syllables). `pan` is
 * where it comes from (-1 left, 1 right).
 */
export function uncanny(kind: 'knock' | 'musicbox' | 'name' | 'whistle', pan: number, volume = 1) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  // Far off: dulled, with a little echo from the trees.
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = kind === 'musicbox' || kind === 'whistle' ? 3200 : 1400
  const out = ctx.createGain()
  out.gain.value = volume
  const echo = ctx.createDelay(1)
  echo.delayTime.value = 0.23
  const fb = ctx.createGain()
  fb.gain.value = 0.32
  lp.connect(out)
  out.connect(p)
  out.connect(echo).connect(fb).connect(echo)
  fb.connect(p)
  p.connect(ctx.destination)
  const t0 = ctx.currentTime + 0.05
  if (kind === 'knock') {
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.42
      noiseHit(ctx, lp, t, 0.09, 0.32, 'bandpass', 620, 3)
      thump(ctx, lp, t, 240, 150, 0.28)
    }
  } else if (kind === 'musicbox') {
    // A slow little tune, each note a touch late and flat, as if the spring were running down.
    const notes = [880, 1174.7, 987.8, 880, 784, 880]
    let t = t0
    notes.forEach((f, i) => {
      for (const [mult, vol] of [
        [1, 0.07],
        [3.01, 0.018],
      ]) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f * mult * (1 - i * 0.004)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
        o.connect(g).connect(lp)
        o.start(t)
        o.stop(t + 1.2)
      }
      t += 0.38 + i * 0.06
    })
  } else if (kind === 'whistle') {
    // Nurse Ada's whistle: two short notes, the second higher, with a little breath in them.
    ;[
      [0, 0.18, 1180, 1250],
      [0.26, 0.32, 1560, 1640],
    ].forEach(([at, len, from, to]) => {
      const t = t0 + at
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(from, t)
      o.frequency.linearRampToValueAtTime(to, t + len)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.03)
      g.gain.setValueAtTime(0.16, t + len - 0.06)
      g.gain.exponentialRampToValueAtTime(0.0001, t + len)
      o.connect(g).connect(lp)
      o.start(t)
      o.stop(t + len + 0.05)
      noiseHit(ctx, lp, t, len, 0.03, 'bandpass', 2400, 2)
    })
  } else {
    // Two syllables, the second lower, like someone calling a name across a field.
    ;[
      [0, 0.34, 330, 300],
      [0.42, 0.55, 262, 220],
    ].forEach(([at, len, from, to]) => {
      const t = t0 + at
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(from, t)
      o.frequency.linearRampToValueAtTime(to, t + len)
      // Formants: an open "ah"-ish vowel.
      const f1 = ctx.createBiquadFilter()
      f1.type = 'bandpass'
      f1.frequency.value = 750
      f1.Q.value = 6
      const f2 = ctx.createBiquadFilter()
      f2.type = 'bandpass'
      f2.frequency.value = 1200
      f2.Q.value = 7
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.06)
      g.gain.setValueAtTime(0.5, t + len - 0.12)
      g.gain.exponentialRampToValueAtTime(0.0001, t + len)
      o.connect(f1).connect(g)
      o.connect(f2).connect(g)
      g.connect(lp)
      o.start(t)
      o.stop(t + len + 0.05)
    })
  }
}

/** Paper: unfolding a note, or tucking it into your notepad. */
export function paperRustle(volume = 1) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const t = ctx.currentTime
  for (let i = 0; i < 3; i++)
    noiseHit(ctx, ctx.destination, t + i * 0.07, 0.08, 0.09 * volume, 'highpass', 2500 + i * 700)
}

/**
 * The bus: arriving (an engine growing out of the distance over a few seconds, then the hiss of
 * its brakes and the doors folding open) or leaving (doors, then the engine drawing away). An old
 * diesel, synthesized: a rough low drone kept above 100 Hz so it's heard on small speakers.
 */
export function busSound(kind: 'arrive' | 'leave', pan: number, volume = 1) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  build(ctx)
  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  p.connect(ctx.destination)
  const t0 = ctx.currentTime + 0.05
  const engine = (start: number, len: number, from: number, to: number, rise: boolean) => {
    const g = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    for (const [f, type] of [
      [108, 'sawtooth'],
      [162, 'square'],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f * from, start)
      o.frequency.linearRampToValueAtTime(f * to, start + len)
      o.connect(lp)
      o.start(start)
      o.stop(start + len + 0.1)
    }
    lp.connect(g).connect(p)
    const peak = 0.11 * volume
    g.gain.setValueAtTime(rise ? 0.0001 : peak, start)
    g.gain.exponentialRampToValueAtTime(rise ? peak : 0.0001, start + len)
    if (rise) g.gain.exponentialRampToValueAtTime(0.0001, start + len + 0.4)
  }
  const doors = (at: number) => {
    noiseHit(ctx, p, at, 0.5, 0.09 * volume, 'highpass', 1800)
    thump(ctx, p, at + 0.45, 220, 140, 0.18 * volume)
  }
  if (kind === 'arrive') {
    engine(t0, 4, 0.9, 0.75, true)
    // Brakes: a long hiss as it stops.
    noiseHit(ctx, p, t0 + 4, 1.1, 0.12 * volume, 'highpass', 3000)
    doors(t0 + 5.2)
  } else {
    doors(t0)
    engine(t0 + 0.8, 4.5, 0.8, 1.05, false)
  }
}
