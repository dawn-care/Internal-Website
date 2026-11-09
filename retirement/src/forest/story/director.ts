import type { Dir } from '../../../shared/schema'
import {
  EVENT_LOST_FASTER,
  TURN_BACK_GAP_MS,
  TURN_BACK_MAX,
  EVENT_EVERY,
  EVENT_FIRST,
  FOG_MS,
  HUSH_MS,
} from '../tuning'
import { pickEvent, type EventCue } from './events'
import { VOICE, voiceFor, type VoiceMoment } from './voice'

/*
 * The quiet side of a trip: when the inner voice speaks (story/voice.ts) and when the forest does
 * something uncanny with nothing behind it (story/events.ts). The danger (threats.ts, encounters)
 * is rare now; this is what fills the time between the finds.
 *
 * It decides and keeps time; the game carries the cues out (sounds, the light, footprints) through
 * the host, and reads `hush()`, `fog()` and `light` back each frame.
 */

export interface DirectorHost {
  readonly me: { x: number; y: number; dir: Dir; moving: boolean }
  depth(): number
  lost(): boolean
  /** It's night on the game clock. */
  night(): boolean
  /** Something else is going on (someone talking to you, a threat, a panel open, the end). */
  busy(): boolean
  hasPet(): boolean
  /** A thought. `important` ones (losing the path) aren't held back by the once-a-minute limit. */
  thought(text: string | null, important?: boolean): void
  /** An uncanny moment's sound or sight (not the hush or the fog, which are read back). */
  cue(cue: EventCue): void
}

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a)

export class Director {
  private said = new Set<VoiceMoment>()
  private lastLine: string | undefined
  private t = 0
  private lostAt = -1
  private nextEvent = between(EVENT_FIRST)
  private lastEvent: string | undefined
  private hushUntil = 0
  private fogUntil = 0
  /** A light between the trees (an uncanny moment): where, and when it went out (ms). */
  light: { x: number; y: number; t: number } | null = null

  constructor(private host: DirectorHost) {
    // Your first steps in.
    window.setTimeout(() => this.say('enter'), 1800)
  }

  /** Says a moment's line once a trip (or not: silence is allowed). */
  private say(m: VoiceMoment, again = false) {
    if (!again && this.said.has(m)) return
    this.said.add(m)
    const line = voiceFor(m, this.lastLine)
    if (line) this.lastLine = line
    this.host.thought(line, m === 'lostNow')
  }

  /**
   * Lost, and heading back towards where the path was: the forest isn't where you left it. Each
   * line once, at most every TURN_BACK_GAP_MS.
   */
  turnedBack() {
    if (this.t - this.lastTurnBack < TURN_BACK_GAP_MS) return
    if (this.turnBackSaid.size >= TURN_BACK_MAX) return
    const left = VOICE.turnBack.filter((l) => !this.turnBackSaid.has(l))
    if (!left.length) return
    const line = left[Math.floor(Math.random() * left.length)]
    this.turnBackSaid.add(line)
    this.lastTurnBack = this.t
    this.lastLine = line
    this.host.thought(line, true)
  }
  private lastTurnBack = -Infinity
  private turnBackSaid = new Set<string>()

  /** Anything said from outside (a clue, a site), so it isn't said again straight after. */
  noteSaid(line: string) {
    this.lastLine = line
  }

  update(dt: number) {
    const ms = dt * 1000
    this.t += ms
    const h = this.host
    if (this.light && this.t - this.light.t > 1400) this.light = null
    if (h.busy()) return
    const depth = h.depth()
    if (h.lost()) {
      if (this.lostAt < 0) this.lostAt = this.t
      // A beat after it happens.
      if (this.t - this.lostAt > 1500) this.say('lostNow')
    }
    this.nextEvent -= ms * (h.lost() ? EVENT_LOST_FASTER : 1)
    if (this.nextEvent <= 0) {
      this.nextEvent = between(EVENT_EVERY)
      const e = pickEvent(depth, this.lastEvent)
      if (!e) return
      this.lastEvent = e.id
      if (e.cue === 'hush') this.hushUntil = this.t + HUSH_MS
      else if (e.cue === 'fog') this.fogUntil = this.t + FOG_MS
      else h.cue(e.cue)
      if (Math.random() < e.say) {
        const lines = e.voice.filter((l) => l !== this.lastLine)
        const line = lines[Math.floor(Math.random() * lines.length)]
        if (line) {
          this.lastLine = line
          // A beat after the cue, as you take it in.
          window.setTimeout(() => h.thought(line), 1300)
        }
      }
    }
  }

  /** 0–1: how far the forest's sound is hushed by an uncanny silence right now. */
  hush(): number {
    const left = this.hushUntil - this.t
    if (left <= 0) return 0
    const done = HUSH_MS - left
    return Math.min(1, done / 900, left / 1500)
  }

  /** 0–1: how much the fog has thickened round you. */
  fog(): number {
    const left = this.fogUntil - this.t
    if (left <= 0) return 0
    const done = FOG_MS - left
    return Math.min(1, done / 3000, left / 3000)
  }

  /** A light between the trees ahead, put there by the game (it goes out after a moment). */
  showLight(x: number, y: number) {
    this.light = { x, y, t: this.t }
  }

  /** How bright the light still is (0–1), fading out. */
  lightLevel(): number {
    if (!this.light) return 0
    const age = this.t - this.light.t
    return Math.max(0, Math.min(1, age / 200, (1400 - age) / 900))
  }
}
