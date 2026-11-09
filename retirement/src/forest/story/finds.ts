import type { ClueId } from '../../../shared/story'

/*
 * Small things lying in the forest (FOREST.md "Exploring, examining and documenting"): look-only.
 * You examine them for a line of description and sometimes a thought; nothing goes in your notepad.
 * They make the forest feel walked through, by people from the home and from long before it.
 *
 * `onTree`: it's on a tree trunk (a tree is put there for it). `depth` is how far in it can turn up,
 * `weight` how often it's picked. Each is drawn in story/art.ts by id.
 */

export interface Find {
  id: FindId
  prompt: string
  look: string
  voice?: string
  onTree?: boolean
  depth: [number, number]
  weight: number
  /** You can pick it up and take it home (a keepsake: KEEPSAKES). */
  keep?: true
  /** It holds a clue (opened like any other: story/clues.ts). Never scattered at random. */
  clue?: ClueId
}

export type FindId =
  | 'slipper'
  | 'nametag'
  | 'wheel'
  | 'drawing'
  | 'bracelet'
  | 'glasses'
  | 'arrow'
  | 'teacup'
  | 'wool'
  | 'tray'
  | 'ticket'
  | 'tinbox'

export const FINDS: Find[] = [
  {
    id: 'slipper',
    prompt: 'Look at the slipper',
    look: 'A single slipper, the kind they give you at Sunset Acres. Damp, and full of pine needles.',
    depth: [4, 60],
    weight: 3,
  },
  {
    id: 'nametag',
    keep: true,
    prompt: 'Look at the name tag',
    look: 'A sun-bleached plastic name tag: HOLLOW PINES CAMP · STAFF. The name has been scratched off.',
    depth: [10, 80],
    weight: 2,
  },
  {
    id: 'wheel',
    prompt: 'Look at the wheel',
    look: 'A wheelchair wheel, half sunk in the moss. The spokes have rusted through.',
    depth: [8, 80],
    weight: 2,
  },
  {
    id: 'drawing',
    prompt: 'Look at the drawing',
    look: 'A child’s drawing, nailed to the bark: a house, a yellow sun, and a tall grey person standing in the trees. The paper has gone soft with rain.',
    onTree: true,
    depth: [10, 80],
    weight: 2,
  },
  {
    id: 'bracelet',
    prompt: 'Look at the bracelet',
    look: 'A hospital bracelet, snapped. The name has run in the wet. All you can read is “Room 1–”.',
    depth: [16, 90],
    weight: 1,
  },
  {
    id: 'glasses',
    keep: true,
    prompt: 'Look at the glasses',
    look: 'Reading glasses, folded neatly on the ground, as if someone meant to come back for them.',
    depth: [4, 70],
    weight: 2,
  },
  {
    id: 'arrow',
    prompt: 'Look at the mark',
    look: 'A red arrow painted on the bark. The paint is old and has run.',
    voice: 'Someone wanted to find their way back.',
    onTree: true,
    depth: [6, 90],
    weight: 2,
  },
  {
    id: 'teacup',
    keep: true,
    prompt: 'Look at the teacup',
    look: 'A china teacup on a flat stone, half full. It’s still warm.',
    depth: [12, 90],
    weight: 1,
  },
  {
    id: 'wool',
    prompt: 'Look at the wool',
    look: 'A ball of blue wool, unwound. The strand runs off between the trees into the dark.',
    voice: 'I’m not following that.',
    depth: [8, 80],
    weight: 2,
  },
  {
    id: 'tray',
    prompt: 'Look at the tray',
    look: 'A dinner tray from the Community Kitchen, the meal on it untouched and cold. The napkin is still folded.',
    depth: [6, 60],
    weight: 2,
  },
  {
    id: 'ticket',
    keep: true,
    prompt: 'Look at the ticket',
    look: 'A paper bus ticket. ROUTE 9 · SINGLE. It was never punched.',
    depth: [4, 50],
    weight: 2,
  },
]

/** Things put out on purpose, never scattered at random (weight 0). */
FINDS.push({
  id: 'tinbox',
  prompt: 'Open the tin box',
  look: 'A rusted biscuit tin.',
  clue: 'lost_journal',
  depth: [0, 999],
  weight: 0,
})

export const FIND_BY_ID = new Map(FINDS.map((f) => [f.id, f]))

/**
 * Keepsakes: odd things from the forest you can take home (FOREST.md "Keepsakes"). Carried with
 * your notepad and lost with it if you're caught; brought home safely, each becomes a little
 * framed piece in your room's storage (furniture `keep_<id>`, shared/catalog.ts) to hang where
 * you like. One of each.
 */
export const KEEPSAKES: Record<string, { name: string; took: string }> = {
  nametag: { name: 'Hollow Pines name tag', took: 'You put the name tag in your pocket.' },
  glasses: { name: 'Reading glasses', took: 'You fold the glasses carefully and keep them.' },
  teacup: { name: 'China teacup', took: 'You tip out the tea and take the cup.' },
  ticket: { name: 'Route 9 ticket', took: 'You tuck the ticket into your notepad.' },
  mitten: { name: 'A child’s red mitten', took: 'You take the mitten. It’s still warm inside.' },
}
