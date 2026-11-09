/*
 * The forest's story clues, as the save and the server know them (STORY.md "Major evidence"). Only
 * the ids and the board's limits live here: what each clue says, where it can be found and what it
 * makes you think are client data in src/forest/story/.
 *
 * Every id from STORY.md is listed now, including the ones later milestones will use, so saves made
 * by a newer client still validate on the server without a schema change.
 */

export const CLUE_IDS = [
  'route9_timetable',
  'bus_warning',
  'own_warning',
  'evie_card',
  'evie_photo_before',
  'jonah_journal',
  'bell_fire_record',
  'evie_case_1978',
  'evie_last_lead',
  'evie_missing',
  'search_roster',
  'neighbor_statement',
  'returned_evie_photo',
  'player_missing',
  'returned_evie_journal',
  'nora_field_note',
  'nora_body_evidence',
  'closet_key_note',
  'closet_journal',
  'drainage_survey',
  'false_home_observation',
  'evie_final_journal',
  'evie_original_coat',
  'evie_remains',
  // Optional: pages from your own notebook, from when you were lost out here in October 1987, in a
  // tin box under your old lean-to (found only when you're lost; STORY.md lists it as optional).
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

// --- story progress (PUZZLES.md "Core mechanics and state model") --------------------------------

/**
 * Physical things you can carry (PUZZLES.md): keys. Each is in exactly one place: your pocket,
 * the key hook in your room, or (neither) back where it was found.
 */
export const ITEM_IDS = ['ITEM_ADMIN_KEY', 'ITEM_CLOSET_KEY'] as const
export type ItemId = (typeof ITEM_IDS)[number]

/** PUZZLES.md's puzzles, kept once solved on a safe return. */
export const PUZZLE_IDS = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'] as const
export type PuzzleId = (typeof PUZZLE_IDS)[number]

/** PUZZLES.md's one-time scripted encounters, kept as history once they've happened. */
export const EVENT_IDS = [
  'E_NORA_SIGHTING',
  'E_NORA_MEET_1',
  'E_NORA_MEET_2',
  'E_NORA_DOOR',
  'E_PLAYER_DOUBLE',
  'E_NORA_BODY',
  'E_EVIE_LAST',
] as const
export type EventId = (typeof EVENT_IDS)[number]

/** STORY.md's memory scenes. */
export const CUTSCENE_IDS = [
  'CS_GARDEN',
  'CS_SEARCH',
  'CS_HOMECOMING',
  'CS_LOCKING',
  'CS_ENDING',
] as const
export type CutsceneId = (typeof CUTSCENE_IDS)[number]

/** MAP.md's location ids (the forest's, for the rough site map). */
export const SITE_IDS = [
  'TRAILHEAD',
  'SOUTH_FORK',
  'BUS_STOP',
  'FOREMAN_CABIN',
  'CREEK_CAMP',
  'CAMP_GATE',
  'CAMP_YARD',
  'BUNKHOUSE',
  'MAINTENANCE',
  'ADMIN_OFFICE',
  'SERVICE_GATE',
  'WATCH_SHELTER',
  'LOGGING_FORK',
  'RAVINE_CULVERT',
  'SURVEY_LOOKOUT',
  'SHELTER_EXTERIOR',
  'SHELTER_INTERIOR',
] as const
export type SiteId = (typeof SITE_IDS)[number]

/**
 * Unresolved leads (PUZZLES.md: "Text should record an unresolved lead"): a lock you've found
 * and can't open yet, noted so you don't have to remember it. Each is resolved by its puzzle.
 * (The ids are the game's own: the documents name the puzzles, not the leads.)
 */
export const LEADS = {
  office_locked: { puzzle: 'P01', text: 'The administrative office is locked. It takes a key.' },
  service_gate_locked: {
    puzzle: 'P05',
    text: 'The service gate’s padlock: four digits, and a plate that says NIGHT CREW.',
  },
  night_crew_code: {
    puzzle: 'P05',
    text: 'The shift register in the office: NIGHT CREW, allocation 2714.',
  },
  bell_locker_locked: {
    puzzle: 'P02',
    text: 'A locker in the bunkhouse with D. BELL on it: four digits.',
  },
  locker_rule: {
    puzzle: 'P02',
    text: 'The bunkhouse lockers open with the worker’s four-digit employee number.',
  },
  bell_number: {
    puzzle: 'P02',
    text: 'The fire report in the shed is signed Daniel Bell, employee no. 0416.',
  },
  shutter_jammed: {
    puzzle: 'P03',
    text: 'The storage shutter in the maintenance shed is jammed.',
  },
  closet_locked: { puzzle: 'P06', text: 'The little door in my room is locked.' },
  shelter_blocked: {
    puzzle: 'P08',
    text: 'The first-aid shelter’s door is blocked. There must have been another way in.',
  },
} as const satisfies Record<string, { puzzle: PuzzleId; text: string }>
export type LeadId = keyof typeof LEADS
export const LEAD_IDS = Object.keys(LEADS) as LeadId[]

/**
 * Your story so far, kept on a safe return (PUZZLES.md "Suggested progression state schema"): the
 * keys on your hook, puzzles solved, scripted events that have happened, memory scenes seen and
 * waiting, the places you've been (for the site map) and the leads you've found. Clues live on the
 * board (`save.board`); keys you're carrying, in your pocket (`save.pocket`).
 */
export interface StoryProgress {
  hook?: ItemId[]
  puzzles?: PuzzleId[]
  events?: EventId[]
  seen?: CutsceneId[]
  queued?: CutsceneId[]
  sites?: SiteId[]
  leads?: LeadId[]
  done?: true
}
