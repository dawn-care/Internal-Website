import type { Relation } from '../../shared/catalog'

/*
 * What people say when they find you in the forest (FOREST.md "Encounters: the nurse and the
 * family"), and what can be wrong about the fakes. Plain data: writing more lines needs no code.
 *
 * Real and fake people say the same words. What gives a fake away is never the script: it's the
 * tells (a face or a name that doesn't match the photo, no shadow, no footsteps, eyes that never
 * blink, the wrong badge), so a careful player can always tell, and a careless one can't.
 *
 * In the lines: {calls} is what they call you, {name} is who they say they are, {you} is your
 * name, {rel} is what they are to you ("son").
 */

/** The ways a fake can be wrong. Each fake shows one or two, never all (FOREST.md). */
export type Tell =
  /** A hair colour that isn't the one in the photo. */
  | 'hair'
  /** A cardigan colour that isn't the one in the photo. */
  | 'outfit'
  /** Glasses, a hat or a scarf that weren't there (or one that's missing). */
  | 'accessory'
  /** Eyes the wrong colour (you only see it in their face, close up). */
  | 'eyes'
  /** They never blink. */
  | 'blink'
  /** No shadow under them. */
  | 'shadow'
  /** No sound when they walk. */
  | 'steps'
  /** They call you something your family never called you. */
  | 'calls'
  /** The nurse: a name that isn't Ada. */
  | 'name'
  /** The nurse: the old Hollow Pines badge instead of a Sunset Acres one. */
  | 'badge'

/** Which tells a fake family member or a fake nurse can have. */
export const FAMILY_TELLS: Tell[] = [
  'hair',
  'outfit',
  'accessory',
  'eyes',
  'blink',
  'shadow',
  'steps',
  'calls',
]
export const NURSE_TELLS: Tell[] = ['hair', 'eyes', 'blink', 'shadow', 'steps', 'name', 'badge']

/** Names a fake nurse might give (close to Ada, never Ada). */
export const FAKE_NURSE_NAMES = ['Ida', 'Edna', 'Ava', 'Ada-May', 'Agnes']

/** What a fake calls you instead: near enough to pass, not what your family says. */
export const WRONG_CALLS: Record<string, string[]> = {
  mum: ['Mother', 'Mummy', 'Ma'],
  mom: ['Mother', 'Mommy', 'Ma'],
  dad: ['Father', 'Daddy', 'Pa'],
  gran: ['Granny', 'Nana', 'Grandma'],
  granny: ['Gran', 'Nana', 'Grandma'],
  nana: ['Gran', 'Granny', 'Grandma'],
  grandma: ['Gran', 'Nana', 'Granny'],
  grandad: ['Grandpa', 'Gramps', 'Pops'],
  grandpa: ['Grandad', 'Gramps', 'Pops'],
}
/** For someone who calls you by your name (or anything not above). */
export const WRONG_CALLS_ELSE = ['Sweetheart', 'Darling', 'Dearest', 'Old thing']

/** A wrong version of what they'd call you. */
export function wrongCalls(calls: string, pick: number): string {
  const list = WRONG_CALLS[calls.trim().toLowerCase()] ?? WRONG_CALLS_ELSE
  const options = list.filter((c) => c.toLowerCase() !== calls.trim().toLowerCase())
  return options[Math.floor(pick * options.length)] ?? list[0]
}

/** Voice pitch (Hz) for the blip per letter: the nurse, then by relationship. */
export const NURSE_PITCH = 520 // the same as Nurse Ada's at home (intro.ts ADA_VOICE)
export const VOICE_PITCH: Record<Relation, number> = {
  son: 170,
  daughter: 280,
  husband: 140,
  wife: 250,
  partner: 200,
  grandson: 230,
  granddaughter: 340,
  sister: 260,
  brother: 155,
  niece: 300,
  nephew: 210,
}

export interface Script {
  /** When they reach you. */
  greet: string[]
  /** You go with them (the real ones walk you home; the fakes lead you deeper). */
  go: string[]
  /** You refuse a real one: they're hurt, and leave. */
  hurt: string[]
  /**
   * You refuse a fake: it asks again, a stage further into the transformation, one line per
   * stage (1, 2, 3). After the last refusal it comes for you.
   */
  again: string[]
  /** When it gives up asking. */
  comes: string
}

export const FAMILY_SCRIPT: Script = {
  greet: [
    "{calls}! Oh, thank goodness. It's me, {name}. We've been looking everywhere for you.",
    "You're freezing. Come on, {calls}, let's get you home before it's properly dark.",
  ],
  go: ['This way. Hold on to my arm, {calls}.'],
  hurt: ['...Alright, {calls}. Alright.', "I'll come back for you. I promise I'll come back."],
  again: [
    "{calls}, please. It's me. Come home with me.",
    "Why won't you look at me, {calls}? Don't you remember me?",
    'Remember me. Please. Please remember me.',
  ],
  comes: '...',
}

export const NURSE_SCRIPT: Script = {
  greet: [
    "There you are, {you}! It's me, Nurse {name}. You gave us all such a fright.",
    "Let's get you home and in the warm, shall we? Take my arm.",
  ],
  go: ["That's it, dear. Mind the roots."],
  hurt: ['...Alright, dear. Stay right here, then.', "I'll fetch some help and come back for you."],
  again: [
    "{you}, dear. Don't be difficult. Come along now.",
    "You know me, {you}. You've always known me. Haven't you?",
    "Don't forget me. Everyone forgets me. Don't you forget me.",
  ],
  comes: '...',
}

/**
 * A thought as a younger relative reaches you, now and then (FACE_DOUBT_CHANCE). The old past is
 * clear, so a husband, wife, partner, child, brother or sister is always known at once; the ones
 * who grew up in recent years are the faces that take a moment (STORY.md "Memory: how the
 * dementia shows"). Said for the real and the fake alike, so it's never a tell.
 */
export const FACE_DOUBT = ['Is that...', 'So grown up. When did that happen?']
export const FACE_DOUBT_RELATIONS: readonly Relation[] = [
  'grandson',
  'granddaughter',
  'niece',
  'nephew',
]

/** The truth, on the black screen, when one of them catches you (FOREST.md "Caught"). */
export function caughtLine(rel: Relation | 'nurse'): string {
  return rel === 'nurse' ? 'That was not a nurse.' : `That was not your ${rel}.`
}

/** On the black screen, walking home with someone real. */
export function homeLine(name: string, nurse: boolean): string {
  return nurse ? 'Nurse Ada walks you home, one step at a time.' : `${name} walks you home.`
}

/** Fills in a line's {placeholders}. */
export function fill(line: string, v: { calls: string; name: string; you: string; rel: string }) {
  return line
    .split('{calls}')
    .join(v.calls)
    .split('{name}')
    .join(v.name)
    .split('{you}')
    .join(v.you)
    .split('{rel}')
    .join(v.rel)
}
