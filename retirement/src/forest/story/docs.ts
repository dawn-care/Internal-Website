import type { LeadId } from '../../../shared/story'
import type { Paper } from './clues'

/*
 * Puzzle documents (PUZZLES.md: "not every examinable object needs a separate primary-story clue
 * ID"): papers you read at their site that hold what a puzzle needs, a code or a name. Reading one
 * notes it in your notepad as a lead (shared/story.ts LEADS), so you never have to memorize a
 * number; it isn't pinned on the board as a clue.
 */

export interface Doc {
  title: string
  paper: Paper
  /** What reading it notes in your notepad. */
  lead?: LeadId
  /** A thought the first time (or none). */
  voice?: string
}

export const DOCS = {
  /**
   * The office's shift register (PUZZLES.md P05): NIGHT CREW's allocation is the service gate's
   * code. The other crews' numbers are there too, each under its own label, so the plate on the
   * padlock is what tells you which. (Names and the other numbers invented; J. Reed is Jonah Reed,
   * STORY.md's forestry worker.)
   */
  shift_register: {
    title: 'Forestry shift assignments',
    paper: {
      kind: 'printed',
      about:
        'A typed sheet pinned to the noticeboard, curled at the corners, the drawing pins rusted into the cork.',
      lines: [
        { text: 'FORESTRY SHIFT ASSIGNMENTS', style: 'title' },
        { text: 'Hollow Pines Camp · Closure period, September–November 1979', style: 'small' },
        { text: '', style: 'gap' },
        { text: 'Crew | Lead | Allocation', style: 'row' },
        { text: 'DAY CREW | D. Okafor | 1840', style: 'row' },
        { text: 'SWING | M. Lindqvist | 0933', style: 'row' },
        { text: 'NIGHT CREW | J. Reed | 2714', style: 'row' },
        { text: '', style: 'gap' },
        {
          text: 'Crew gates and lockers are set to the crew’s allocation. Report any change to the office.',
          style: 'small',
        },
      ],
    },
    lead: 'night_crew_code',
  },
  /** The bunkhouse rules (PUZZLES.md P02, clue 1: the locker line is PUZZLES.md's own). */
  bunkhouse_rules: {
    title: 'Bunkhouse rules',
    paper: {
      kind: 'printed',
      about: 'A typed notice in a frame on the wall, the glass cracked across one corner.',
      lines: [
        { text: 'BUNKHOUSE B · RULES', style: 'title' },
        { text: 'Lights out 10:30 pm.' },
        { text: 'No cooking in the bunkhouse.' },
        { text: 'Wet gear in the drying room, not on the bunks.' },
        {
          text: 'Personal lockers use the four-digit employee number unless updated at the office.',
        },
        { text: '', style: 'gap' },
        { text: 'By order of the camp office.', style: 'small' },
      ],
    },
    lead: 'locker_rule',
  },
  /**
   * What's in Bell's locker once it's open (PUZZLES.md P02 "Success"): the paired hand photographs
   * and an unsigned note. It doesn't prove what every copy wants. (Wording invented.)
   */
  bell_locker: {
    title: 'In Daniel Bell’s locker',
    paper: {
      kind: 'note',
      about:
        'A work shirt on the hook, a tin of tobacco, and taped inside the door, two photographs and a folded note.',
      lines: [
        {
          text: 'Two photographs of a pair of hands flat on a table. The first: a white scar across the knuckles of the left hand. The second: the same hands, the same table. No scar.',
          style: 'art',
        },
        { text: 'On the backs: D.B. Mar 78 · D.B. Jul 78', style: 'small' },
        { text: '', style: 'gap' },
        {
          text: 'He holds his fork in the other hand now. He asked his own mother how she takes her tea. He watches how we do things and the next day he does them right.',
          style: 'hand',
        },
        { text: 'He is learning us.', style: 'hand' },
      ],
    },
    voice: 'Someone took these to be sure.',
  },
  /** The pulley diagram on the shed wall (PUZZLES.md P03): the order the shutter is worked in. */
  pulley_diagram: {
    title: 'Storage shutter: manual operation',
    paper: {
      kind: 'printed',
      about:
        'A tin plate screwed to the wall beside the winch, the diagram on it worn but legible.',
      lines: [
        { text: 'STORAGE SHUTTER · MANUAL OPERATION', style: 'title' },
        {
          text: 'A drawing: a rope from the shutter up over a pulley and down to a spool with a crank; beside the spool, a catch and a toothed ratchet.',
          style: 'art',
        },
        { text: '', style: 'gap' },
        { text: '1. RELEASE the safety catch.' },
        { text: '2. TURN the spool until the rope is tight.' },
        { text: '3. SET the ratchet to hold the shutter up.' },
        { text: '', style: 'gap' },
        { text: 'Do not turn the spool with the catch on.', style: 'small' },
      ],
    },
  },
  /**
   * On the shelf behind the shutter (PUZZLES.md P03 "Success"): more camp photographs, one with a
   * worker outside the bunkhouse who is also at its window. (Wording invented.)
   */
  camp_photos: {
    title: 'Photographs on the shelf',
    paper: {
      kind: 'card',
      about:
        'A shoebox of photographs on the storage shelf, curled and stuck together at the edges.',
      lines: [
        { text: 'The day crew round the truck, squinting into the sun.', style: 'art' },
        { text: 'The flagpole going up. Someone has written 1952 on the back.', style: 'art' },
        {
          text: 'A man in a work shirt outside the bunkhouse, waving. Behind him, at the bunkhouse window, the same man, the same shirt, not waving.',
          style: 'art',
        },
        { text: 'On the back of the last one: Danny, July.', style: 'small' },
      ],
    },
    voice: 'He’s in two places.',
  },
} satisfies Record<string, Doc>

export type DocId = keyof typeof DOCS
