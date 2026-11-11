import type { ClueId, EventId, ItemId, LeadId, PuzzleId } from '../../../shared/story'
import type { DocId } from './docs'

/*
 * Hollow Pines: the forest's fixed map (MAP.md). The same every trip, so it's a place you learn. A
 * footpath runs north from the gap in the treeline to a signed fork. West, a path joins the old
 * Route 9 road, which runs north over the creek and past the foreman's cabin, then east past the
 * bus stop.
 * East, the creek trail passes Nora's camp and crosses the creek on a footbridge. Both come to the
 * camp gate, in a wire perimeter fence that runs far out into the woods on either side, so the only
 * way in is the gate. Inside is the courtyard (bunkhouse, maintenance shed, administrative office)
 * and, on its north side, the locked service gate onto the deep road (P05, PUZZLES.md).
 *
 * The woods between are generated (gen.ts), the same every time; off the paths the trees close in,
 * and wander too far from them and you're lost (the forest stops being this map at all). How far
 * "off the paths" is goes round fences, never through them (layout.ts), so you can't skirt a gate.
 *
 * Coordinates are tiles, with the gap you came in by at (0, 0) and the forest to the north
 * (y negative). Everything here is data: lines (road, paths, creek), areas, props (drawn in
 * story/art.ts) and spots (things to examine: a line of description and maybe a thought, or a
 * clue). Landmark ids are MAP.md's location ids.
 */

export type Pt = [number, number]

/** Ground kinds the map can lay down (drawn in forest/art.ts). */
export type MapGround =
  | 'road'
  | 'path'
  | 'water'
  | 'plank'
  | 'stone'
  | 'wild'
  | 'yard'
  /** A building's inside walls (solid). */
  | 'wall'
  /** Round a building's inside: nothing, never seen (solid). */
  | 'void'

export interface Line {
  ground: MapGround
  /** Width across (tiles). */
  width: number
  pts: Pt[]
  /** Walkable (paths, road) or not (the creek). Walkable lines keep you from being lost. */
  walk: boolean
}

export interface Area {
  /** Its own ground, for a yard or the like. Leave it out for a clearing: areas are rectangles,
   * and a rectangle of different ground looks like a carpet laid in the woods. */
  ground?: MapGround
  /** Inclusive tile rectangle. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Counts as "on the paths" (you're never lost standing here). */
  walk?: boolean
  /**
   * A building's inside (INTERIORS): walled round (two tiles of back wall, one at the sides and
   * front), with nothing round the walls, and the walls block the distance from the paths.
   */
  room?: boolean
}

/** A prop: a drawn thing (story/art.ts PROPS) standing with its bottom-left on tile (x, y). */
export interface Prop {
  id: string
  x: number
  y: number
  /** Sprite variant. */
  v?: number
}

/** Something to examine: faced from the next tile. */
export interface Spot {
  x: number
  y: number
  prompt: string
  look?: string
  voice?: string
  clue?: ClueId
  /** Something you can take home and keep (a keepsake: story/finds.ts KEEPSAKES)... */
  keep?: string
  /** ...or a key you can take (PUZZLES.md: physical items, one of each)... */
  item?: ItemId
  /** ...and what it looks like once you have (or the key is yours). */
  lookAfter?: string
  /** A lock you can't open yet: looking at it notes it in your notepad (an unresolved lead). */
  lead?: LeadId
  /** A puzzle document to read (story/docs.ts). */
  doc?: DocId
  /** A second clue in the same place (the card and the photo in one envelope), once the first is taken. */
  also?: ClueId
  /** A combination lock (COMBOS): the service gate's padlock (P05) or Bell's locker (P02). */
  combo?: ComboId
  /** The shutter's winch (PUZZLES.md P03). */
  winch?: true
  /**
   * What it looks like once these things have happened (the last that has wins): Nora's camp, once
   * you've met her (MAP.md 06: the description recognizes her things) and once she's gone.
   */
  met?: { event: EventId; look: string }[]
  /** Until this puzzle is solved, looking here only says `look` (what's behind is shut away). */
  shut?: { puzzle: PuzzleId; look: string }
}

export type ComboId = 'P02' | 'P05'

/**
 * The combination locks (PUZZLES.md P02, P05): their code (as a string, so 0416 keeps its zero),
 * the prop that opens (Forest.open), what the button says, what's said when it opens, and what's
 * there to look at afterwards: a line, or a document to read.
 */
export const COMBOS: Record<
  ComboId,
  {
    code: string
    prop: string
    pull: string
    sprung: string
    openPrompt: string
    open: string
    doc?: DocId
  }
> = {
  P05: {
    code: '2714',
    prop: 'servicegate',
    pull: 'Pull the shackle',
    sprung: 'The padlock springs open.',
    openPrompt: 'Look at the gate',
    open: 'The gate stands open, the chain hanging loose.',
  },
  P02: {
    code: '0416',
    prop: 'belllocker',
    pull: 'Lift the latch',
    sprung: 'The lock clicks. The locker door swings open.',
    openPrompt: 'Look in Bell’s locker',
    open: '',
    doc: 'bell_locker',
  },
}

