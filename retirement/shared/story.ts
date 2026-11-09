/*
 * The forest's story clues, as the save and the server know them (STORY.md "Story evidence
 * inventory"). Only the ids and the board's limits live here: what each clue says, where it can be
 * found and what it makes you think are client data in src/forest/story/.
 *
 * Every id from STORY.md is listed now, including the ones later acts will use, so saves made by a
 * newer client still validate on the server without a schema change.
 */

export const CLUE_IDS = [
  'route9_timetable',
  'bus_warning',
  'evie_card',
  'evie_missing',
  'search_roster',
  'evie_photo_before',
  'player_missing',
  'neighbor_statement',
  'evie_photo_return',
  'blue_coat_reference',
  'recent_closet_key',
  'closet_journals',
  'sunset_move_letter',
  'false_home_record',
  'evie_final_journal',
  'evie_belongings',
  'coat_instruction',
  // Pages from your own notebook, from when you were lost out here in October 1987 (found only
  // when you're lost). Added after STORY.md's first set; consistent with its October 1987 entry.
  'lost_journal',
] as const
export type ClueId = (typeof CLUE_IDS)[number]

export function isClueId(v: unknown): v is ClueId {
  return typeof v === 'string' && (CLUE_IDS as readonly string[]).includes(v)
}

/** Your own note on a clue (in the notepad, then on the board): at most this long. */
export const NOTE_MAX = 140
/** Board positions are percentages of the board (0–100), so it can be drawn at any size. */
export const BOARD_SIZE = 100
/** Strings between clues on the board. */
export const BOARD_LINKS_MAX = 60
