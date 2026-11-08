import { isMuted } from '../audio'

/*
 * The jumpscare when something catches you in the forest (FOREST.md "Caught"), done the way
 * jumpscare/ (/game) does its own: the screen goes black, a random image fills it, and a random
 * scream plays. The images and sounds are copies of jumpscare/media and jumpscare/sounds, kept in
 * retirement/scares. They're the only image files in the game (everything else is drawn in code).
 *
 * Each trip picks one image and one sound and loads them up front (`prepareScare`), so the scare
 * is instant when it comes without downloading all of them.
 */

const IMAGES = Object.values(
  import.meta.glob<string>('../../scares/images/*', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
const SOUNDS = Object.values(
  import.meta.glob<string>('../../scares/sounds/*.mp3', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)

const pick = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]

export interface Scare {
  image: HTMLImageElement | null
  sound: HTMLAudioElement | null
}

/** Picks this trip's scare and starts loading it. */
export function prepareScare(): Scare {
  const src = pick(IMAGES)
  const snd = pick(SOUNDS)
  let image: HTMLImageElement | null = null
  if (src) {
    image = new Image()
    image.decoding = 'async'
    image.src = src
  }
  let sound: HTMLAudioElement | null = null
  if (snd) {
    sound = new Audio(snd)
    sound.preload = 'auto'
  }
  return { image, sound }
}

/**
 * Shows the scare over everything for `ms`, then takes it away. Black behind the image (it's
 * fitted to the screen, like /game), the sound at full volume unless the game's sound is off.
 */
export function showScare(scare: Scare, ms: number) {
  const el = document.createElement('div')
  el.className = 'scare'
  el.setAttribute('aria-hidden', 'true')
  if (scare.image) {
    const img = scare.image.cloneNode() as HTMLImageElement
    img.alt = ''
    el.append(img)
  }
  document.body.append(el)
  if (scare.sound && !isMuted()) {
    scare.sound.currentTime = 0
    void scare.sound.play().catch(() => {})
  }
  window.setTimeout(() => el.remove(), ms)
}