export interface Landmark {
  id: string
  name: string
  /** Where it is, and how close counts as having found it (its first thought). */
  x: number
  y: number
  r: number
  seen: string[]
  areas: Area[]
  props: Prop[]
  spots: Spot[]
}

/** The map's extent: outside it there's only forest, and you're lost. (Worked out at the end.) */
export const BOUNDS = { x0: 0, y0: 0, x1: 0, y1: 0 }

/** The forest's fixed seed: the woods between the paths look the same every trip. */
export const HOLLOW_SEED = 401_987

// Where things are (tiles). The camp perimeter: the south fence (with the camp gate in it), the
// sides, and the north fence (with the service gate in it). The south and north fences run out
// FENCE_WING tiles past the sides, far beyond where you'd be lost, so nothing goes round them.
const CAMP = { south: -127, north: -158, west: -22, east: 22 }
const FENCE_WING = 40

export const LINES: Line[] = [
  // The footpath in from the treeline, to the fork.
  {
    ground: 'path',
    width: 1.8,
    walk: true,
    pts: [
      [0.5, 2],
      [0.5, -12],
      [1, -26],
    ],
  },
  // From the fork, west to Route 9.
  {
    ground: 'path',
    width: 1.6,
    walk: true,
    pts: [
      [0.5, -26],
      [-8, -30],
      [-20, -36],
      [-32, -43],
    ],
  },
  // Route 9: from where it's closed off in the west, north over the creek and past the foreman's
  // cabin, then east along a straight stretch past the bus stop, to the camp gate.
  {
    ground: 'road',
    width: 2.4,
    walk: true,
    pts: [
      [-66, -45],
      [-46, -44.5],
      [-33, -43.5],
      [-37, -56],
      [-40, -70],
      [-41, -86],
      [-38, -100],
      [-33, -106],
      [-14, -106],
      [-5, -116],
      [0.5, -124],
      [0.5, -131],
    ],
  },
  // From the fork, east: the creek trail, past Nora's camp and over the creek, to the camp gate.
  {
    ground: 'path',
    width: 1.4,
    walk: true,
    pts: [
      [1.5, -26],
      [12, -31],
      [24, -39],
      [33, -50],
      [37, -60],
      [37, -74],
      [33, -90],
      [24, -106],
      [12, -118],
      [1.5, -124],
    ],
  },
  // In the courtyard: the worn track round the back from the bunkhouse to the maintenance shed.
  {
    ground: 'path',
    width: 1.2,
    walk: true,
    pts: [
      [-13, -135],
      [-11, -143],
      [-14, -149],
    ],
  },
  // The deep road, north through the service gate (MAP.md 13–18 are built along it later).
  {
    ground: 'road',
    width: 2.4,
    walk: true,
    pts: [
      [0.5, -150],
      [0.5, -172],
      [-3, -188],
      [-6, -204],
    ],
  },
  // The creek, west to east across the map (the road crosses it on a bridge, the trail on a
  // footbridge).
  {
    ground: 'water',
    width: 2.6,
    walk: false,
    pts: [
      [-100, -62],
      [-70, -68],
      [-52, -66],
      [-40, -71],
      [-20, -73],
      [0, -69],
      [20, -72],
      [37, -67],
      [60, -71],
      [110, -66],
    ],
  },
]

