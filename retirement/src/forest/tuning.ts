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
export const DARK_NEAR = 0.72
export const DARK_DEEP = 0.9
export const DARK_NIGHT = 0.05
/** Depth (tiles) at which it's as dark as it gets. */
export const DARK_FULL_AT = 70
/** Your circle of light, in tiles: at the entry, and deep in. */
export const LIGHT_NEAR = 6
export const LIGHT_DEEP = 3.6
/** Fog: how many drifting banks, and how thick at most. */
export const FOG_BANKS = 9
export const FOG_ALPHA = 0.16

// --- sound ------------------------------------------------------------------------------------

/** The forest's (synthesized) ambience volume. */
export const FOREST_AMBIENCE = 0.5
/** Fades on the way in and out. */
export const CROSS_FADE_MS = 2500
/** The low synthesized rumble layered under the pet's growl or hiss (of the clip's volume). */
export const PET_RUMBLE = 0.8
/**
 * The drone beds (recordings, see CLAUDE.md): `amb-forest-deep` comes in from DEEP_BED_FROM deep
 * (0–1) and is full half the way on, at DEEP_BED; once you're lost `amb-forest-lost` takes over at
 * LOST_BED. Both duck to half as an encounter's dread builds.
 */
export const DEEP_BED_FROM = 0.15
export const DEEP_BED = 0.7
export const LOST_BED = 0.9
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

// --- encounters: the nurse and the family (stage 3) ------------------------------------------

/** The first person finds you this long after you come in (ms, random between the two)... */
export const ENCOUNTER_FIRST: [number, number] = FAST ? [6_000, 10_000] : [45_000, 90_000]
/** ...and the next ones this long after the last one ended (FOREST.md: every 1.5–4 minutes). */
export const ENCOUNTER_EVERY: [number, number] = FAST ? [12_000, 20_000] : [90_000, 240_000]
/** How likely someone is to be real at first, and the least likely it gets. (FOREST.md 60–65%) */
export const REAL_CHANCE = 0.63
export const REAL_CHANCE_MIN = 0.4
/** Fakes get more common the deeper you are (per tile) and the longer you're out (per minute). */
export const FAKE_PER_TILE = 0.0015
export const FAKE_PER_MINUTE = 0.01
/** How likely it is to be the nurse rather than one of your family. */
export const NURSE_CHANCE = 0.35
/**
 * A fake's wrong hair, cardigan or eye colour is at least this different from the real one
 * (a perceptual "redmean" distance, 0–765): any family, as long as it's obvious. Light against dark
 * brown is about 83; the near misses this rules out are pale grey against the lavender and blue
 * rinses (42–59) and the two brown eye colours (66). Eyes are only a few pixels, so they need more.
 */
export const TELL_COLOR_MIN = 80
export const TELL_EYE_MIN = 90
/** A fake shows this many tells (FOREST.md: one or two, never all). */
export const TELLS: [number, number] = [1, 2]
/** They appear this far from you (out in the dark) and walk up to this distance to talk. */
export const ENCOUNTER_SPAWN = 8
export const ENCOUNTER_TALK = 1.7
/** How fast people walk up to you, and lead you away. */
export const PERSON_SPEED = 2.2

// --- refusing a fake: the transformation and the chase ----------------------------------------

/** How many times you refuse before it comes for you (each one a stage further). */
export const FAKE_ASKS = 3
/** Your light shrinks to this much with each stage of the transformation (stage 0 is 1). */
export const STAGE_LIGHT = [1, 0.85, 0.7, 0.55]
/** Its dialogue types this much slower per stage, with a lower, rougher voice. */
export const STAGE_TYPE_MS = [24, 40, 62, 90]
export const STAGE_PITCH = [1, 0.8, 0.62, 0.45]
/**
 * Voices in the forest are louder than at home (over the wind and the drone), and low ones louder
 * still (small speakers barely play low notes): up to VOICE_LOW_BOOST times as loud by the time a
 * voice is down at VOICE_FLOOR Hz, which is as low as one goes.
 */
export const FOREST_VOICE = 2.2
export const VOICE_LOW_BOOST = 2.2
export const VOICE_FLOOR = 90
/** Each blip lasts a little longer as a fake's typing slows (s, per stage). */
export const STAGE_VOICE_S = [0.045, 0.055, 0.07, 0.09]
/** It stands still this long (ms) before it comes for you. Slow dread, no jumpscare. */
export const CHASE_PAUSE_MS = 1000
/** Faster than your walk (3.3), slower than your hurry (5.2), and it never tires. */
export const CHASE_SPEED = 3.8
/** It loses you once you've stayed this far away in the dark for CHASE_LOSE_MS... */
export const CHASE_LOSE = 10
export const CHASE_LOSE_MS = 2000
/** ...or once it has chased you this long without catching you (it loses heart, ms). */
export const CHASE_GIVE_UP_MS = 20_000
/** ...and catches you this close. */
export const CHASE_CATCH = 0.7
/** Once you've lost it, the chance it comes back later in the same trip, and when. */
export const RETURN_CHANCE = 0.35
export const RETURN_AFTER: [number, number] = FAST ? [8_000, 12_000] : [60_000, 150_000]
/**
 * During the chase your light flares back up to this much (stage 3 shrinks it to 0.55), so you can
 * see where you're running.
 */
