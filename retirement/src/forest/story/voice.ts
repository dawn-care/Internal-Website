/*
 * The inner voice (STORY.md "The inner voice"): what goes through your head, shown as a line of
 * italic text under you. It notices real things and gets frightened; it never gives away facts
 * the player hasn't found. Lines for a clue, a landmark or a find live with them (clues.ts, map.ts,
 * finds.ts); these are the ones tied to moments instead.
 *
 * Used sparingly (play-testing: it talked every few seconds, and asked the player's own questions
 * for them). It speaks only about something real that just happened or that you chose to look
 * at, never asks a question you should be asking, and unprompted thoughts are at most one a
 * minute (game.ts muse). Moments with a CHANCE of 0 are kept for reference but say nothing.
 *
 * Occasional silence matters: most moments have a chance of saying nothing (`CHANCE`). Every line
 * is about something that's actually there (the lights going, the birds stopping, being lost):
 * play-testing showed thoughts with nothing behind them read as false promises.
 */

export type VoiceMoment =
  /** Your first steps in, each trip. */
  | 'enter'
  /** The first time you're well in (past the home's lights). */
  | 'deeper'
  /** The moment you're lost (you've wandered too far from the paths): a beat after. */
  | 'lostNow'
  /** Sitting down to wait, lost (and, a while later, still sitting). */
  | 'sit'
  | 'sitLong'
  /** Lost, and heading back the way you came, looking for the path. */
  | 'turnBack'
  /** Still lost, a while later. */
  | 'lost'
  /** Seeing a clue you already have on your board. */
  | 'known'
  /** Coming home safely with something new. */
  | 'banked'
  /** At night in the forest. */
  | 'night'
  /** Your pet isn't with you (said once, early, if you have one). */
  | 'nopet'
  /**
   * Reaching a place you've been on an earlier trip (once a trip, rarely): the recent past
   * slipping (STORY.md "Memory: how the dementia shows").
   */
  | 'arrive'
  /** Waking in the infirmary after a trip went wrong, a beat before Nurse Ada speaks. */
  | 'wake'

export const VOICE: Record<VoiceMoment, string[]> = {
  enter: ['It’s very quiet.', 'The birds have stopped.', 'What did I come out here for?'],
  deeper: ['I can’t see the lights any more.', 'The home’s lights are gone.'],
  sit: ['I’ll sit here. Someone will come.'],
  sitLong: [
    'Something’s moving out there. I won’t open my eyes.',
    'Is that someone coming? Or just the wind?',
    'I can hear it breathing. Can’t I?',
  ],
  lostNow: ['I don’t know where the path went...', 'None of this looks right.'],
  turnBack: [
    'That tree wasn’t there before.',
    'I could’ve sworn the path was there.',
    'I came this way. I know I came this way.',
    'There was a path. There was.',
    'I’ve never seen that stump before.',
  ],
  lost: [
    'This isn’t the way I came.',
    'I don’t know where I am.',
    'Someone will come. They always come.',
    'Don’t panic. Keep walking.',
    'Nothing looks the same twice.',
  ],
  known: [
    'I’ve seen this before.',
    'I remember this one.',
    'Again. Why does this keep turning up?',
  ],
  banked: [
    'I should put these somewhere I’ll see them.',
    'I need to write this down before it goes.',
    'Why would I have kept all this?',
  ],
  night: ['It’s getting so dark.', 'I can’t see my own hands.'],
  nopet: ['I wish I hadn’t come without them.', 'It’s strange, being out here alone.'],
  arrive: ['I’ve been here before. Haven’t I?', 'Have I been here?'],
  wake: ['Where...?', 'This isn’t my room.'],
}

/** How likely a moment is to say anything at all (the rest of the time: silence). */
export const CHANCE: Record<VoiceMoment, number> = {
  // Silence is the default: the voice is for moments that matter, not commentary.
  enter: 0.4,
  deeper: 0,
  lostNow: 1,
  sit: 1,
  sitLong: 0,
  turnBack: 1,
  lost: 0,
  known: 0,
  banked: 0,
  night: 0,
  nopet: 0,
  arrive: 0.3,
  wake: 1,
}

/** A line for a moment, or null (silence). `avoid` is the line said last, never said twice running. */
export function voiceFor(m: VoiceMoment, avoid?: string): string | null {
  if (Math.random() > CHANCE[m]) return null
  const lines = VOICE[m].filter((l) => l !== avoid)
  return lines[Math.floor(Math.random() * lines.length)] ?? null
}
