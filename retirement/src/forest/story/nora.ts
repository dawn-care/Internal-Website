import type { Dir, Look } from '../../../shared/schema'
import type { Mood } from '../../portraits'

/*
 * Nora Vale (STORY.md: a real, present-day local historian; practical, tentative humour; wary,
 * because she has seen convincing copies; a dented kettle; a mole on her left cheek). This is the
 * real Nora's part of PUZZLES.md's scripted encounters:
 * - E_NORA_SIGHTING: a way past the fork, a figure on the path ahead sees you, and runs.
 * - E_NORA_MEET_1: in the camp courtyard. She asks you to stay back, then introduces herself.
 * - E_NORA_MEET_2: a later trip, once Evie's 1978 file is on your board. She knows you; you may not
 *   know her (STORY.md "Memory: how the dementia shows"). She tells you what she's found and goes
 *   up the deep road.
 * Her lines are invented around those beats. Her copy (the door, part 3) is not here.
 */

export const NORA_LOOK: Look = {
  name: 'Nora',
  body: 'female',
  skin: 2,
  hair: 'long',
  hairColor: 6,
  outfit: 3,
  pants: 1,
  accessory: 'scarf',
}

/** Her voice blip's pitch (Hz). */
export const NORA_PITCH = 390

/**
 * She warms up slowly (play-testing: the first meeting went from "stay back" to her life story
 * too fast). E_NORA_STARTLED: you come on her in the courtyard and she's frightened and hostile,
 * and runs. She doesn't give her name.
 */
export const STARTLE = ['Stay back! I’m warning you!']
/** Her face, line by line (no mood: her ordinary small smile). Frightened here. */
export const STARTLE_MOODS: (Mood | undefined)[] = ['scared']

/** E_NORA_AGAIN: a later trip, you turn up again (the courtyard, or her camp). Still wary. */
export const AGAIN = ['You again.', 'Stop following me. I mean it.']
export const AGAIN_MOODS: (Mood | undefined)[] = ['angry', 'angry']

/**
 * E_NORA_MEET_1: the trip after, she's too tired to keep running. She sees your Sunset Acres badge
 * and takes you for someone from the home who keeps wandering up here. Then her name.
 */
export const MEET_1 = [
  '...No. I’m not running from you again. I’m too tired.',
  'Is that a Sunset Acres badge? You’re from the home down the hill.',
  'Do they know you’re up here?',
  '...I’m Nora. Nora Vale. I come up for the camp. The history of it. Nobody else does.',
  'Stick to the road going home. All right?',
]
/** Tired and guarded: no smile yet. */
export const MEET_1_MOODS: (Mood | undefined)[] = MEET_1.map(() => 'neutral')

/** What she's called until she's told you (the dialogue box's name). */
export const NORA_UNNAMED = 'The woman'

/**
 * E_NORA_MEET_2: an ordinary moment (play-testing: an excited greeting, a research briefing and
 * "don't follow me" was unrealistic). She's sitting at one of the courtyard tables with her
 * kettle. She knows you; she's quietly glad.
 */
export const MEET_2_GREET = ['Oh. Hello again.']
export const MEET_2_GREET_MOODS: (Mood | undefined)[] = ['neutral']

/** ...and you don't know her: she tells you again, kindly. */
export const MEET_2_REMIND = ['It’s Nora. We met up here, the other week.', '...It’s all right.']
export const MEET_2_REMIND_MOODS: (Mood | undefined)[] = ['neutral', undefined]

/** ...or you do (you wrote her down, and it's on your board). */
export const MEET_2_KNOWN = ['Still wandering up here, then?']
export const MEET_2_KNOWN_MOODS: (Mood | undefined)[] = [undefined]

/**
 * Tea, and what she's reading, in passing; then her plans, as small talk (PUZZLES.md: a finding,
 * and she goes up the deep road after). The lantern line is for later: her copy carries one too.
 */
export const MEET_2_REST = [
  'Sit down a minute. The kettle’s just boiled.',
  'I found this in the county library. Look. 1978, somebody from the sheriff’s came up here asking questions. A woman. Mercer.',
  'Funny. Nobody up here will talk about it. For a place where nothing happened.',
  'I’m going up the deep road tomorrow. There’s an old first-aid shelter up there I want to see before the snow.',
  'If you see a lantern up that way, that’s only me.',
]
/** A smile for the tea and the lantern; the rest she says plainly. */
export const MEET_2_REST_MOODS: (Mood | undefined)[] = [
  undefined,
  'neutral',
  'neutral',
  'neutral',
  undefined,
]

/** Where she sits for the second meeting: behind the courtyard's east table, facing you. */
export const NORA_SEAT = { x: 6, y: -138.25 }

/** Your thoughts around the meetings. */
export const NORA_THOUGHTS = {
  afterMeet1: 'Nora Vale... Nora Vale... Nora Vale...',
  meet2Unknown: 'Have we met?',
  meet2Known: 'Nora.',
}

/** Where she can be standing in the courtyard when you first see her (walkable, clear tiles). */
export const YARD_SPOTS = [
  { x: -5.5, y: -146.5 },
  { x: 6.5, y: -151.5 },
  { x: 16.5, y: -136.5 },
  { x: -14.5, y: -141.5 },
  { x: 3.5, y: -132.5 },
]