/** A run of the perimeter's wire fence: along a row (v 0) or down a column (v 1). */
function wire(x0: number, y0: number, x1: number, y1: number): Prop[] {
  const out: Prop[] = []
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) out.push({ id: 'wire', x, y, v: x0 === x1 ? 1 : 0 })
  return out
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'TRAILHEAD',
    name: 'The trailhead',
    x: 0.5,
    y: -8,
    r: 5,
    seen: [],
    areas: [],
    props: [{ id: 'waymark', x: 2, y: -11, v: 1 }],
    spots: [
      {
        x: 2,
        y: -11,
        prompt: 'Read the note on the marker',
        // The bus warning, long before there's a bus (`own_warning` goes elsewhere: MAP.md 02).
        clue: 'bus_warning',
      },
    ],
  },
  {
    id: 'SOUTH_FORK',
    name: 'The fork',
    x: 1,
    y: -27,
    r: 5,
    seen: [],
    areas: [{ x0: -2, y0: -29, x1: 4, y1: -24, walk: true }],
    props: [{ id: 'forksign', x: 3, y: -28 }],
    spots: [
      {
        x: 3,
        y: -28,
        prompt: 'Read the signpost',
        look: 'A signpost where the path splits. One arm points west: ROUTE 9. The other points east: CREEK TRAIL. Under both, in the same faded paint: CAMP.',
      },
    ],
  },
  {
    id: 'BUS_STOP',
    name: 'The Route 9 bus stop',
    x: -24,
    y: -107,
    r: 7,
    seen: [],
    areas: [{ x0: -28, y0: -109, x1: -20, y1: -107, walk: true }],
    props: [
      { id: 'busstop', x: -26, y: -108 },
      { id: 'bussign', x: -27, y: -108 },
      { id: 'bin', x: -22, y: -108 },
    ],
    spots: [
      {
        x: -27,
        y: -108,
        prompt: 'Look at the sign',
        look: 'A bus stop sign, the paint flaking off it: ROUTE 9 · HOLLOW PINES CAMP.',
        voice: 'Hollow Pines. I’ve heard that name somewhere.',
      },
      { x: -26, y: -108, prompt: 'Read the timetable', clue: 'route9_timetable' },
      {
        x: -25,
        y: -108,
        prompt: 'Look at the bench',
        look: 'A wooden bench under the shelter. Someone has swept the needles off one end of it.',
      },
      {
        x: -22,
        y: -108,
        prompt: 'Look in the bin',
        look: 'A rusted litter bin. Inside, a child’s red mitten, quite dry.',
        keep: 'mitten',
        lookAfter: 'A rusted litter bin. Empty.',
      },
    ],
  },
  {
    id: 'FOREMAN_CABIN',
    name: 'The foreman’s cabin',
    x: -46,
    y: -90,
    r: 7,
    seen: [],
    areas: [{ x0: -51, y0: -93, x1: -43, y1: -88, walk: true }],
    props: [{ id: 'cabin', x: -49, y: -90 }],
    spots: [
      {
        x: -49,
        y: -90,
        prompt: 'Look at the plate',
        look: 'A tin plate by the door: FOREMAN · HOLLOW PINES FORESTRY.',
      },
    ],
  },
  {
    id: 'CREEK_CAMP',
    name: 'The campsite by the creek',
    x: 41,
    y: -57,
    r: 6,
    seen: [],
    areas: [{ x0: 39, y0: -61, x1: 46, y1: -53, walk: true }],
    props: [
      { id: 'bedroll', x: 42, y: -59 },
      { id: 'firepit', x: 41, y: -55 },
      { id: 'kettle', x: 42, y: -55 },
    ],
    spots: [
      {
        x: 41,
        y: -55,
        prompt: 'Look at the fire',
        look: 'A ring of stones, the ashes still faintly warm. Someone put this fire out not long ago, and carefully. A tin mug of tea stands on one of the stones.',
        voice: 'Someone’s been here recently.',
        met: [
          {
            event: 'E_NORA_MEET_1',
            look: 'Nora’s fire, put out carefully, the ashes still faintly warm. Her tin mug of tea on a stone.',
          },
          {
            event: 'E_NORA_MEET_2',
            look: 'Nora’s fire, cold now, the ashes rained flat. No mug. She hasn’t been back.',
          },
        ],
      },
      {
        x: 42,
        y: -55,
        prompt: 'Look at the kettle',
        look: 'A tea kettle, dented on one side and blackened underneath. Well used, and looked after.',
        met: [
          {
            event: 'E_NORA_MEET_1',
            look: 'Nora’s kettle, the dent on one side. Of course it’s hers.',
          },
          {
            event: 'E_NORA_MEET_2',
            look: 'A ring of soot on the stone where Nora’s kettle stood. She took it with her, up the deep road.',
          },
        ],
      },
      {
        x: 42,
        y: -59,
        prompt: 'Look at the bedroll',
        look: 'A bedroll, rolled up tight and tied with string, ready to go. A notebook is tucked under the string, its cover too damp to open.',
        met: [
          {
            event: 'E_NORA_MEET_1',
            look: 'Nora’s bedroll, tied up tight, her notebook under the string. Ready to go.',
          },
          {
            event: 'E_NORA_MEET_2',
            look: 'Flattened grass where Nora’s bedroll lay. She’s packed up and gone.',
          },
        ],
      },
    ],
  },
  {
    id: 'CAMP_GATE',
    name: 'The camp gate',
    x: 0.5,
    y: CAMP.south - 1,
    r: 8,
    seen: [],
    areas: [],
    props: [
      { id: 'campsign', x: -2, y: CAMP.south },
      ...wire(CAMP.west - FENCE_WING, CAMP.south, -3, CAMP.south),
      ...wire(4, CAMP.south, CAMP.east + FENCE_WING, CAMP.south),
      ...wire(CAMP.west, CAMP.north + 1, CAMP.west, CAMP.south - 1),
      ...wire(CAMP.east, CAMP.north + 1, CAMP.east, CAMP.south - 1),
    ],
    spots: [
      {
        x: -2,
        y: CAMP.south,
        prompt: 'Read the sign',
        look: 'A board over the gate: HOLLOW PINES FORESTRY CAMP · EST. 1952. Below it, smaller: ALL VISITORS REPORT TO THE OFFICE.',
      },
      {
        x: 3,
        y: CAMP.south,
        prompt: 'Read the notice',
        look: 'A notice nailed to the gatepost, the print faded: THIS CAMP IS CLOSED. NO ENTRY. HOLLOW PINES FORESTRY, 1979.',
      },
    ],
  },
  {
    id: 'CAMP_YARD',
    name: 'The camp courtyard',
    x: 0,
    y: -140,
    r: 10,
    seen: [],
    areas: [
      {
        ground: 'yard',
        x0: CAMP.west + 1,
        y0: CAMP.north + 1,
        x1: CAMP.east - 1,
        y1: CAMP.south - 1,
        walk: true,
      },
    ],
    props: [
      { id: 'flagpole', x: 0, y: -141 },
      { id: 'truck', x: 10, y: -133 },
      { id: 'table', x: -8, y: -139 },
      { id: 'table', x: 5, y: -138 },
    ],
    spots: [
      {
        x: 0,
        y: -141,
        prompt: 'Look at the flagpole',
        look: 'A flagpole with no flag. The rope taps against it, slow and steady.',
      },
      {
        x: 11,
        y: -133,
        prompt: 'Look in the truck',
        look: 'A forestry truck on flat tyres. On the dash, a clipboard: a work roster, the ink run to nothing in the damp.',
      },
    ],
  },
  {
    id: 'BUNKHOUSE',
    name: 'The bunkhouse',
    x: -17,
    y: -135,
    r: 6,
    seen: [],
    areas: [],
    props: [{ id: 'bunk', x: -19, y: -136 }],
    spots: [
      {
        x: -18,
        y: -136,
        prompt: 'Look through the window',
        look: 'Through the window: rows of bunks, a line of tin lockers, work shirts still on their hooks.',
      },
    ],
  },
  {
    id: 'MAINTENANCE',
    name: 'The maintenance shed',
    x: -17,
    y: -149,
    r: 6,
    seen: [],
    areas: [],
    props: [{ id: 'shed', x: -19, y: -150 }],
    spots: [
      {
        x: -18,
        y: -150,
        prompt: 'Look at the shutter',
        // (Once P03 is solved from inside, it's up: the same shutter.)
        look: 'The roller shutter is up. Behind it, a bay of shelves, and the inside of the shed.',
        shut: {
          puzzle: 'P03',
          look: 'A roller shutter, rusted, jammed a hand’s width off the ground. Too low to get under.',
        },
      },
      {
        x: -17,
        y: -150,
        prompt: 'Read the sign',
        look: 'MAINTENANCE, stencilled on the wall. Under it, smaller: ALL REPAIRS TO BE LOGGED.',
      },
    ],
  },
  {
    id: 'ADMIN_OFFICE',
    name: 'The administrative office',
    x: 14,
    y: -145,
    r: 6,
    seen: [],
    areas: [],
    props: [{ id: 'office', x: 12, y: -146 }],
    spots: [
      {
        x: 12,
        y: -146,
        prompt: 'Look at the windows',
        look: 'The windows are boarded up from the inside.',
      },
    ],
  },
  {
    id: 'SERVICE_GATE',
    name: 'The service gate',
    x: 0.5,
    y: CAMP.north + 2,
    r: 6,
    seen: [],
    areas: [],
    props: [
      { id: 'servicegate', x: -1, y: CAMP.north },
      ...wire(CAMP.west - FENCE_WING, CAMP.north, -2, CAMP.north),
      ...wire(3, CAMP.north, CAMP.east + FENCE_WING, CAMP.north),
    ],
    spots: [
      {
        x: 0,
        y: CAMP.north,
        prompt: 'Look at the padlock',
        look: 'A chain round the gate and its post, and a heavy padlock with four number dials. A worn plate on it reads NIGHT CREW.',
        lead: 'service_gate_locked',
        combo: 'P05',
      },
      {
        x: 1,
        y: CAMP.north,
        prompt: 'Look through the gate',
        look: 'A vehicle gate, chained shut. Beyond it the road runs on north into the dark.',
      },
    ],
  },
]

