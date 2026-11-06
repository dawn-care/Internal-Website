/*
 * Background music: a shuffled playlist of the tracks in retirement/music, with about 30
 * seconds of quiet between one track and the next. The files there are pre-processed copies of source recordings,
 * normalized to -18 LUFS with 4s fades baked in (see retirement/CLAUDE.md), so every track
 * plays at the same loudness; on top of that, the player ramps the volume up whenever it
 * starts or resumes, so music never starts abruptly.
 *
 * Browsers refuse to play audio before the user interacts with the page, so playback begins
 * on the first click or key press. On/off is remembered per browser.
 */

const TRACKS = Object.values(
  import.meta.glob<string>('../music/*.mp3', { eager: true, query: '?url', import: 'default' }),
)

/** Music sits under the sound effects. */
const VOLUME = 0.35
/** Quiet between one track ending (on its baked-in fade-out) and the next starting. */
const GAP_MS = 30_000
const FADE_IN_MS = 3000
const LS_KEY = 'sunset-acres-music'

let on = (() => {
  try {
    return localStorage.getItem(LS_KEY) !== '0'
  } catch {
    return true
  }
})()

let current: HTMLAudioElement | null = null
/** In the quiet between tracks. gapTimer is 0 once the gap is over but music couldn't play. */
let waiting = false
let gapTimer = 0
/** Every element currently playing: during a crossfade, both tracks. */
const live = new Set<HTMLAudioElement>()
let order: string[] = []
let started = false
/** 0–1 multiplier for later use (e.g. fading the music out somewhere spooky). */
let level = 1

interface Fade {
  el: HTMLAudioElement
  timer: number
}
const fades = new Map<HTMLAudioElement, Fade>()

function nextTrack(): string {
  if (order.length === 0) {
    order = [...TRACKS].sort(() => Math.random() - 0.5)
    // Don't play the same track twice in a row across reshuffles.
    if (current && order[0] === current.src && order.length > 1) order.push(order.shift()!)
  }
  return order.shift()!
}

/** Ramps an element's volume to `to` (of the target volume) over `ms`, then optionally pauses it. */
function fadeTo(el: HTMLAudioElement, to: number, ms: number, then?: () => void) {
  const prev = fades.get(el)
  if (prev) clearInterval(prev.timer)
  const from = el.volume
  const target = to * VOLUME * level
  const t0 = performance.now()
  const timer = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms)
    el.volume = Math.max(0, Math.min(1, from + (target - from) * k))
    if (k >= 1) {
      clearInterval(timer)
      fades.delete(el)
      then?.()
    }
  }, 50)
  fades.set(el, { el, timer })
}

function playNext() {
  if (TRACKS.length === 0) return
  const el = new Audio(nextTrack())
  el.preload = 'auto'
  el.volume = 0
  let handedOff = false
  // Each file fades out on its own; then a pause before the next one.
  el.addEventListener('ended', () => {
    live.delete(el)
    if (!handedOff) {
      handedOff = true
      startGap()
    }
  })
  el.addEventListener('error', () => {
    // A missing or undecodable file just gets skipped.
    if (!handedOff) {
      handedOff = true
      window.setTimeout(playNext, 1000)
    }
  })
  current = el
  void el
    .play()
    .then(() => {
      live.add(el)
      fadeTo(el, 1, FADE_IN_MS)
    })
    .catch(() => {
      // Still blocked by the browser; the next interaction will try again.
      started = false
    })
}

function startGap() {
  waiting = true
  window.clearTimeout(gapTimer)
  gapTimer = window.setTimeout(() => {
    gapTimer = 0
    // Music off or tab hidden: the next track waits for resume().
    if (!on || document.hidden) return
    waiting = false
    playNext()
  }, GAP_MS)
}

function resume() {
  if (!on || document.hidden) return
  if (!started) {
    started = true
    playNext()
    return
  }
  if (waiting) {
    // In the quiet between tracks: let it run out, or start now if it already has.
    if (!gapTimer) {
      waiting = false
      playNext()
    }
    return
  }
  if (current && current.paused) {
    current.volume = 0
    void current
      .play()
      .then(() => {
        if (!current) return
        live.add(current)
        fadeTo(current, 1, FADE_IN_MS)
      })
      .catch(() => {})
  }
}

function stop(el: HTMLAudioElement) {
  el.pause()
  live.delete(el)
}

/** Fades out everything playing. Only the current track comes back on resume. */
function pause(ms = 800) {
  for (const el of live) {
    if (el === current) fadeTo(el, 0, ms, () => el.pause())
    else fadeTo(el, 0, ms, () => stop(el))
  }
}

/** Call once: playback starts on the user's first click or key press. */
export function initMusic() {
  const kick = () => resume()
  addEventListener('pointerdown', kick)
  addEventListener('keydown', kick)
  document.addEventListener('visibilitychange', () => (document.hidden ? pause(300) : resume()))
}

export function isMusicOn() {
  return on
}

export function setMusicOn(v: boolean) {
  on = v
  try {
    localStorage.setItem(LS_KEY, v ? '1' : '0')
  } catch {
    // Not remembered; fine.
  }
  if (v) resume()
  else pause()
}

/** Scales the music volume (0–1), fading to it. */
export function setMusicLevel(v: number, ms = 1500) {
  level = Math.max(0, Math.min(1, v))
  if (current && !current.paused) fadeTo(current, 1, ms)
}
