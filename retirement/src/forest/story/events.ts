/*
 * Uncanny moments (FOREST.md "Small decisions", the harmless kind): things that happen round you
 * between the finds, with nothing behind them. They're there to keep the forest unsettling without
 * a threat every minute: the danger itself is rare now (story/plan.ts, threats.ts).
 *
 * They speak for themselves: no commentary at all. ("Something feels... off." is kept for when
 * something really is: game.ts `feelsOff`.)
 *
 * Each has a `cue` (what the game does: a sound, a light, the forest going silent, footprints) that
 * src/game.ts carries out, and lines the inner voice might say about it (silence is allowed: `say`
 * is a chance). `depth` is how far in it can happen, `weight` how often it's picked.
 */

export type EventCue =
  /** Everything goes silent for a while: the wind, the creaks, the drones. */
  | 'hush'
  /** Your name, called from far off (a garbled voice, panned to one side). */
  | 'name'
  /** A twig snaps somewhere to the side. */
  | 'twig'
  /** A warm light between the trees ahead, which goes out as you notice it. */
  | 'light'
  /** Footprints in the litter beside you, going the way you're going, in shoes like yours. */
  | 'prints'
  /** A few notes of a music box, drifting. */
  | 'musicbox'
  /** Three knocks on wood. */
  | 'knock'
  /** The fog thickens round you for a while. */
  | 'fog'

export interface ForestEvent {
  id: string
  cue: EventCue
  voice: string[]
  /** Chance the voice says anything. */
  say: number
  depth: [number, number]
  weight: number
}

export const EVENTS: ForestEvent[] = [
  {
    id: 'silence',
    cue: 'hush',
    voice: [],
    say: 0,
    depth: [6, 999],
    weight: 3,
  },
  {
    id: 'name',
    cue: 'name',
    voice: [],
    say: 0,
    depth: [16, 999],
    weight: 2,
  },
  {
    id: 'twig',
    cue: 'twig',
    voice: [],
    say: 0,
    depth: [4, 999],
    weight: 3,
  },
  {
    id: 'light',
    cue: 'light',
    voice: [],
    say: 0,
    depth: [12, 999],
    weight: 2,
  },
  {
    id: 'prints',
    cue: 'prints',
    voice: [],
    say: 0,
    depth: [10, 999],
    weight: 2,
  },
  {
    id: 'musicbox',
    cue: 'musicbox',
    voice: [],
    say: 0,
    depth: [20, 999],
    weight: 1,
  },
  {
    id: 'knock',
    cue: 'knock',
    voice: [],
    say: 0,
    depth: [14, 999],
    weight: 2,
  },
  {
    id: 'fog',
    cue: 'fog',
    voice: [],
    say: 0,
    depth: [8, 999],
    weight: 2,
  },
]

/** A random event for a depth (never `avoid`, the last one). */
export function pickEvent(depth: number, avoid?: string): ForestEvent | null {
  const ok = EVENTS.filter((e) => e.id !== avoid && depth >= e.depth[0] && depth <= e.depth[1])
  const total = ok.reduce((n, e) => n + e.weight, 0)
  let r = Math.random() * total
  for (const e of ok) if ((r -= e.weight) < 0) return e
  return ok[0] ?? null
}