// --- insides (MAP.md: "Interiors are authored") --------------------------------------------------
//
// Each building you can go into has its inside here: a small walled room off in a corner of the map
// nobody can walk to (east of everything, past where you'd be lost), reached only through its door
// (DOORS). It's part of the same forest, so your trip, your light and your notepad carry on inside.

/** A building's inside, as a landmark (its id isn't a site: it isn't drawn on the site map). */
function interior(
  id: string,
  name: string,
  x0: number,
  y0: number,
  w: number,
  h: number,
  props: Prop[],
  spots: Spot[],
): Landmark {
  return {
    id,
    name,
    x: x0 + w / 2,
    y: y0 + h / 2,
    r: 0,
    seen: [],
    areas: [{ ground: 'plank', x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, walk: true, room: true }],
    props,
    spots,
  }
}

export const INTERIORS: Landmark[] = [
  // The foreman's cabin (MAP.md 05): a desk with the administration key in its drawer and the field
  // envelope on top, a stove, a window. (The descriptions are invented.)
  interior(
    'IN_FOREMAN_CABIN',
    'Inside the foreman’s cabin',
    130,
    -52,
    8,
    5,
    [
      { id: 'desk', x: 130, y: -52 },
      { id: 'chair', x: 132, y: -52 },
      { id: 'window', x: 135, y: -53 },
      { id: 'stove', x: 136, y: -52 },
      { id: 'papers', x: 134, y: -50 },
    ],
    [
      {
        // ITEM_ADMIN_KEY (PUZZLES.md P01): the look and thought are PUZZLES.md's own.
        x: 130,
        y: -52,
        prompt: 'Open the desk drawer',
        look: 'In the drawer, an old brass key, its paper tag stamped ADMINISTRATION.',
        voice: 'An old Hollow Pines key. I wonder if any of these locks still take it.',
        item: 'ITEM_ADMIN_KEY',
        lookAfter: 'The drawer: pencil stubs, a dead fly, nothing else.',
      },
      // The old field envelope (MAP.md 05): Evie's card, and under it her photograph.
      {
        x: 131,
        y: -52,
        prompt: 'Look in the envelope',
        clue: 'evie_card',
        also: 'evie_photo_before',
      },
      {
        x: 135,
        y: -53,
        prompt: 'Look out of the window',
        look: 'Black glass. Your own face in it, and behind your face, the trees.',
      },
      {
        x: 136,
        y: -52,
        prompt: 'Look at the stove',
        look: 'A pot-bellied stove, cold. Someone has swept the ash out of it and left the door open.',
      },
      {
        x: 134,
        y: -50,
        prompt: 'Look at the papers',
        look: 'Paperwork gone to pulp on the floor: delivery notes, a fuel log. The dates are all 1979.',
      },
    ],
  ),
  // The administrative office (MAP.md 11): the shift register on the noticeboard (P05's code), the
  // filing cabinets (Evie's files come with M4), a desk. (The descriptions are invented.)
  interior(
    'IN_ADMIN_OFFICE',
    'Inside the administrative office',
    150,
    -53,
    9,
    6,
    [
      { id: 'noticeboard', x: 151, y: -54 },
      { id: 'window', x: 154, y: -54, v: 1 },
      { id: 'cabinet', x: 157, y: -53 },
      { id: 'cabinet', x: 158, y: -53, v: 1 },
      { id: 'desk', x: 154, y: -51 },
      { id: 'chair', x: 156, y: -52 },
      // Evie's case box, and your own archive (MAP.md 11: the post-1987 cache), in an old suitcase.
      { id: 'casebox', x: 151, y: -50 },
      { id: 'suitcase', x: 157, y: -50 },
    ],
    [
      { x: 151, y: -54, prompt: 'Read the noticeboard', doc: 'shift_register' },
      {
        x: 152,
        y: -54,
        prompt: 'Read the noticeboard',
        doc: 'shift_register',
      },
      {
        x: 154,
        y: -54,
        prompt: 'Look at the window',
        look: 'Boarded over from the inside, and the boards nailed again over the first ones.',
      },
      {
        x: 157,
        y: -53,
        prompt: 'Open the filing cabinet',
        look: 'Folders swollen with damp: work orders, timesheets, requisitions for chain oil.',
      },
      {
        x: 158,
        y: -53,
        prompt: 'Open the filing cabinet',
        look: 'The drawers stick, then give. Empty, every one.',
      },
      {
        x: 154,
        y: -51,
        prompt: 'Look at the desk',
        look: 'A desk under a skin of dust, except for one clean square where something stood until not long ago.',
      },
      // Evie's papers (STORY.md "Major evidence"; the wording of every one is invented). Each spot
      // holds two: the second turns up once you have the first (`also`). Some can't turn up until
      // other evidence is on your board (clues.ts `needs`); till then the spot's look is shown.
      {
        x: 151,
        y: -50,
        prompt: 'Look in the box',
        clue: 'evie_case_1978',
        also: 'evie_last_lead',
      },
      {
        x: 157,
        y: -50,
        prompt: 'Look in the suitcase',
        clue: 'evie_missing',
        also: 'search_roster',
      },
      {
        x: 158,
        y: -50,
        prompt: 'Look in the suitcase',
        clue: 'neighbor_statement',
        also: 'returned_evie_photo',
        look: 'More folders, in your own careful order: names, dates, a neighbour’s address. None of it means anything to you yet.',
      },
      {
        x: 155,
        y: -51,
        prompt: 'Open the desk drawer',
        clue: 'returned_evie_journal',
        also: 'player_missing',
        look: 'A cloth-covered diary in your own handwriting, swollen shut with damp, and a clipping in a sandwich bag. You’d need to know what you were looking for.',
      },
    ],
  ),
  // The bunkhouse (MAP.md 09): bunks, the line of lockers with Bell's among them (P02), the rules
  // by the door, and Jonah's journal pushed down behind a bunk. (The descriptions are invented.)
  interior(
    'IN_BUNKHOUSE',
    'Inside the bunkhouse',
    170,
    -53,
    11,
    6,
    [
      { id: 'bunkbed', x: 170, y: -52 },
      { id: 'bunkbed', x: 173, y: -52 },
      { id: 'bunkbed', x: 170, y: -49 },
      { id: 'bunkbed', x: 173, y: -49 },
      { id: 'window', x: 175, y: -54 },
      { id: 'frame', x: 176, y: -54 },
      { id: 'locker', x: 177, y: -53 },
      { id: 'locker', x: 178, y: -53 },
      { id: 'belllocker', x: 179, y: -53 },
      { id: 'locker', x: 180, y: -53 },
      { id: 'stove', x: 180, y: -49 },
    ],
    [
      {
        x: 174,
        y: -49,
        prompt: 'Look behind the bunk',
        clue: 'jonah_journal',
      },
      {
        x: 173,
        y: -49,
        prompt: 'Look at the bunk',
        look: 'A bunk stripped to the springs. J.R. is scratched into the iron at the head of it.',
      },
      {
        x: 170,
        y: -52,
        prompt: 'Look at the bunk',
        look: 'A grey blanket folded square at the foot, the way somebody was taught to fold it.',
      },
      {
        x: 171,
        y: -52,
        prompt: 'Look at the bunk',
        look: 'A grey blanket folded square at the foot, the way somebody was taught to fold it.',
      },
      {
        x: 173,
        y: -52,
        prompt: 'Look at the bunk',
        look: 'Work shirts still on the hooks above it, gone stiff. A pair of boots underneath, laced.',
      },
      {
        x: 174,
        y: -52,
        prompt: 'Look at the bunk',
        look: 'Work shirts still on the hooks above it, gone stiff. A pair of boots underneath, laced.',
      },
      {
        x: 170,
        y: -49,
        prompt: 'Look at the bunk',
        look: 'The mattress has been turned over. On the underside, in pencil, a row of tally marks.',
      },
      {
        x: 171,
        y: -49,
        prompt: 'Look at the bunk',
        look: 'The mattress has been turned over. On the underside, in pencil, a row of tally marks.',
      },
      { x: 176, y: -54, prompt: 'Read the notice', doc: 'bunkhouse_rules' },
      {
        x: 175,
        y: -54,
        prompt: 'Look out of the window',
        look: 'The courtyard, grey. The flagpole. Nobody.',
      },
      {
        x: 177,
        y: -53,
        prompt: 'Open the locker',
        look: 'Empty, but for a coat hanger and a bar of soap worn to a sliver.',
      },
      {
        x: 178,
        y: -53,
        prompt: 'Open the locker',
        look: 'Its lock is long gone. Inside, a calendar for 1979, every day crossed off until August.',
      },
      {
        x: 179,
        y: -53,
        prompt: 'Look at the locker',
        look: 'A tin locker with D. BELL on a strip of tape across the door. A little dial lock, four digits.',
        lead: 'bell_locker_locked',
        combo: 'P02',
      },
      {
        x: 180,
        y: -53,
        prompt: 'Open the locker',
        look: 'Locked, but the door is bent at the corner. Through the gap: nothing.',
      },
      {
        x: 180,
        y: -49,
        prompt: 'Look at the stove',
        look: 'A stove, cold. No cooking in the bunkhouse, says the notice. Someone did anyway: a pan on top.',
      },
    ],
  ),
  // The maintenance shed (MAP.md 10): the bench where the fire started, with Bell's report on its
  // nail; what the fire left; the storage bay behind the jammed front shutter (the one you see from
  // outside, left of the door) and the winch that works it (P03), with the diagram on its post. (The descriptions are invented.)
  interior(
    'IN_MAINTENANCE',
    'Inside the maintenance shed',
    190,
    -53,
    9,
    6,
    [
      { id: 'bench', x: 190, y: -53 },
      { id: 'burnt', x: 192, y: -53 },
      { id: 'window', x: 195, y: -54 },
      // In the front wall, left of the door as from outside: the shutter's storage bay, the winch
      // beside it and the diagram on its post.
      { id: 'bay', x: 190, y: -48 },
      { id: 'winch', x: 193, y: -48 },
      { id: 'diagram', x: 194, y: -48 },
    ],
    [
      { x: 191, y: -53, prompt: 'Look at the clipboard', clue: 'bell_fire_record' },
      {
        x: 190,
        y: -53,
        prompt: 'Look at the bench',
        look: 'A bench black along one end, the wood blistered. The vice is rusted shut on nothing.',
      },
      {
        x: 192,
        y: -53,
        prompt: 'Look at the burnt things',
        look: 'Two chainsaws burnt to the metal, and a fuel can split down the seam. Swept up and left.',
      },
      {
        x: 193,
        y: -53,
        prompt: 'Look at the burnt things',
        look: 'Two chainsaws burnt to the metal, and a fuel can split down the seam. Swept up and left.',
      },
      {
        x: 195,
        y: -54,
        prompt: 'Look at the window',
        look: 'The glass has gone brown with smoke. The new boards round it are paler than the old.',
      },
      ...[190, 191, 192].map((x) => ({
        x,
        y: -48,
        prompt: 'Look in the bay',
        doc: 'camp_photos' as const,
        lead: 'shutter_jammed' as const,
        shut: {
          puzzle: 'P03' as const,
          look: 'The back of the roller shutter, down and jammed, closing a bay in the front wall. Through the gap at the bottom: a shelf, the corner of a box.',
        },
      })),
      {
        x: 193,
        y: -48,
        prompt: 'Work the winch',
        look: 'The shutter’s winch: a spool with a crank, the rope gone slack, a catch, a toothed ratchet.',
        winch: true,
      },
      { x: 194, y: -48, prompt: 'Read the plate', doc: 'pulley_diagram' },
    ],
  ),
]
LANDMARKS.push(...INTERIORS)

