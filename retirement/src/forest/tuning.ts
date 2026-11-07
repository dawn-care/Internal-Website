/*
 * Every number the forest is tuned by, in one place (FOREST.md marks them "tune"). Distances are
 * in tiles, times in milliseconds unless they say otherwise, speeds in tiles per second.
 *
 * The grounds' own size (how wide the outskirts are, how deep the treeline) is in
 * shared/grounds.ts, because the server needs it too.
 *
 * Dev builds: add `?forestfast` to the URL to shorten the point of no return and the collapse,
 * for testing.
 */

const FAST = import.meta.env.DEV && new URLSearchParams(location.search).has('forestfast')

// --- the outskirts (on the grounds) -----------------------------------------------------------

/**
 * The music fades out over the first part of the walk out and is silent from this far out (0–1)
 * all the way to the treeline, and in the forest: the long quiet walk is where the dread builds.
 */
export const MUSIC_SILENT_FROM = 0.55
/** Birdsong level at the treeline: it thins out with the music. */
export const BIRDS_AT_TREELINE = 0.12
/** The forest's cold wind starts to reach you this far out (0–1)... */
export const WIND_FROM = 0.6
/** ...and is this loud (of its level in the forest) at the treeline. */
export const WIND_AT_TREELINE = 0.4
/** How many steps the colour grade fades through across the outskirts. */
export const GRADE_STEPS = 10

// --- crossing over ----------------------------------------------------------------------------

/** How far into the forest you appear (from the edge of the treeline). */
export const ENTRY_IN = 2
/** No trees within this many tiles of where you came in, so you arrive in a little clearing. */
export const ENTRY_CLEARING = 4
/**
 * The way home: a strip of undergrowth this many tiles deep, behind where you came in. Walking
 * back down it (before you're lost) takes you home.
 */
export const BACK_STRIP = 3
/** How far back down the strip takes you out onto the grounds. */
export const EXIT_BACK = 2.4

// --- getting lost -----------------------------------------------------------------------------

/** Past this distance from where you came in, the way home stops existing. */
export const NO_RETURN = FAST ? 12 : 40
/** Lost for this long (without being brought home), you collapse and wake in the infirmary. */
export const COLLAPSE_MS = FAST ? 25_000 : 12 * 60_000
/**
 * The home's lights glow through the trees behind you, fainter as you go, and are gone at the
 * point of no return: the only sign you've passed it.
 */
export const HOME_GLOW_UNTIL = NO_RETURN

// --- the forest itself ------------------------------------------------------------------------

/** Chunks of forest are generated this many tiles square, as you walk. */
export const CHUNK = 16
/** Chunks kept around before far-away ones are dropped. */
export const MAX_CHUNKS = 90
/** Trees per tile near the edge, and how much denser it gets per tile of depth (capped). */
export const TREE_DENSITY = 0.065
export const TREE_DENSITY_PER_TILE = 0.0004
export const TREE_DENSITY_MAX = 0.12
/** Clearings: where the soft noise is above this, trees thin right out. */
export const CLEARING_ABOVE = 0.7
/** Winding open paths: where a second noise is within this of its middle. */
export const PATH_WIDTH = 0.045

/** Trees round you fade to this so you can always see yourself (and how far round you). */
export const SEE_THROUGH = 0.35
export const SEE_THROUGH_W = 2.4
export const SEE_THROUGH_H = 5.6

// --- darkness and light -----------------------------------------------------------------------

/** How dark it is outside your circle of light (0–1): at the entry, deep in, and extra at night. */
export const DARK_NEAR = 0.8
export const DARK_DEEP = 0.94
export const DARK_NIGHT = 0.05
/** Depth (tiles) at which it's as dark as it gets. */
export const DARK_FULL_AT = 70
/** Your circle of light, in tiles: at the entry, and deep in. */
export const LIGHT_NEAR = 6
export const LIGHT_DEEP = 3.6
/** Fog: how many drifting banks, and how thick at most. */
export const FOG_BANKS = 5
export const FOG_ALPHA = 0.13

// --- sound ------------------------------------------------------------------------------------

/** The forest's (synthesized) ambience volume. */
export const FOREST_AMBIENCE = 0.5
/** Fades on the way in and out. */
export const CROSS_FADE_MS = 2500
/** The low synthesized rumble layered under the pet's growl or hiss (of the clip's volume). */
export const PET_RUMBLE = 0.8
/** A twig snaps underfoot about this often (per step). */
export const TWIG_CHANCE = 0.06

// --- your pet at the treeline -----------------------------------------------------------------

/** Your pet won't go closer to the treeline than this (while you're further out than it is). */
export const PET_HOLD = 1.5
/** It growls or hisses when it's this close to the treeline anywhere along it... */
export const PET_WARN_EDGE = 2.8
/** ...or this close when it's near a gap (it reacts sooner near a gap)... */
export const PET_WARN_GAP_EDGE = 4.5
/** ...where "near" is within this many tiles of the gap. */
export const PET_GAP_NEAR = 7
/** At most this often. */
export const PET_WARN_COOLDOWN_MS = 20_000
/** How long the hackles-up warning lasts. */
export const PET_WARN_MS = 3800

// --- your family photo (stage 2) -----------------------------------------------------------

/** A reprint from Nurse Ada: free after this long (a game day), or straight away for coins. */
export const REPRINT_WAIT_MS = 24 * 60_000
export const REPRINT_COST = 40

// --- the collapse -----------------------------------------------------------------------------

/** Fading to black, holding on the black screen with its line, then waking. */
export const COLLAPSE_FADE_MS = 3000
export const COLLAPSE_HOLD_MS = 3500
