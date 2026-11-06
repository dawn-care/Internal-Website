import { audioContext, isMuted, onMuteChange } from './audio'

/*
 * The world's recorded sounds: footsteps that depend on what you're walking on, and ambience
 * that follows the shared game clock (birds at dawn and by day, crickets at night).
 *
 * The files in retirement/sfx are processed copies of the recordings in retirement/sounds
 * (see retirement/CLAUDE.md): each footstep cut out on its own and levelled to the same
 * loudness, each ambience loop normalized to -26 LUFS with 2s fades baked in. Both follow the
 * "Sound: on/off" switch; music has its own.
 */

const FILES = import.meta.glob<string>('../sfx/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
})
const url = (name: string) =>
  Object.entries(FILES).find(([path]) => path.endsWith(`/${name}.mp3`))?.[1]

// --- footsteps ---------------------------------------------------------------------------------

export type Surface = 'grass' | 'gravel' | 'stone' | 'wood' | 'tile' | 'rug'

/** Which recordings each surface uses, and how: playback rate (pitch) and loudness. */
const SURFACES: Record<Surface, { clips: string; rate: number; gain: number }> = {
  grass: { clips: 'step-grass', rate: 1.15, gain: 0.9 },
  gravel: { clips: 'step-gravel', rate: 1, gain: 0.75 },
  stone: { clips: 'step-stone', rate: 1, gain: 0.7 },
  wood: { clips: 'step-wood', rate: 1, gain: 0.7 },
  // The hallway's linoleum: a lighter, higher tap.
  tile: { clips: 'step-wood', rate: 1.3, gain: 0.45 },
  // Rugs muffle the step.
  rug: { clips: 'step-wood', rate: 0.8, gain: 0.25 },
}
const STEP_VOLUME = 0.24

const buffers = new Map<string, AudioBuffer[]>()
let loading: Promise<void> | null = null

function loadSteps(ctx: AudioContext): Promise<void> {
  loading ??= Promise.all(
    Object.entries(FILES)
      .filter(([path]) => /\/step-/.test(path))
      .map(async ([path, src]) => {
        const group = /\/(step-[a-z]+)-\d+\.mp3$/.exec(path)?.[1]
        if (!group) return
        const data = await (await fetch(src)).arrayBuffer()
        const buf = await ctx.decodeAudioData(data)
        buffers.set(group, [...(buffers.get(group) ?? []), buf])
      }),
  ).then(
    () => undefined,
    () => undefined, // No footsteps is better than a crash.
  )
  return loading
}

const lastClip = new Map<string, AudioBuffer>()

/**
 * Plays one footstep. `volume` scales it (for other players further away), `pan` is -1 (left)
 * to 1 (right). Each step picks a random recording (never the same twice running) and varies
 * pitch and loudness a little, so walking doesn't sound mechanical.
 */
export function footstep(surface: Surface, volume = 1, pan = 0) {
  if (isMuted() || volume <= 0.01) return
  const ctx = audioContext()
  if (!ctx) return
  const s = SURFACES[surface]
  const clips = buffers.get(s.clips)
  if (!clips?.length) {
    void loadSteps(ctx)
    return
  }
  let clip = clips[Math.floor(Math.random() * clips.length)]
  if (clips.length > 1 && clip === lastClip.get(s.clips))
    clip = clips[(clips.indexOf(clip) + 1) % clips.length]
  lastClip.set(s.clips, clip)
  const src = ctx.createBufferSource()
  src.buffer = clip
  src.playbackRate.value = s.rate * (0.92 + Math.random() * 0.16)
  const gain = ctx.createGain()
  gain.gain.value = STEP_VOLUME * s.gain * volume * (0.85 + Math.random() * 0.3)
  const panner = ctx.createStereoPanner()
  panner.pan.value = Math.max(-1, Math.min(1, pan))
  src.connect(gain).connect(panner).connect(ctx.destination)
  src.start()
}

/** Starts decoding the footsteps and pet sounds early so the first one isn't silent. */
export function preloadFootsteps() {
  const ctx = audioContext()
  if (ctx) {
    void loadSteps(ctx)
    void loadPets(ctx)
  }
}

// --- pets ---------------------------------------------------------------------------------------

/** Pet recordings (pet-*.mp3, cut and levelled with scripts/cut-sfx.sh) and how loud each plays. */
const PET_SOUNDS = {
  bark: { file: 'pet-bark', gain: 0.32 },
  whine: { file: 'pet-whine', gain: 0.3 },
  pant: { file: 'pet-pant', gain: 0.36 },
  meow: { file: 'pet-meow', gain: 0.34 },
  purr: { file: 'pet-purr', gain: 0.45 },
}
export type PetSound = keyof typeof PET_SOUNDS

const petBuffers = new Map<string, AudioBuffer>()
let petLoading: Promise<void> | null = null

function loadPets(ctx: AudioContext): Promise<void> {
  petLoading ??= Promise.all(
    Object.values(PET_SOUNDS).map(async ({ file }) => {
      const src = url(file)
      if (!src) return
      const data = await (await fetch(src)).arrayBuffer()
      petBuffers.set(file, await ctx.decodeAudioData(data))
    }),
  ).then(
    () => undefined,
    () => undefined,
  )
  return petLoading
}