/**
 * The doors into the insides: the tile of the building you face to go in (`outside`), where you
 * stand when you come out (`out`), the tile of the inside's front wall you face to go out (`door`)
 * and where you stand when you come in (`in`). A locked one opens with its puzzle (`lock`), using
 * `key`; until then, looking at it says `locked` and notes `lead`.
 */
export interface Door {
  room: string
  outside: { x: number; y: number }
  out: { x: number; y: number }
  door: { x: number; y: number }
  in: { x: number; y: number }
  lock?: PuzzleId
  key?: ItemId
  locked?: string
  lead?: LeadId
}

export const DOORS: Door[] = [
  {
    room: 'IN_FOREMAN_CABIN',
    outside: { x: -47, y: -90 },
    out: { x: -46.5, y: -88.6 },
    door: { x: 133, y: -47 },
    in: { x: 133.5, y: -47.4 },
  },
  {
    // P01 (PUZZLES.md): the administration key. The locked line is PUZZLES.md's own.
    room: 'IN_ADMIN_OFFICE',
    outside: { x: 14, y: -146 },
    out: { x: 14.5, y: -144.6 },
    door: { x: 154, y: -47 },
    in: { x: 154.5, y: -47.4 },
    lock: 'P01',
    key: 'ITEM_ADMIN_KEY',
    locked: 'It’s locked. Someone kept this office secure long after the camp closed.',
    lead: 'office_locked',
  },
  {
    room: 'IN_BUNKHOUSE',
    outside: { x: -16, y: -136 },
    out: { x: -15.5, y: -134.6 },
    door: { x: 175, y: -47 },
    in: { x: 175.5, y: -47.4 },
  },
  {
    room: 'IN_MAINTENANCE',
    outside: { x: -16, y: -150 },
    out: { x: -15.5, y: -148.6 },
    door: { x: 196, y: -47 },
    in: { x: 196.5, y: -47.4 },
  },
]

