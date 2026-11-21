import type { Mood } from '../../portraits'

/*
 * The deep road's scripted beats (PUZZLES.md E_NORA_DOOR, E_PLAYER_DOUBLE, E_NORA_BODY; STORY.md
 * Act II), as data: their words, moods and where things stand. src/game.ts runs them.
 *
 * - Nora's death (E_NORA_DEATH): offscreen, never seen. It's committed the first time you go
 *   through the service gate on a trip after her second meeting; from then on she's at the ravine.
 * - E_NORA_DOOR: inside the watchman's shelter, a while after you look at something, someone
 *   pounds on the door. It's Nora's face and voice, without her mole. Open it, or don't.
 * - E_PLAYER_DOUBLE: at the logging fork, after the door: someone who looks like you, up one of
 *   the ways on, sees you and goes into the trees.
 * - E_NORA_BODY: the ravine: her body, her kettle, her notebook (clues.ts).
 * The thoughts follow STORY.md "The inner voice": the door gets none, the double "Oh.", her body
 * her name. The wording is invented.
 */

/** The pounding starts this long after you look at something inside (ms), or after the second. */
export const DOOR_AFTER_LOOK = 1800
export const DOOR_AFTER_MS = 14_000
/** How many times she asks again if you walk away from the window without answering. */
export const DOOR_ASKS = 3
/** Between asking again (ms): pounding the whole time. */
export const DOOR_AGAIN_MS = 4500

export const DOOR_CALL = ['LET ME IN! PLEASE! IT’S RIGHT BEHIND ME!']
export const DOOR_CALL_MOODS: (Mood | undefined)[] = ['scared']
/** Asking again (one a time, in order). */
export const DOOR_AGAIN = [
  'Please! Please, I can hear it!',
  'Why won’t you open the door? It’s me!',
  'Please...',
]
export const DOOR_AGAIN_MOODS: (Mood | undefined)[] = ['scared', 'scared', 'hurt']

/** Looking out of the window at her: her face, plainly (the mole isn't there to mention). */
export const DOOR_WINDOW =
  'Nora, close to the glass. Wet hair stuck to her forehead, her scarf, her lantern out. Her face white and smooth in the dark, her eyes on yours.'

/** You open the door: she comes in, frightened, then talks naturally, then wants you to go. */
export const DOOR_IN = [
  'Thank you. Oh, thank you.',
  'It was right behind me. Did you hear it?',
  '...We can’t stay in here. It knows where we are.',
  'There’s a way down past the ravine. Come with me. Now, while it’s quiet.',
]
export const DOOR_IN_MOODS: (Mood | undefined)[] = ['scared', 'scared', 'neutral', undefined]
/** You won't go: she stays where she is, by the door, watching you. */
export const DOOR_STAY = ['...All right.', 'I’ll wait.']
export const DOOR_STAY_MOODS: (Mood | undefined)[] = [undefined, undefined]
/** You go with her: caught, on the black screen. */
export const DOOR_CAUGHT = 'That was not Nora.'
/** Inside, she stands in front of the front door: you can't get past her that way. */
export const DOOR_BLOCKED = 'She’s standing in front of the door, between you and it.'

/** Where she stands inside once she's in (in front of the front door: story/map.ts). */
export const DOOR_INSIDE = { x: 213.5, y: -49.1 }

/** Outside the shelter afterwards: under its window (both ways it went). */
export const DOOR_TRACES =
  'Long scratches down the boards under the window, through the paint to the wood. A green scarf caught on a nail, wet through.'

/**
 * Your double: up one of the ways on from the logging fork (the one furthest from you), where it
 * stands and where it goes into the trees.
 */
export const DOUBLE_SPOTS = [
  { stand: { x: -2.5, y: -213.5 }, to: { x: -9, y: -217 } },
  { stand: { x: -13.5, y: -209 }, to: { x: -16, y: -201 } },
  { stand: { x: 8.5, y: -208.5 }, to: { x: 12, y: -200 } },
]
/** It sees you this long (s) before it says anything, then goes. */
export const DOUBLE_LOOK_S = 1.8
/** What it says, in your own voice (a speech bubble over it), and your thought. */
export const DOUBLE_SAYS = 'Hello?'
export const DOUBLE_THOUGHT = 'Oh.'
/** ...or, if you've already found her at the ravine. */
export const DOUBLE_THOUGHT_AFTER = '...No.'

/** Her body's thought (the clue's own), and the event when you've found her. */
export const BODY_THOUGHT = 'Nora.'