/** Plays one pet sound (follows "Sound: on/off"), a touch higher or lower each time. */
export function petSound(sound: PetSound, volume = 1) {
  if (isMuted()) return
  const ctx = audioContext()
  if (!ctx) return
  const s = PET_SOUNDS[sound]
  const buf = petBuffers.get(s.file)
  if (!buf) {
    void loadPets(ctx)
    return
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = 0.95 + Math.random() * 0.1
  const gain = ctx.createGain()
  gain.gain.value = s.gain * volume
  src.connect(gain).connect(ctx.destination)
  src.start()
}

// --- ambience -----------------------------------------------------------------------------------

type Bed = 'dawn' | 'day' | 'night'
const BEDS: Record<Bed, string> = {
  dawn: 'amb-dawn-birds',
  day: 'amb-day-birds',
  night: 'amb-night-crickets',
}
const AMBIENCE_VOLUME = 0.55
/** Indoors you still hear the outside, faintly, through the windows. */
const INDOOR_LEVEL = 0.18
const CHANGE_MS = 6000
/** Each file has a 2s fade at both ends; the next copy starts this long before the end. */
const SEAM_S = 2

/** One ambience bed, looping forever by overlapping a fresh copy over each file's fade-out. */
class Loop {
  private els: HTMLAudioElement[] = []
  private level = 0
  private target = 0
  private timer = 0
  private playing = false

  constructor(private src: string) {}

  private spawn(): HTMLAudioElement {
    const el = new Audio(this.src)
    el.preload = 'auto'
    el.volume = this.level * AMBIENCE_VOLUME
    let handed = false
    el.addEventListener('timeupdate', () => {
      if (handed || !el.duration || el.duration - el.currentTime > SEAM_S) return
      handed = true
      if (this.playing) this.start()
    })
    el.addEventListener('ended', () => {
      this.els = this.els.filter((e) => e !== el)
    })
    return el
  }

  private start() {
    const el = this.spawn()
    this.els.push(el)
    void el.play().catch(() => {
      this.playing = false
    })
  }

  /** Fades this bed to `to` (0–1) over `ms`, starting or stopping it as needed. */
  fade(to: number, ms: number) {
    this.target = to
    if (to > 0 && !this.playing) {
      this.playing = true
      if (this.els.length === 0) this.start()
      else for (const e of this.els) void e.play().catch(() => {})
    }
    clearInterval(this.timer)
    const from = this.level
    const t0 = performance.now()
    this.timer = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms)
      this.level = from + (this.target - from) * k
      for (const e of this.els) e.volume = Math.max(0, Math.min(1, this.level * AMBIENCE_VOLUME))
      if (k >= 1) {
        clearInterval(this.timer)
        if (this.target === 0) {
          this.playing = false
          for (const e of this.els) e.pause()
        }
      }
    }, 60)
  }

  get audible() {
    return this.playing && this.target > 0
  }
}

const loops = new Map<Bed, Loop>()
let wanted: { bed: Bed | null; level: number } = { bed: null, level: 0 }
let applied = ''
let unlocked = false

function bedFor(hour: number): Bed {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 19.5) return 'day'
  return 'night'
}

function apply(ms: number) {
  const off = isMuted() || document.hidden || !unlocked
  const key = off ? 'off' : `${wanted.bed}|${wanted.level}`
  if (key === applied) return
  applied = key
  for (const bed of Object.keys(BEDS) as Bed[]) {
    const on = !off && bed === wanted.bed && wanted.level > 0
    let loop = loops.get(bed)
    if (!loop && on) {
      const src = url(BEDS[bed])
      if (!src) continue
      loop = new Loop(src)
      loops.set(bed, loop)
    }
    if (!loop) continue
    if (on) loop.fade(wanted.level, ms)
    else if (loop.audible) loop.fade(0, ms)
  }
}

/**
 * Tells the soundscape where the player is, every frame (cheap: it only acts on changes).
 * `hour` is the shared game clock; `place` is 'outdoors', 'indoors' or 'none' (silence, e.g.
 * for somewhere the ambience shouldn't follow you).
 */
export function setAmbience(hour: number, place: 'outdoors' | 'indoors' | 'none') {
  wanted = {
    bed: place === 'none' ? null : bedFor(hour),
    level: place === 'outdoors' ? 1 : place === 'indoors' ? INDOOR_LEVEL : 0,
  }
  apply(CHANGE_MS)
}

/** Call once: audio can only start after the first click or key press. */
export function initSoundscape() {
  const kick = () => {
    unlocked = true
    preloadFootsteps()
    applied = ''
    apply(2500)
  }
  addEventListener('pointerdown', kick)
  addEventListener('keydown', kick)
  document.addEventListener('visibilitychange', () => {
    applied = ''
    apply(document.hidden ? 300 : 2500)
  })
  onMuteChange(() => {
    applied = ''
    apply(800)
  })
}