// Each inside's way out, drawn so you can find it (play-testing: it was just more wall): a door in
// the front wall, and a worn doormat on the floor in front of it.
for (const d of DOORS) {
  const lm = INTERIORS.find((l) => l.id === d.room)!
  lm.props.push(
    { id: 'exitdoor', x: d.door.x, y: d.door.y },
    { id: 'doormat', x: d.door.x, y: d.door.y - 1 },
  )
}

/** The inside you're in at a tile, if any (and its door). */
export function roomAt(x: number, y: number): Door | undefined {
  for (const d of DOORS) {
    const lm = INTERIORS.find((l) => l.id === d.room)!
    const a = lm.areas[0]
    if (x >= a.x0 - 1 && x <= a.x1 + 1 && y >= a.y0 - 2 && y <= a.y1 + 1) return d
  }
  return undefined
}

/** Things along the way: trail markers, the road's end, the poles. */
LANDMARKS.push({
  id: 'DRESSING',
  name: 'Along the way',
  x: 0,
  y: 0,
  r: 0,
  seen: [],
  areas: [],
  props: [
    { id: 'closedsign', x: -66, y: -47 },
    { id: 'waymark', x: 40, y: -64 },
  ],
  spots: [
    {
      x: -66,
      y: -47,
      prompt: 'Read the sign',
      look: 'ROAD CLOSED, on a board striped red and white. Past it the old road disappears under the trees.',
    },
    {
      x: 40,
      y: -64,
      prompt: 'Read the trail marker',
      look: 'A trail marker. CREEK TRAIL, and an arrow north: CAMP.',
    },
  ],
})

