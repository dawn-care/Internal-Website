/* Tiny synthesized sound effects (Web Audio, no files). Muted state is remembered. */

const muteListeners = new Set<(muted: boolean) => void>()
export function onMuteChange(fn: (muted: boolean) => void) {
  muteListeners.add(fn)
}

type Sfx = 'blip' | 'coin' | 'till' | 'plant' | 'water' | 'harvest' | 'door' | 'chat' | 'nope'

let ctx: AudioContext | null = null
let muted = (() => {
  try {
    return localStorage.getItem('sunset-acres-muted') === '1'
  } catch {
    return false
  }
})()

export function isMuted() {
  return muted
}

/** The shared AudioContext (created on first use; browsers start it suspended until a gesture). */
export function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function setMuted(v: boolean) {
  muted = v
  for (const fn of muteListeners) fn(v)
  try {
    localStorage.setItem('sunset-acres-muted', v ? '1' : '0')
  } catch {
    // Not remembered; fine.
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slide = 0) {
  if (!ctx) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, vol: number, freq: number) {
  if (!ctx) return
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = freq
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(filter).connect(g).connect(ctx.destination)
  src.start()
}

export function sfx(kind: Sfx) {
  if (muted) return
  if (!audioContext()) return
  switch (kind) {
    case 'blip':
      return tone(660, 0.08, 'square', 0.04)
    case 'coin':
      tone(988, 0.08, 'square', 0.05)
      return tone(1319, 0.18, 'square', 0.05, 0.07)
    case 'till':
      return noise(0.12, 0.25, 600)
    case 'plant':
      return tone(520, 0.1, 'triangle', 0.08, 0, 200)
    case 'water':
      return noise(0.35, 0.18, 2400)
    case 'harvest':
      tone(523, 0.08, 'triangle', 0.09)
      tone(659, 0.08, 'triangle', 0.09, 0.07)
      return tone(784, 0.16, 'triangle', 0.09, 0.14)
    case 'door':
      return noise(0.18, 0.15, 300)
    case 'chat':
      return tone(880, 0.06, 'sine', 0.05)
    case 'nope':
      return tone(200, 0.15, 'square', 0.04, 0, -80)
  }
}

/**
 * One soft "voice" blip for dialogue that types out a letter at a time. Each speaker has their own
 * pitch; a little random wobble keeps it from sounding mechanical. (The forest's distorted voices
 * can build on this with a lower pitch and a rougher wave.)
 */
export function voice(pitch: number, wave: OscillatorType = 'triangle') {
  if (muted) return
  if (!audioContext()) return
  tone(pitch * (0.94 + Math.random() * 0.12), 0.045, wave, 0.035)
}
