import type { ClueId } from '../../../shared/story'

/*
 * Hollow Pines: the forest's fixed map (FOREST.md "The map"). The same every trip, so it's a place
 * you learn: the old Route 9 road runs north from the gap in the treeline to the forestry camp,
 * with footpaths off it to a ruined house plot and a picnic ground, and a creek across it. The
 * woods between are generated (gen.ts), the same every time; off the paths the trees close in,
 * and wander too far from them and you're lost (the forest stops being this map at all).
 *
 * Coordinates are tiles, with the gap you came in by at (0, 0) and the forest to the north
 * (y negative). Everything here is data: lines (road, paths, creek), clearings, props (drawn in
 * story/art.ts) and spots (things to examine: a line of description and maybe a thought, or a
 * clue). Write more here; the engine doesn't need to change.
 */

export type Pt = [number, number]

/** Ground kinds the map can lay down (drawn in forest/art.ts). */
export type MapGround = 'road' | 'path' | 'water' | 'plank' | 'stone' | 'wild' | 'yard'

export interface Line {
  ground: MapGround
  /** Width across (tiles). */
  width: number
  pts: Pt[]
  /** Walkable (paths, road) or not (the creek). Walkable lines keep you from being lost. */
  walk: boolean
}

export interface Area {
  ground?: MapGround
  /** Inclusive tile rectangle. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Counts as "on the paths" (you're never lost standing here). */
  walk?: boolean
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
  /** ...and what it looks like once you have. */
  lookAfter?: string
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

/** The map's extent: outside it there's only forest, and you're lost. */
export const BOUNDS = { x0: -48, y0: -124, x1: 52, y1: 0 }

/** The forest's fixed seed: the woods between the paths look the same every trip. */
export const HOLLOW_SEED = 401_987

export const LINES: Line[] = [
  // Route 9: north from the gap, east along the bus stop, over the creek, up to the camp.
  {
    ground: 'road',
    width: 2.4,
    walk: true,
    pts: [
      [0.5, 2],
      [0.5, -16],
      [3.5, -21.5],
      [9, -23.5],
      [20, -23.5],
      [24, -27],
      [24.5, -44],
      [23, -58],
      [22, -78],
      [17, -90],
      [13, -97],
    ],
  },
  // The footpath west to the house plot.
  {
    ground: 'path',
    width: 1.6,
    walk: true,
    pts: [
      [0.5, -11],
      [-5, -12.5],
      [-12, -13.5],
      [-17, -16],
    ],
  },
  // The footpath east to the picnic ground.
  {
    ground: 'path',
    width: 1.6,
    walk: true,
    pts: [
      [24.5, -36],
      [30, -37],
      [35, -39],
    ],
  },
  // A track west from the road past the old car, looping back to the creek's log crossing.
  {
    ground: 'path',
    width: 1.4,
    walk: true,
    pts: [
      [22.5, -68],
      [12, -66],
      [2, -60],
      [-6, -54],
      [-8, -46],
      [-4, -36],
      [0.5, -16],
    ],
  },
  // The creek, east to west across the whole map (the road crosses it on a bridge).
  {
    ground: 'water',
    width: 2.6,
    walk: false,
    pts: [
      [-50, -47],
      [-30, -50],
      [-14, -48],
      [0, -52],
      [14, -49],
      [30, -53],
      [54, -50],
    ],
  },
]

export const LANDMARKS: Landmark[] = [
  {
    id: 'trailhead',
    name: 'The trailhead',
    x: 0.5,
    y: -6,
    r: 5,
    seen: [],
    areas: [],
    props: [
      { id: 'roadsign', x: 3, y: -7 },
      { id: 'pole', x: -2, y: -14 },
    ],
    spots: [
      {
        x: 3,
        y: -7,
        prompt: 'Read the sign',
        look: 'A road sign, half swallowed by ivy: ROUTE 9 · HOLLOW PINES CAMP 1½ MI.',
      },
    ],
  },
  {
    id: 'busstop',
    name: 'The Route 9 bus stop',
    x: 11,
    y: -25,
    r: 7,
    seen: [],
    areas: [{ x0: 7, y0: -28, x1: 14, y1: -26, walk: true }],
    props: [
      { id: 'busstop', x: 10, y: -27 },
      { id: 'bussign', x: 9, y: -27 },
      { id: 'pole', x: 17, y: -27 },
    ],
    spots: [
      {
        x: 9,
        y: -27,
        prompt: 'Look at the sign',
        look: 'A bus stop sign, the paint flaking off it: ROUTE 9 · HOLLOW PINES CAMP.',
        voice: 'Hollow Pines. I’ve heard that name somewhere.',
      },
      { x: 10, y: -27, prompt: 'Read the timetable', clue: 'route9_timetable' },
      {
        x: 11,
        y: -27,
        prompt: 'Look at the bench',
        look: 'A wooden bench under the shelter. Someone has swept the needles off one end of it, recently.',
        voice: 'Someone sits here.',
      },
      { x: 12, y: -27, prompt: 'Read the note on the post', clue: 'bus_warning' },
    ],
  },
  {
    id: 'house',
    name: 'The house plot',
    x: -23,
    y: -20,
    r: 9,
    seen: [],
    areas: [
      { ground: 'wild', x0: -31, y0: -27, x1: -16, y1: -15, walk: true },
      { ground: 'stone', x0: -28, y0: -25, x1: -21, y1: -19 },
      { ground: 'path', x0: -17, y0: -17, x1: -14, y1: -15, walk: true },
    ],
    props: [
      { id: 'gatepost', x: -15, y: -17 },
      { id: 'letterbox', x: -13, y: -15 },
      { id: 'chimney', x: -23, y: -25 },
      { id: 'ruinwall', x: -28, y: -25, v: 0 },
      { id: 'ruinwall', x: -27, y: -25, v: 1 },
      { id: 'ruinwall', x: -26, y: -25, v: 2 },
      { id: 'ruinwall', x: -21, y: -25, v: 1 },
      { id: 'ruinwall', x: -28, y: -24, v: 2 },
      { id: 'ruinwall', x: -28, y: -22, v: 0 },
      { id: 'ruinwall', x: -28, y: -20, v: 1 },
      { id: 'ruinwall', x: -21, y: -23, v: 0 },
      { id: 'ruinwall', x: -21, y: -21, v: 2 },
      { id: 'steps', x: -25, y: -18 },
      { id: 'bed', x: -19, y: -24 },
      { id: 'bed', x: -19, y: -21, v: 1 },
      { id: 'fence', x: -31, y: -15 },
      { id: 'fence', x: -30, y: -15, v: 1 },
      { id: 'fence', x: -29, y: -15 },
      { id: 'fence', x: -20, y: -15, v: 1 },
      { id: 'fence', x: -19, y: -15 },
    ],
    spots: [
      {
        x: -15,
        y: -17,
        prompt: 'Look at the gatepost',
        look: 'A gatepost with a little enamel number screwed to it: 14. There’s no gate.',
        voice: 'Fourteen.',
      },
      { x: -13, y: -15, prompt: 'Open the letterbox', clue: 'evie_card' },
      {
        x: -23,
        y: -25,
        prompt: 'Look at the chimney',
        look: 'A brick chimney standing on its own. The house it belonged to is gone; the hearth is black with old soot.',
        voice: 'This was someone’s home.',
      },
      {
        x: -25,
        y: -18,
        prompt: 'Look at the steps',
        look: 'Stone steps up to where a front door used to be. A boot scraper, worn smooth.',
      },
      {
        x: -24,
        y: -21,
        prompt: 'Look at the floor',
        look: 'Under the leaves, floor tiles: blue and white, a pattern of little windmills.',
        voice: 'I know this floor.',
      },
      {
        x: -19,
        y: -24,
        prompt: 'Look at the garden beds',
        look: 'Raised beds, gone to seed. Tomato canes are still standing in one, tied up with old netting.',
        voice: 'Tomatoes. And netting.',
      },
      {
        x: -19,
        y: -21,
        prompt: 'Look at the garden beds',
        look: 'Raspberry canes, wild now, and a row of something that might once have been onions.',
      },
    ],
  },
  {
    id: 'picnic',
    name: 'The picnic ground',
    x: 38,
    y: -40,
    r: 8,
    seen: [],
    areas: [{ ground: 'wild', x0: 33, y0: -45, x1: 44, y1: -36, walk: true }],
    props: [
      { id: 'swings', x: 37, y: -43 },
      { id: 'table', x: 40, y: -38 },
      { id: 'bin', x: 35, y: -38 },
    ],
    spots: [
      {
        x: 38,
        y: -43,
        prompt: 'Look at the swings',
        look: 'A swing set with three swings. Two of them are moving.',
        voice: 'There’s no wind.',
      },
      {
        x: 40,
        y: -38,
        prompt: 'Look at the table',
        look: 'A picnic table, grey with age. Initials carved into the top: E.M. — and a second set, scratched out.',
        voice: 'E.M.',
      },
      {
        x: 35,
        y: -38,
        prompt: 'Look in the bin',
        look: 'A rusted litter bin. Inside, a child’s red mitten, quite dry.',
        keep: 'mitten',
        lookAfter: 'A rusted litter bin. Empty.',
      },
    ],
  },
  {
    id: 'bridge',
    name: 'The bridge',
    x: 24,
    y: -51,
    r: 5,
    seen: [],
    areas: [],
    props: [],
    spots: [
      {
        x: 26,
        y: -53,
        prompt: 'Read the plate',
        look: 'A plate bolted to the bridge rail: WEIGHT LIMIT 3 TONS · HOLLOW PINES FORESTRY · 1961.',
      },
    ],
  },
  {
    id: 'car',
    name: 'The car',
    x: 16,
    y: -68,
    r: 6,
    seen: [],
    areas: [{ x0: 14, y0: -70, x1: 19, y1: -66, walk: true }],
    props: [{ id: 'car', x: 15, y: -69 }],
    spots: [
      {
        x: 16,
        y: -69,
        prompt: 'Look in the car',
        look: 'A car nose-down in the ditch, ferns growing through the seats. The keys are still in it. The tax disc in the window says 1987.',
        voice: '1987.',
      },
    ],
  },
  {
    id: 'camp',
    name: 'Hollow Pines Camp',
    x: 12,
    y: -106,
    r: 12,
    seen: [],
    areas: [{ ground: 'yard', x0: -1, y0: -117, x1: 27, y1: -97, walk: true }],
    props: [
      { id: 'campsign', x: 10, y: -97 },
      { id: 'bunk', x: 1, y: -104 },
      { id: 'bunk', x: 1, y: -111, v: 1 },
      { id: 'office', x: 17, y: -110 },
      { id: 'flagpole', x: 13, y: -105 },
      { id: 'truck', x: 20, y: -101 },
      { id: 'fence', x: 7, y: -97 },
      { id: 'fence', x: 8, y: -97, v: 1 },
      { id: 'fence', x: 9, y: -97 },
      { id: 'fence', x: 16, y: -97, v: 1 },
      { id: 'fence', x: 17, y: -97 },
      { id: 'fence', x: 18, y: -97, v: 1 },
    ],
    spots: [
      {
        x: 10,
        y: -97,
        prompt: 'Read the sign',
        look: 'A board over the gate: HOLLOW PINES FORESTRY CAMP · EST. 1952. Below it, smaller: ALL VISITORS REPORT TO THE OFFICE.',
        voice: 'This is where the bus went.',
      },
      {
        x: 19,
        y: -110,
        prompt: 'Try the office door',
        look: 'The field office. The door is locked, and the windows are boarded up from the inside.',
      },
      {
        x: 3,
        y: -104,
        prompt: 'Look through the window',
        look: 'Through a broken window: rows of bunks, every one neatly made, the blankets folded back.',
      },
      {
        x: 3,
        y: -111,
        prompt: 'Look through the window',
        look: 'This bunkhouse is empty: no beds, no floor. Just dark, a long way down.',
        voice: 'I’m not going in there.',
      },
      {
        x: 13,
        y: -105,
        prompt: 'Look at the flagpole',
        look: 'A flagpole with no flag. The rope taps against it, slow and steady, though there’s no wind.',
      },
      {
        x: 21,
        y: -101,
        prompt: 'Look in the truck',
        look: 'A forestry truck on flat tyres. On the dash, a clipboard: a list of names, every one crossed out but one, too faded to read.',
      },
    ],
  },
]

/** Trail markers where the paths meet (a short post with a white band, a little board). */
LANDMARKS.push({
  id: 'markers',
  name: 'Trail markers',
  x: 0,
  y: 0,
  r: 0,
  seen: [],
  areas: [],
  props: [
    { id: 'waymark', x: 2, y: -10 },
    { id: 'waymark', x: -2, y: -17, v: 1 },
    { id: 'waymark', x: 22, y: -35 },
    { id: 'waymark', x: 24, y: -70, v: 1 },
  ],
  spots: [
    {
      x: 2,
      y: -10,
      prompt: 'Read the trail marker',
      look: 'A trail marker: a short post with a white band painted round it. One little board points up the road: CAMP 1½ MI. The other points west down the footpath and just says PRIVATE.',
    },
    {
      x: -2,
      y: -17,
      prompt: 'Read the trail marker',
      look: 'A trail marker. Its board points north-west along the track: MILL TRACK.',
    },
    {
      x: 22,
      y: -35,
      prompt: 'Read the trail marker',
      look: 'A trail marker. PICNIC AREA, pointing east. Someone has added, in pencil: CLOSED.',
    },
    {
      x: 24,
      y: -70,
      prompt: 'Read the trail marker',
      look: 'A trail marker. The board that pointed west has been snapped off. The one pointing north says CAMP.',
    },
  ],
})

/** Poles along the road, every so often (the wires long gone). */
export const ROAD_POLES: Pt[] = [
  [-2, -30],
  [27, -34],
  [27, -62],
  [20, -84],
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
  letterbox: { prompt: 'Open the letterbox', look: ['A rusted letterbox. Empty now.'] },
  gatepost: { prompt: 'Look at the gatepost', look: ['A gatepost with the number 14 on it.'] },
  chimney: { prompt: 'Look at the chimney', look: ['A chimney standing on its own.'] },
  ruinwall: {
    prompt: 'Look at the wall',
    look: [
      'What’s left of a wall: three courses of stone and some old mortar.',
      'A broken wall. Ivy has found every crack.',
      'There’s a scorch mark up this stone, very old.',
    ],
  },
  steps: { prompt: 'Look at the steps', look: ['Stone steps up to nothing.'] },
  bed: { prompt: 'Look at the garden bed', look: ['A raised bed, gone wild.'] },
  fence: {
    prompt: 'Look at the fence',
    look: [
      'A split-rail fence, half fallen.',
      'Fence posts, grey and soft with rot.',
      'One rail is new, or newer. Someone mended it.',
    ],
  },
  pole: {
    prompt: 'Look at the pole',
    look: [
      'A telegraph pole. The wires are long gone. A tin plate nailed to it reads HP 22.',
      'A telegraph pole. Someone has carved a little arrow into it, pointing north.',
      'A telegraph pole, leaning. The insulators are still on it, cracked.',
    ],
  },
  roadsign: { prompt: 'Read the sign', look: ['ROUTE 9 · HOLLOW PINES CAMP 1½ MI.'] },
  swings: { prompt: 'Look at the swings', look: ['Three swings. Two of them are moving.'] },
  table: { prompt: 'Look at the table', look: ['A picnic table, grey with age.'] },
  bin: { prompt: 'Look in the bin', look: ['A rusted litter bin.'] },
  car: { prompt: 'Look in the car', look: ['A car nose-down in the ditch.'] },
  truck: {
    prompt: 'Look at the truck',
    look: ['A forestry truck on flat tyres. HOLLOW PINES stencilled on the door.'],
  },
  bunk: {
    prompt: 'Look at the bunkhouse',
    look: [
      'A long plank bunkhouse. The door is shut and won’t open.',
      'Names scratched into the planks by the door, dozens of them. None you know.',
    ],
  },
  office: {
    prompt: 'Look at the office',
    look: ['FIELD OFFICE, on a little sign. It’s locked.'],
  },
  flagpole: { prompt: 'Look at the flagpole', look: ['A flagpole with no flag.'] },
  waymark: { prompt: 'Read the trail marker', look: ['A trail marker post.'] },
  campsign: { prompt: 'Read the sign', look: ['HOLLOW PINES FORESTRY CAMP · EST. 1952.'] },
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

// --- spreading it out -----------------------------------------------------------------------------
//
// Play-testing: things came too close together. Everything above is laid out at a compact scale
// and spread here by SPREAD: the lines' points and each landmark's position scale out from the
// trailhead (the road's x stays at the gap), and each landmark moves as a whole (by a whole number
// of tiles), so its own layout is unchanged. The bounds are worked out afterwards, with room
// round everything.

export const SPREAD = 1.6
const spread = (x: number, y: number): Pt => [0.5 + (x - 0.5) * SPREAD, y * SPREAD]

for (const line of LINES) line.pts = line.pts.map(([x, y]) => spread(x, y))
for (const lm of LANDMARKS) {
  if (lm.id === 'markers') {
    // Trail markers sit at junctions: each moves with its own junction.
    for (const it of [...lm.props, ...lm.spots]) {
      const [nx, ny] = spread(it.x, it.y)
      it.x = Math.round(nx)
      it.y = Math.round(ny)
    }
    continue
  }
  const [nx, ny] = spread(lm.x, lm.y)
  const dx = Math.round(nx - lm.x)
  const dy = Math.round(ny - lm.y)
  lm.x += dx
  lm.y += dy
  for (const a of lm.areas) {
    a.x0 += dx
    a.x1 += dx
    a.y0 += dy
    a.y1 += dy
  }
  for (const it of [...lm.props, ...lm.spots]) {
    it.x += dx
    it.y += dy
  }
}
// The road runs on through the camp's gate (between its two posts) into the yard.
{
  const sign = LANDMARKS.find((l) => l.id === 'camp')!.props.find((p) => p.id === 'campsign')!
  LINES[0].pts.push([sign.x + 3, sign.y - 1])
}
for (const p of ROAD_POLES) {
  const [nx, ny] = spread(p[0], p[1])
  p[0] = Math.round(nx)
  p[1] = Math.round(ny)
}
{
  const xs: number[] = []
  const ys: number[] = []
  for (const line of LINES)
    if (line.walk)
      for (const [x, y] of line.pts) {
        xs.push(x)
        ys.push(y)
      }
  for (const lm of LANDMARKS)
    for (const a of lm.areas) {
      xs.push(a.x0, a.x1)
      ys.push(a.y0, a.y1)
    }
  const m = 30
  BOUNDS.x0 = Math.floor(Math.min(...xs)) - m
  BOUNDS.x1 = Math.ceil(Math.max(...xs)) + m
  BOUNDS.y0 = Math.floor(Math.min(...ys)) - m
}
