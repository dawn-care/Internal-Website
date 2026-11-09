import type { ClueId, LeadId } from '../../../shared/story'

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
  /** A second thought, a few seconds after the first, the first time you take it (rare). */
  then?: string
  /** What reading it notes in your notepad, if it holds something a lock needs (a lead). */
  lead?: LeadId
  /** The thought instead, if you've already read this other clue (on this trip or on your board). */
  voiceIf?: { clue: ClueId; voice: string[] }
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
        { text: 'Crew service: Millbrook Depot – Hollow Pines Forestry Camp', style: 'small' },
        { text: '', style: 'gap' },
        { text: 'Daily', style: 'small' },
        { text: ' | DAY CREW | SWING | NIGHT CREW', style: 'row' },
        { text: 'Millbrook Depot | 5:30 am | 1:30 pm | 9:30 pm', style: 'row' },
        { text: 'Old Mill Road | 5:45 am | 1:45 pm | 9:45 pm', style: 'row' },
        { text: 'This stop | 6:00 am | 2:00 pm | 10:00 pm', style: 'row' },
        { text: 'Hollow Pines Camp | 6:10 am | 2:10 pm | 10:10 pm', style: 'row' },
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
      lines: [{ text: 'DO NOT RIDE THE BUS ALONE.', style: 'hand' }],
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
  // In the same envelope as the card (STORY.md: the real Evie's right-eyebrow scar). The photo's
  // scene is invented; the scar is the canon detail, described in words, not left to the pixels.
  evie_photo_before: {
    id: 'evie_photo_before',
    title: 'A photograph of Evie',
    needs: [],
    paper: {
      kind: 'card',
      about: 'A photograph, its corners soft from handling. Kept flat between two pieces of card.',
      lines: [
        {
          text: 'A woman on a porch step in a blue raincoat, laughing at whoever holds the camera, a mug in both hands. A small pale scar cuts through her right eyebrow.',
          style: 'art',
        },
        { text: '', style: 'gap' },
        { text: 'On the back, in pencil: Evie, after the rain. Sept 86.', style: 'small' },
        { text: 'And under it, newer, pressed hard: THE SCAR. RIGHT EYEBROW.', style: 'hand' },
      ],
    },
    voice: ['I knew this woman.', 'Evie. I wrote the scar down so I wouldn’t forget it.'],
  },
  // The bunkhouse (MAP.md 09): Jonah Reed's journal, ordinary at first, then Daniel Bell. The
  // entries are invented around STORY.md's facts (Bell missing in 1978, back with memory gaps, a
  // shed fire he later denied; its date matches the fire report).
  jonah_journal: {
    id: 'jonah_journal',
    title: 'Jonah Reed’s journal',
    needs: [],
    paper: {
      kind: 'note',
      about:
        'A pocket notebook pushed down behind a bunk, the cover marked J. REED. The early pages are in ink; the later ones in pencil, smaller and harder.',
      lines: [
        { text: 'Mar 3, 78.', style: 'small' },
        {
          text: 'Rain all week. Okafor put the truck in the ditch again. Beans, third night.',
          style: 'hand',
        },
        { text: 'May 9.', style: 'small' },
        {
          text: 'Fire in the shed in the night. Danny smelled it first and got us all out. He signed for it in the morning with his hands still black.',
          style: 'hand',
        },
        { text: 'Jun 2.', style: 'small' },
        { text: 'Danny went out to mark the north stand. Didn’t come back.', style: 'hand' },
        { text: 'Jun 5.', style: 'small' },
        {
          text: 'They found him walking down the deep road, not a scratch on him. Says he took a wrong turn. Three days.',
          style: 'hand',
        },
        { text: 'Jun 11.', style: 'small' },
        { text: 'Danny doesn’t take sugar now. Twenty years he’s taken three.', style: 'hand' },
        { text: 'Jun 20.', style: 'small' },
        {
          text: 'Asked him about the fire. He said there was never a fire. He was THERE. He got us out.',
          style: 'hand',
        },
        { text: 'Jul 1.', style: 'small' },
        { text: 'He sleeps with his eyes open. I moved my bunk.', style: 'hand' },
        { text: 'Jul 9.', style: 'small' },
        {
          text: 'Told the office. They said leave it alone. I’m leaving it in here instead.',
          style: 'hand',
        },
      ],
    },
    voice: ['He came home. But was it him?'],
    // STORY.md "Memory: how the dementia shows": the echo, once, and never an answer.
    then: 'I forget things too. That doesn’t make me...',
  },
  // The maintenance shed (MAP.md 10, PUZZLES.md P02): the fire report Bell signed, with his
  // employee number. (The report's wording is invented; the date matches Jonah's journal.)
  bell_fire_record: {
    id: 'bell_fire_record',
    title: 'The shed fire report',
    needs: [],
    lead: 'bell_number',
    paper: {
      kind: 'printed',
      about:
        'A carbon copy in a clipboard hung on a nail by the bench, the edges browned. The typing has come through faint; the signature is in ink.',
      lines: [
        { text: 'HOLLOW PINES CAMP · INCIDENT REPORT', style: 'title' },
        { text: 'Date: 9 May 1978 · Time: approx. 2:40 am', style: 'small' },
        { text: 'Location: Maintenance shed', style: 'small' },
        { text: '', style: 'gap' },
        {
          text: 'Nature of incident: Fire. Fuel can beside bench caught from stove. Bench, two saws and part of east wall burnt.',
        },
        { text: 'Injuries: None. Crew roused and evacuated by reporting employee.' },
        { text: 'Action taken: Fire put out with sand and water by 3:15 am.' },
        { text: '', style: 'gap' },
        { text: 'Reported by: Daniel Bell', style: 'hand' },
        { text: 'Employee no. 0416', style: 'small' },
      ],
    },
    // Only knowing what Jonah wrote (that Bell later said there was never a fire) does the report
    // mean anything more than a fire (STORY.md: the voice never uses what you haven't seen).
    voice: ['He got them all out. And signed for it in the morning.'],
    voiceIf: {
      clue: 'jonah_journal',
      voice: ['He signed the report. How could he have forgotten the fire?'],
    },
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
