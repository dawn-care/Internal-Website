import type { ClueId } from '../../../shared/story'

/*
 * The story's clues (STORY.md "Story evidence inventory"): fixed, authored things with a stable id
 * and a physical source. The forest decides which spot holds a clue on a given trip, never what it
 * says: the same clue always reads the same, wherever it's found.
 *
 * Each clue has:
 * - `title`: its short name in your notepad and on the board.
 * - `paper`: what's physically there (shown first, before any interpretation).
 * - `voice`: what goes through your head the first time you read it (one is picked).
 * - `needs`: clues that must already be on your board before it can turn up (STORY.md's reveal
 *   gates). Act I's clues need nothing.
 * Where each is found is the map's business (story/map.ts: a spot with `clue`).
 *
 * Act I only, for now: the Route 9 timetable, the warning in your own hand and Evie's birthday
 * card. The rest of STORY.md's ids are in shared/story.ts so saves already accept them.
 */

/** One line of a paper, and how it's printed. */
export interface PaperLine {
  text: string
  /**
   * title: big printed heading · hand: handwriting · small: small print · row: a timetable row
   * (cells split on "|") · gap: a blank line · art: a drawing, described.
   */
  style?: 'title' | 'hand' | 'small' | 'row' | 'gap' | 'art'
}

export interface Paper {
  /** How it's shown: a printed sheet, a scrap with handwriting, a folded card. */
  kind: 'printed' | 'note' | 'card'
  /** What you see before you read it: the object itself, plainly. */
  about: string
  lines: PaperLine[]
}

export interface Clue {
  id: ClueId
  title: string
  paper: Paper
  voice: string[]
  needs: ClueId[]
}

export const CLUES: Partial<Record<ClueId, Clue>> = {
  route9_timetable: {
    id: 'route9_timetable',
    title: 'Route 9 timetable',
    needs: [],
    paper: {
      kind: 'printed',
      about:
        'A timetable behind cracked plastic, screwed to the shelter. The print has faded to brown.',
      lines: [
        { text: 'ROUTE 9', style: 'title' },
        { text: 'Millbrook Depot – Hollow Pines Forestry Camp', style: 'small' },
        { text: '', style: 'gap' },
        { text: 'Monday to Saturday', style: 'small' },
        { text: 'Millbrook Depot | 6:10 | 7:40 | 12:15 | 4:50', style: 'row' },
        { text: 'Old Mill Road | 6:24 | 7:54 | 12:29 | 5:04', style: 'row' },
        { text: 'Hollow Pines Camp | 6:55 | 8:25 | 1:00 | 5:35', style: 'row' },
        { text: '', style: 'gap' },
        { text: 'NOTICE', style: 'small' },
        {
          text: 'With the closing of Hollow Pines Camp, the last Route 9 service will run on Friday 31 August 1979. This route will not be replaced.',
          style: 'small',
        },
      ],
    },
    voice: ['1979. That was a long time ago.', 'Nobody has waited here for years.'],
  },
  bus_warning: {
    id: 'bus_warning',
    title: 'A warning in your hand',
    needs: [],
    paper: {
      kind: 'note',
      about:
        'A page torn from a notebook, nailed to the shelter post. Pencil, pressed so hard it tore the paper.',
      lines: [
        { text: 'DO NOT RIDE THE BUS ALONE.', style: 'hand' },
        { text: '(underlined twice)', style: 'small' },
      ],
    },
    voice: ["That's my handwriting.", "I don't remember writing this."],
  },
  evie_card: {
    id: 'evie_card',
    title: 'A birthday card from Evie',
    needs: [],
    paper: {
      kind: 'card',
      about:
        'A birthday card, soft with damp. Pressed flowers on the front, gone brown. Inside, in round, careful handwriting:',
      lines: [
        { text: 'Happy Birthday!', style: 'title' },
        { text: '', style: 'gap' },
        { text: 'To my dearest neighbour,', style: 'hand' },
        {
          text: 'Another year of tea on the porch and arguing about tomatoes. You were right about the netting. Don’t tell anyone I said so.',
          style: 'hand',
        },
        { text: 'Don’t you dare forget our walk on Sunday.', style: 'hand' },
        { text: 'All my love,', style: 'hand' },
        { text: 'Evie  x', style: 'hand' },
        { text: '', style: 'gap' },
        { text: 'Pencilled on the back: June 1986', style: 'small' },
      ],
    },
    voice: [
      'Evie. I know that name. Don’t I?',
      'Someone loved me very much once.',
      'Tea on the porch... I can almost smell it.',
    ],
  },
}

/** Every clue that's written so far. */
// Found only when you're lost: your own notes from October 1987 (STORY.md: you searched the woods,
// went missing for days and began recording routes and rules), in a tin box under the lean-to
// you made, with your red marks on the trees leading to it. They never name you or Evie (that's
// Act II); they teach real rules: the searcher whose light doesn't flicker, and waiting.
CLUES.lost_journal = {
  id: 'lost_journal',
  title: 'Pages from a lost notebook',
  needs: [],
  paper: {
    kind: 'note',
    about:
      'A biscuit tin, rusted shut, then not. Inside, folded small, pages torn from a notebook, the pencil gone soft with damp.',
    lines: [
      { text: 'Oct. Day 3.', style: 'small' },
      {
        text: 'The trees moved in the night. I marked them red so I’d know. The marks are still here. The trees aren’t where they were.',
        style: 'hand',
      },
      { text: '', style: 'gap' },
      { text: 'Day 6.', style: 'small' },
      {
        text: 'Someone calls my name. They sound like people I know. Go to the light that doesn’t flicker. Only that one.',
        style: 'hand',
      },
      { text: '', style: 'gap' },
      { text: 'Day 9.', style: 'small' },
      {
        text: 'If you’re reading this, sit down and wait. They find you when you stop.',
        style: 'hand',
      },
    ],
  },
  voice: ['That’s my handwriting. When did I write this?', 'Day nine. How long was I out here?'],
}

export const WRITTEN = Object.values(CLUES) as Clue[]