/** ...and at her camp by the creek (MAP.md 06). */
export const CAMP_SPOTS = [
  { x: 39.5, y: -56.5 },
  { x: 44.5, y: -57.5 },
]
/** Her camp, roughly (where you can run into her there). */
export const NORA_CAMP = { x: 41.5, y: -57 }

/**
 * Where she goes when she leaves: off east between the buildings, north up to the gate, or from
 * her camp off east into the trees.
 */
export const LEAVE_EAST = { x: 19.5, y: -141 }
export const LEAVE_NORTH = { x: -0.5, y: -156.5 }
export const LEAVE_CREEK = { x: 56, y: -60 }

/**
 * The sighting (MAP.md 02/06, moved a little later in play-testing: she was there the moment you
 * came in): on either path from the fork, once you're a short way along it, she's standing further
 * on (about 7 tiles), and runs on ahead and off into the trees. West: towards Route 9. East: up
 * the creek trail, towards her camp.
 */
export const SIGHTINGS = [
  { at: { x: -12, y: -32 }, stand: { x: -18.5, y: -35 }, to: { x: -27, y: -46 } },
  { at: { x: 11, y: -30.5 }, stand: { x: 17.5, y: -34.5 }, to: { x: 29, y: -47 } },
]

export type NoraKind = 'sighting' | 'startle' | 'again' | 'meet1' | 'meet2'

/** How close you come before she speaks (she notices you sooner when she's frightened). */
const TALK_AT: Record<NoraKind, number> = {
  sighting: 0,
  startle: 6.5,
  again: 5.5,
  meet1: 4.5,
  meet2: 4.5,
}
/** How fast she leaves (tiles/s): running when she's frightened. */
const LEAVE_SPEED: Record<NoraKind, number> = {
  sighting: 4.2,
  startle: 4.6,
  again: 2.6,
  meet1: 1.7,
  meet2: 1.7,
}

/**
 * Nora, while she's on screen: fading in, waiting for you to come close (or, on the trail, for a
 * moment), talking, then walking (or running) away and fading out.
 */
export class Nora {
  phase: 'arrive' | 'wait' | 'talk' | 'linger' | 'leave' | 'gone' = 'arrive'
  a = 0
  anim = 0
  dir: Dir = 0
  private t = 0
  private leftFor = 0

  constructor(
    readonly kind: NoraKind,
    public x: number,
    public y: number,
    private to: { x: number; y: number },
    /** Sitting at a table (the second meeting): she stays put, facing out. */
    readonly seated = false,
  ) {}

  /** After talking, a seated Nora stays where she is until you've walked away. */
  linger() {
    this.phase = 'linger'
  }

  busy(): boolean {
    return this.phase !== 'gone'
  }

  /** Starts her leaving (after talking, or the sighting's moment). */
  leave() {
    this.phase = 'leave'
    this.leftFor = 0
  }

  /**
   * One step. Returns 'talk' the moment you're close enough for her to speak (the meetings), so
   * the game can start the conversation.
   */
  update(dt: number, me: { x: number; y: number }): 'talk' | null {
    this.t += dt
    const dx = me.x - this.x
    const dy = me.y - this.y
    const dist = Math.hypot(dx, dy)
    if (this.seated) this.dir = 0
    else if (this.phase === 'arrive' || this.phase === 'wait' || this.phase === 'talk')
      this.dir = facing(dx, dy)
    if (this.phase === 'linger') {
      // Gone once you're well away (or out of sight indoors): she's packed up for the deep road.
      if (dist > 13) this.a = Math.max(0, this.a - dt / 1.2)
      if (this.a <= 0) this.phase = 'gone'
      return null
    }
    if (this.phase === 'arrive') {
      this.a = Math.min(1, this.a + dt / 0.8)
      if (this.a >= 1) this.phase = 'wait'
      return null
    }
    if (this.phase === 'wait') {
      if (this.kind === 'sighting') {
        // She sees you, and goes (a moment, or sooner if you come at her).
        if (this.t > 2.2 || dist < 6) this.leave()
        return null
      }
      if (dist < TALK_AT[this.kind]) {
        this.phase = 'talk'
        return 'talk'
      }
      return null
    }
    if (this.phase === 'leave') {
      this.leftFor += dt
      const speed = LEAVE_SPEED[this.kind]
      const running = speed > 4
      const ox = this.to.x - this.x
      const oy = this.to.y - this.y
      const left = Math.hypot(ox, oy)
      if (left > 0.1) {
        const step = Math.min(left, speed * dt)
        this.x += (ox / left) * step
        this.y += (oy / left) * step
        this.dir = facing(ox, oy)
        this.anim += dt * (running ? 10 : 6)
      } else this.anim = 0
      const fadeAfter = running ? 0.7 : 3
      if (left <= 0.1 || this.leftFor > fadeAfter)
        this.a = Math.max(0, this.a - dt / (running ? 0.9 : 1.4))
      if (this.a <= 0) this.phase = 'gone'
    }
    return null
  }
}

function facing(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2
  return dy < 0 ? 3 : 0
}