/** Poles along the road, every so often (the wires long gone). */
export const ROAD_POLES: Pt[] = [
  [-50, -42],
  [-44, -60],
  [-45, -80],
  [-43, -102],
  [-12, -103],
]

/**
 * What every prop says when you look at it, unless a spot on it says something more particular
 * (several lines: one is picked by where it stands).
 */
export const PROP_LOOKS: Record<string, { prompt: string; look: string[] }> = {
  busstop: {
    prompt: 'Look at the shelter',
    look: ['A bus shelter, its roof rusted through in places.'],
  },
  bussign: { prompt: 'Look at the sign', look: ['ROUTE 9 · HOLLOW PINES CAMP.'] },
  bin: { prompt: 'Look in the bin', look: ['A rusted litter bin.'] },
  pole: {
    prompt: 'Look at the pole',
    look: [
      'A telegraph pole. The wires are long gone. A tin plate nailed to it reads HP 22.',
      'A telegraph pole. Someone has carved a little arrow into it, pointing north.',
      'A telegraph pole, leaning. The insulators are still on it, cracked.',
    ],
  },
  forksign: {
    prompt: 'Read the signpost',
    look: ['ROUTE 9 to the west, CREEK TRAIL to the east.'],
  },
  closedsign: { prompt: 'Read the sign', look: ['ROAD CLOSED.'] },
  waymark: { prompt: 'Read the trail marker', look: ['A trail marker post.'] },
  cabin: {
    prompt: 'Look at the cabin',
    look: ['A small plank cabin with a tin roof. The door hangs open a hand’s width.'],
  },
  bedroll: { prompt: 'Look at the bedroll', look: ['A bedroll, tied up tight.'] },
  firepit: { prompt: 'Look at the fire', look: ['A ring of stones round cold ashes.'] },
  kettle: { prompt: 'Look at the kettle', look: ['A dented tea kettle.'] },
  campsign: { prompt: 'Read the sign', look: ['HOLLOW PINES FORESTRY CAMP · EST. 1952.'] },
  wire: {
    prompt: 'Look at the fence',
    look: [
      'A tall wire fence, rusted, with barbed wire along the top. It runs off into the trees as far as you can see.',
      'The fence. Something has pushed at the wire here from the other side, and bent it.',
      'Wire fence, the posts sunk in concrete. Somebody meant this to last.',
    ],
  },
  truck: {
    prompt: 'Look at the truck',
    look: ['A forestry truck on flat tyres. HOLLOW PINES stencilled on the door.'],
  },
  table: { prompt: 'Look at the bench', look: ['A picnic bench, its planks broken through.'] },
  flagpole: { prompt: 'Look at the flagpole', look: ['A flagpole with no flag.'] },
  bunk: {
    prompt: 'Look at the bunkhouse',
    look: [
      'A long plank bunkhouse. BUNKHOUSE B over the door.',
      'Names scratched into the planks by the door, dozens of them. None you know.',
    ],
  },
  shed: {
    prompt: 'Look at the shed',
    look: ['A maintenance shed with a corrugated roof, its shutter jammed.'],
  },
  office: {
    prompt: 'Look at the office',
    look: ['ADMINISTRATION, on a little sign over the door. It’s locked.'],
  },
  servicegate: {
    prompt: 'Look at the gate',
    look: ['A steel vehicle gate, chained and padlocked.'],
  },
  rail: {
    prompt: 'Look over the rail',
    look: [
      'The creek runs fast and black under the bridge.',
      'Your reflection in the water, very still. The water isn’t.',
    ],
  },
}

