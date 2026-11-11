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
  /**
   * For an `art` line: the picture itself, a file in retirement/photos (its name without the
   * extension). The line's text is then its description for screen readers, not shown. Pictures
   * never show the protagonist (STORY.md).
   */
  img?: string
}

export interface Paper {
  /** How it's shown: a printed sheet, a scrap with handwriting, a folded card. */
  kind: 'printed' | 'note' | 'card'
  /**
   * The whole paper as a picture (a file in retirement/photos, without the extension): shown
   * instead of the lines, which must say the same words (they're what screen readers get).
   */
  img?: string
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
  /** What reading it notes in your notepad, if it holds something a lock needs (a lead). */
  lead?: LeadId
  /** Your own note about someone you've met (the notepad lists these under People). */
  person?: true
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
        'A page torn from a notebook, nailed to the trail marker. Pencil, pressed so hard it tore the paper.',
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
    voice: ['Evie. I know that name. Don’t I?', 'Tea on the porch... I can almost smell it.'],
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
          text: 'A woman on a porch step in a blue raincoat, laughing at whoever holds the camera, a mug in both hands. An old pale nick through her right eyebrow.',
          style: 'art',
          img: 'evie_photo_before',
        },
        { text: '', style: 'gap' },
        { text: 'On the back, in pencil: Evie, after the rain. Sept 86.', style: 'small' },
      ],
    },
    voice: ['I knew this woman.'],
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
          text: 'Asked him about the fire. He said what fire.',
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
    voice: [],
    // STORY.md "Memory: how the dementia shows": the echo, once, and never an answer.
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
    voice: ['He got them all out.'],
  },
}

// --- the administrative office (MAP.md 11): Evie's case, and your own archive -----------------
//
// Two collections in the office: Evie's 1978 police file and Jonah's 1987 letter in a case box,
// and the archive you left here yourself after 1987 (MAP.md: it's why papers from after the camp
// closed are in a camp building). STORY.md gives the facts and dates; all the wording is invented.
// "{name}" is your character's name. The returned-Evie papers need `evie_missing` on your board
// first, and the clipping about you needs `search_roster` (Act III after Act II, STORY.md).

CLUES.evie_case_1978 = {
  id: 'evie_case_1978',
  title: 'Evie’s case file, 1978',
  needs: [],
  paper: {
    kind: 'printed',
    about:
      'A buff police folder, its string tie rotted through. Typed sheets inside, with a detective’s pencil notes in the margins.',
    lines: [
      { text: 'COUNTY SHERIFF’S DEPARTMENT · INVESTIGATION FILE', style: 'title' },
      { text: 'Officer: Det. E. Mercer · Opened: June 1978', style: 'small' },
      {
        text: 'Re: persons reported missing near Hollow Pines Camp and since returned',
        style: 'small',
      },
      { text: '', style: 'gap' },
      {
        text: 'R. Haskins | Oct 1977 | 2 days | Wife: “He calls the dog by the wrong name.”',
        style: 'row',
      },
      {
        text: 'D. Bell | Jun 1978 | 3 days | Co-worker: denies events he witnessed.',
        style: 'row',
      },
      { text: 'A. Pruett | Aug 1978 | 4 days | Mother: scar on his chin gone.', style: 'row' },
      { text: '', style: 'gap' },
      { text: 'Mrs Pruett rang again. Tues.', style: 'hand' },
      { text: '', style: 'gap' },
      { text: 'Closed March 1979 by order. No finding.', style: 'small' },
    ],
  },
  voice: ['I’ve seen this handwriting before. Somewhere.'],
}

CLUES.evie_last_lead = {
  id: 'evie_last_lead',
  title: 'Jonah’s letter to Evie',
  needs: [],
  paper: {
    kind: 'note',
    about:
      'A letter in its envelope, addressed to Det. E. Mercer, with a folded photocopy tucked in behind it.',
    lines: [
      { text: 'Sept 2, 1987', style: 'small' },
      { text: 'Detective Mercer,', style: 'hand' },
      {
        text: 'I kept a box of camp things all these years. I found this in it. Before they shut us, the first-aid records were moved down under the shelter on the deep road. If anybody wrote down what Danny was really like when he came back, it’s there.',
        style: 'hand',
      },
      { text: 'I’m too old for that road. Please be careful.', style: 'hand' },
      { text: 'Jonah Reed', style: 'hand' },
      { text: '', style: 'gap' },
      {
        text: 'The photocopy: a 1978 survey sketch of the deep road. The first-aid shelter is circled, and under it, a square marked STORES BELOW.',
        style: 'art',
      },
    ],
  },
  voice: [],
}

CLUES.evie_missing = {
  id: 'evie_missing',
  title: 'MISSING: Evie Mercer',
  needs: [],
  paper: {
    kind: 'printed',
    about: 'A missing-person poster, folded in half, the photo on it gone pale.',
    // The poster itself is photos/evie_missing.webp; these lines are its words, kept the same.
    img: 'evie_missing',
    lines: [
      { text: 'MISSING PERSON', style: 'title' },
      {
        text: 'A photocopied photo of a woman with short wavy hair in a hooded coat, laughing. It has gone too pale to see her face well.',
        style: 'art',
      },
      { text: 'EVELYN “EVIE” MERCER', style: 'title' },
      { text: 'Age: 46 · Height: 5′6″ · Weight: approx. 130 lbs' },
      { text: 'Hair: Auburn, short and wavy · Eyes: Green' },
      { text: 'Identifying marks: Small scar through her right eyebrow' },
      { text: 'Last seen: Monday, September 14, 1987, near the old Hollow Pines camp road' },
      { text: 'Clothing: Blue raincoat, light-coloured sweater, jeans, hiking boots' },
      { text: '', style: 'gap' },
      { text: 'ANY INFORMATION, PLEASE CALL THE COUNTY SHERIFF’S DEPARTMENT', style: 'small' },
    ],
  },
  voice: ['September the fourteenth.'],
}