export const CHASE_LIGHT = 0.85
/** It's drawn faintly even out in the dark beyond your light, this visible far off and close. */
export const CHASE_SEEN = [0.3, 0.75]
/**
 * Dread builds before the chase, not only during it: the chase's sound and the red edge come in
 * at this level at each stage of the transformation (0 before any refusal), stand at PAUSE_DREAD
 * while it stands still, and start the chase at CHASE_DREAD (rising to 1 as it closes in).
 */
export const STAGE_DREAD = [0, 0.15, 0.28, 0.42]
export const PAUSE_DREAD = 0.5
export const CHASE_DREAD = 0.55
/** The forest's wind drops away as dread builds (to this much at most): it holds its breath. */
export const DREAD_HUSH = 0.75
/** A slow rising swell of sound as each refusal changes it (volume). */
export const SWELL = 0.6

/** Your light gutters while it chases you: shrinking by up to this much, unevenly, as it closes. */
export const CHASE_FLICKER = 0.12
/** The edge of the screen darkens to red as it closes in, at most this much. */
export const CHASE_VIGNETTE = 0.6
/** How loud the chase's heartbeat and drone get at their closest (of full). */
export const CHASE_SOUND = 1

/** Following a fake: how long it leads you deeper (ms) before it's too late. */
export const LED_MS = 5_500

// --- stamina ----------------------------------------------------------------------------------

/** Hurrying (Shift) drains it, walking or standing refills it (per second, of a full bar). */
export const STAMINA_DRAIN = 0.11
export const STAMINA_WALK = 0.08
export const STAMINA_REST = 0.14
/** Below this you're too tired to hurry until it's refilled a little. */
export const STAMINA_SPENT = 0.02
export const STAMINA_AGAIN = 0.25

// --- looking at the photo ---------------------------------------------------------------------

/**
 * Holding the photo up to your light: it shrinks to this much (and flickers) while you look. They
 * wait, real or fake, for as long as you like.
 */
export const LOOK_LIGHT = 0.6

// --- threats: things that can catch you between encounters ------------------------------------
//
// Each has a cue you can learn, and some cues are false alarms, so none can be ignored. Get it
// right and nothing happens; get it a bit wrong and it costs you (light, stamina); get it badly
// wrong and you're caught.

/** The first threat comes this long into a trip (ms), then the next this long after the last. */
export const THREAT_FIRST: [number, number] = FAST ? [5_000, 8_000] : [25_000, 50_000]
export const THREAT_EVERY: [number, number] = FAST ? [10_000, 16_000] : [30_000, 70_000]
/** Deeper and lost, they come more often: the gap shrinks to this much at most. */
export const THREAT_DEEP_FASTER = 0.5
/** The chance a cue is only a cue (nothing is there). */
export const FALSE_ALARM = 0.35

/** Footsteps behind you: rule, turn round. They're this far behind (tiles), closing as it nears. */
export const STALK_FAR = 6
export const STALK_NEAR = 1.2
/** Not facing it, it takes this long (s) to reach you; the arm comes into your light from... */
export const STALK_S = 9
/** ...this far along (0–1). Turning round once the arm is in sight costs you your breath. */
export const ARM_FROM = 0.42
/** Out in the dark beyond your light, only this faint a trace of the arm shows (it's in full once in
 * your light). */
export const ARM_SEEN_IN_DARK = 0.18
/** Turning to face it counts if you face within this of its way (cosine: 0.5 is ±60°). */
export const FACE_DOT = 0.5
/** Its steps fall this long (s) after yours, and it takes this many more after you stop. */
export const STALK_LAG = 0.22
export const STALK_EXTRA_STEPS = 1
/** A false alarm's footsteps just stop after this long (s). */
export const STALK_FALSE_S = 6

/** The eyes: rule, never walk towards them. They open this far beyond the edge of your light... */
export const EYES_BEYOND = 3
/** ...stay open this long (ms) if left alone, then close. */
export const EYES_MS = 12_000
/** Walk this much closer and it takes some of your light; come within this many tiles and it has you. */
export const EYES_APPROACH = 1.5
export const EYES_CATCH = 2.2
/** Back away this far and they close. */
export const EYES_RETREAT = 2

/** How strongly the face shows in the dark (it's dim greys, drawn at this much on top). */
export const FACE_ALPHA = 0.5
/** The tall dark shape it belongs to, drawn this faintly round the face (only just lighter than the
 * night). */
export const FIGURE_ALPHA = 0.75
/** The smaller harms: your light shrinks by this much for the rest of the trip (each time)... */
export const LIGHT_TAKEN = 0.18
/** ...but never below this much of what it was. */
export const LIGHT_LEAST = 0.45

// --- being caught ------------------------------------------------------------------------------

/**
 * When something catches you: the grab, then a jumpscare (a random image filling the screen and a
 * random scream, from retirement/scares, as in /game) for this long (ms), then the black screen and
 * its line.
 */
export const SCARE_MS = 3000
/** Before it, the grab (ms): your light collapses to nothing while the screen shakes, with a heavy
 * hit and the crack of bones. Then the jumpscare. */
export const CAUGHT_GRAB_MS = 1000
/** How far the screen shakes at the start of the grab (px, fading to nothing). */
export const CAUGHT_SHAKE = 3

// --- the collapse -----------------------------------------------------------------------------

/** Fading to black, holding on the black screen with its line, then waking. */
export const COLLAPSE_FADE_MS = 3000
export const COLLAPSE_HOLD_MS = 3500