/** The forest's own things, when you look at them (one line is picked by where it stands). */
export const NATURE_LOOKS: Record<string, { prompt: string; look: string[] }> = {
  fpine: {
    prompt: 'Look at the pine',
    look: [
      'A tall pine, black with damp.',
      'A pine. The bark has been scratched away at shoulder height, all round.',
      'A pine, sap running from an old wound in its side.',
      'A pine. Something has nested high up in it. Something big.',
    ],
  },
  ftree: {
    prompt: 'Look at the tree',
    look: [
      'An old oak, knotted and leaning.',
      'A twisted tree. Its roots grip a stone like fingers.',
      'A tree with a hollow at its foot. You don’t look inside.',
    ],
  },
  dead: {
    prompt: 'Look at the dead tree',
    look: [
      'A dead tree, bare and grey. Beetles have written all over it under the bark.',
      'A dead tree. A strip of cloth is tied round it, faded to nothing.',
      'A dead tree, split by lightning long ago.',
    ],
  },
  stump: {
    prompt: 'Look at the stump',
    look: [
      'A stump, cut clean with a saw. Loggers, long ago.',
      'A stump. You count the rings and lose your place.',
    ],
  },
  log: { prompt: 'Look at the log', look: ['A fallen log, soft and full of beetles.'] },
  rock: {
    prompt: 'Look at the stone',
    look: ['A cold, dark stone, moss in its cracks.', 'A stone. Something has been rubbed off it.'],
  },
  shroom: {
    prompt: 'Look at the mushrooms',
    look: ['Pale mushrooms in a little ring.', 'Mushrooms, brown and slick. Best leave them.'],
  },
  fern: {
    prompt: 'Look at the brambles',
    look: ['Brambles, thick with thorns.', 'Brambles. A tuft of grey wool is caught on them.'],
  },
}

// --- the bounds ---------------------------------------------------------------------------------
//
// Everything walkable and every fence, with room round it.
{
  const xs: number[] = []
  const ys: number[] = []
  for (const line of LINES)
    if (line.walk)
      for (const [x, y] of line.pts) {
        xs.push(x)
        ys.push(y)
      }
  for (const lm of LANDMARKS) {
    for (const a of lm.areas) {
      xs.push(a.x0, a.x1)
      ys.push(a.y0, a.y1)
    }
    for (const p of lm.props) {
      xs.push(p.x)
      ys.push(p.y)
    }
  }
  const m = 30
  BOUNDS.x0 = Math.floor(Math.min(...xs)) - m
  BOUNDS.x1 = Math.ceil(Math.max(...xs)) + m
  BOUNDS.y0 = Math.floor(Math.min(...ys)) - m
  BOUNDS.y1 = 0
}