CLUES.search_roster = {
  id: 'search_roster',
  title: 'The search sign-in sheet',
  needs: [],
  paper: {
    kind: 'printed',
    about:
      'A clipboard sheet, the kind handed round at the start of a search. Rain has run some of the ink.',
    lines: [
      { text: 'SEARCH FOR E. MERCER · VOLUNTEER SIGN-IN', style: 'title' },
      { text: 'Date | Name | Area', style: 'row' },
      { text: 'Sep 15 | D. Okafor | Creek trail', style: 'row' },
      { text: 'Sep 15 | {name} | Camp road', style: 'row' },
      { text: 'Sep 16 | {name} | Deep road, to the fence', style: 'row' },
      { text: 'Sep 17 | {name} | Deep road', style: 'row' },
      { text: 'Sep 18 | {name} | (crossed out)', style: 'row' },
      { text: '', style: 'gap' },
      { text: '{name}: again. Please don’t go out there alone. Sgt. P.', style: 'hand' },
    ],
  },
  voice: ['That’s my name.', 'Every day.'],
}

CLUES.neighbor_statement = {
  id: 'neighbor_statement',
  title: 'A neighbour’s statement',
  needs: ['evie_missing'],
  paper: {
    kind: 'printed',
    about: 'A typed witness statement, two pages stapled, a coffee ring on the first.',
    lines: [
      { text: 'WITNESS STATEMENT', style: 'title' },
      { text: 'Margaret Hale, neighbour · taken 2 October 1987', style: 'small' },
      { text: '', style: 'gap' },
      {
        text: 'On Sunday the 20th of September, about nine at night, in the rain, I saw Evie Mercer at {name}’s front door. I have known her for years. It was her.',
      },
      {
        text: 'She stood on the step a long while before she went in. I had heard she was missing, so I went across the next morning. {name} said she was resting and I should come back.',
      },
      { text: 'Signed, M. Hale', style: 'hand' },
    ],
  },
  voice: ['Margaret. From across the road.'],
}

CLUES.returned_evie_photo = {
  id: 'returned_evie_photo',
  title: 'A photograph of Evie, Sept 1987',
  needs: ['evie_missing'],
  paper: {
    kind: 'card',
    about: 'An instant photo in a plastic sleeve, the colours gone orange.',
    lines: [
      {
        text: 'Evie at a kitchen table, her hands round a mug, not drinking. She’s looking straight at the camera without smiling. Her eyebrows are smooth and even.',
        style: 'art',
      },
      { text: 'On the white border: Sept 21, 87.', style: 'small' },
    ],
  },
  voice: ['That’s my kitchen.'],
}

CLUES.returned_evie_journal = {
  id: 'returned_evie_journal',
  title: 'My journal, Sept 1987',
  needs: ['evie_missing'],
  paper: {
    kind: 'note',
    about:
      'A diary with a cloth cover, the September pages held flat with an elastic band. Your own handwriting.',
    lines: [
      { text: 'Sept 20.', style: 'small' },
      {
        text: 'Evie is home!! At the door in the rain. She won’t say where she’s been.',
        style: 'hand',
      },
      { text: 'Sept 21.', style: 'small' },
      {
        text: 'She doesn’t eat. She watches me eat. She asked if we could go walking at Hollow Pines.',
        style: 'hand',
      },
      { text: 'Sept 22.', style: 'small' },
      {
        text: 'She doesn’t sleep. I heard her in the hall all night. Asked again about Hollow Pines. I said when she’s better.',
        style: 'hand',
      },
      { text: 'Sept 23.', style: 'small' },
      {
        text: 'She’s gone. Her blue raincoat is on my hook. There is a door at the end of the hall that was never there.',
        style: 'hand',
      },
    ],
  },
  voice: [],
}

CLUES.player_missing = {
  id: 'player_missing',
  title: 'A newspaper clipping, Oct 1987',
  needs: ['search_roster'],
  paper: {
    kind: 'printed',
    about: 'A clipping from a local paper, yellow and brittle, in a sandwich bag.',
    lines: [
      { text: 'SEARCHER FOUND AFTER ELEVEN DAYS', style: 'title' },
      {
        text: '{name}, who joined last month’s search for missing detective Evelyn Mercer, walked out of the woods by the old Route 9 road on Friday, eleven days after being reported missing.',
      },
      {
        text: 'Confused but unhurt, {name} could not say where they had been. Sheriff’s deputies urge the public to stay out of the Hollow Pines woods.',
      },
    ],
  },
  voice: ['Eleven days.'],
}

// --- people you've met (STORY.md "Memory: how the dementia shows") -----------------------------
//
// Written by the protagonist straight after meeting someone, in their own words, so that next
// time the note knows them even if they don't. Not found anywhere: the game writes it.

CLUES.note_nora = {
  id: 'note_nora',
  title: 'Nora',
  needs: [],
  person: true,
  paper: {
    kind: 'note',
    about: 'A page of your notepad, in your own handwriting.',
    lines: [
      { text: 'NORA VALE', style: 'hand' },
      { text: 'Met her at the old camp. Local historian. Looking into the camp.', style: 'hand' },
      { text: 'Careful of strangers. Asked me to stay back. Kind, though.', style: 'hand' },
      { text: 'Long dark hair, green jacket, a scarf. Carries a lantern.', style: 'hand' },
      { text: 'A mole on her left cheek.', style: 'hand' },
    ],
  },
  voice: [],
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
