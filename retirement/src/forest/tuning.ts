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

const FAST =
  import.meta.env.DEV &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('forestfast')

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

/**
 * Lost by leaving the paths (FOREST.md "The map"): this far from the nearest road, path or
 * clearing (tiles) a thought warns you, and this far the way home stops existing. On the paths you
 * can always walk back.
 */
export const OFF_PATH_WARN = FAST ? 3 : 6
export const OFF_PATH_LOST = FAST ? 6 : 13
/**
 * You're only lost once the path is out of sight (the lost distance grows to half the screen's
 * diagonal), but never further than this (tiles), however big the window: the camp's fences run far
 * enough out that going round them always gets you lost first (layout.test.ts checks this).
 */
export const OFF_PATH_LOST_MAX = 24
/**
 * Lost, walking back towards where the path was (this fraction of your steps heading that way, for
 * this long, ms): a thought ("That tree wasn't there before."), at most this often (ms).
 */
export const TURN_BACK_DOT = 0.6
export const TURN_BACK_MS = 2000
export const TURN_BACK_GAP_MS = 18_000
/** At most this many of those a trip. */
export const TURN_BACK_MAX = 2
/** Unprompted thoughts (the inner voice, not about something you looked at): at most one this
 * often (ms). Losing the path and turning back aren't held back. */
export const MUSE_GAP_MS = 60_000
/** How often a real threat starting brings "Something feels... off." (a gut feeling, not a rule). */
export const FEELS_OFF_CHANCE = 0.5
/**
 * Sitting down to wait while lost: time runs this much faster for everything that comes to you
 * (people, threats, uncanny moments, the collapse). Your eyes close after this long (ms), and a
 * thought comes this long into the wait.
 */
export const WAIT_FASTER = 3
export const WAIT_EYES_MS = 4000
export const WAIT_THOUGHT_MS = 20_000
/** The home's lights glow through the trees behind you, fainter as you go, gone this far in. */
export const HOME_GLOW_UNTIL = 40

// --- the forest itself ------------------------------------------------------------------------

/** Chunks of forest are generated this many tiles square, as you walk. */
export const CHUNK = 16
/** Chunks kept around before far-away ones are dropped. */
export const MAX_CHUNKS = 90
/** Trees per tile near the edge, and how much denser it gets per tile of depth (capped). */
export const TREE_DENSITY = 0.065
export const TREE_DENSITY_PER_TILE = 0.0004
export const TREE_DENSITY_MAX = 0.12
/** On the map (story/map.ts): trees per tile just off a path, and how much denser per tile further
 * off (up to TREE_DENSITY_MAX). Kept lighter than the lost forest, so the paths read. */
export const MAP_TREES_NEAR = 0.045
export const MAP_TREES_PER_TILE = 0.015
/** Clearings: where the soft noise is above this, trees thin right out. */
export const CLEARING_ABOVE = 0.7
/** Winding open paths: where a second noise is within this of its middle. */
export const PATH_WIDTH = 0.045

/** Trees round you fade to this so you can always see yourself (and how far round you). */
export const SEE_THROUGH = 0.35
export const SEE_THROUGH_W = 2.4
export const SEE_THROUGH_H = 5.6

// --- darkness and light -----------------------------------------------------------------------

/**
 * How dark it is outside your circle of light (0–1): at the entry, deep in, and extra at night.
 * (Lightened for the map: 0.72 / 0.9 hid the places you're meant to explore; night still adds.)
 */
export const DARK_NEAR = 0.58
export const DARK_DEEP = 0.82
export const DARK_NIGHT = 0.12
/**
 * On the map, how far along (0–1) from DARK_NEAR to DARK_DEEP it is, by how far in you are
 * (straight-line tiles from the gap): light at the trailhead, closing in past the fork (about 26
 * tiles in), the bus stop and the cabin, properly dark by the camp (about 125) and darkest on the
 * deep road beyond. Your light shrinks with it, the colour drains and the drone comes up.
 * (Play-testing: a flat 0.3 everywhere on the map made the forest feel tame.) Lost, it's at least
 * LOST_DEEP.
 */
export const MAP_DARK: [number, number][] = [
  [0, 0],
  [26, 0.2],
  [60, 0.4],
  [125, 0.6],
  [170, 0.8],
]
/** Lost, it's at least this far along (0–1) towards full dark... */
export const LOST_DEEP = 0.75
/** ...and the dark closes in over about this long (s): your light shrinks slowly, not at once. */
export const DEEP_EASE_S = 4
/** Depth (tiles) at which it's as dark as it gets (the camp is about 110 in). */
export const DARK_FULL_AT = 100
/** Your circle of light, in tiles: at the entry, and deep in. */
export const LIGHT_NEAR = 6.5
export const LIGHT_DEEP = 4.4
/** How much of the dark is lifted off the road and paths beyond your light (0–1), so you can see
 * where they go. */
export const PATH_GLOW = 0.2
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
export const ENCOUNTER_FIRST: [number, number] = FAST ? [6_000, 10_000] : [100_000, 180_000]
/** ...and the next ones this long after the last one ended (every 3–6 minutes since the turn to
 * exploration; it was 1.5–4). */
export const ENCOUNTER_EVERY: [number, number] = FAST ? [12_000, 20_000] : [180_000, 360_000]
/** Once you're lost, someone comes within this long (ms), then this often (play-testing: lost,
 * there's nothing to do but wait for someone). */
export const ENCOUNTER_LOST_FIRST: [number, number] = FAST ? [3_000, 5_000] : [12_000, 22_000]
/**
 * Lost, people don't walk straight up: a searcher stands off in the dark (at least CALL_NEAREST
 * tiles, at the edge of what you can see) with a torch, calling. A real one calls every CALL_EVERY
 * ms with a steady torch; a fake at odd intervals (CALL_EVERY_FAKE), its torch guttering, and
 * sometimes (CALL_WRONG_SIDE) from the wrong side. Come within CALL_COME tiles and they come to
 * you; otherwise they come anyway after CALL_WAIT ms (half that if you're sitting).
 */
export const CALL_NEAREST = 8
export const CALL_EVERY = 4500
export const CALL_EVERY_FAKE: [number, number] = [1800, 7000]
export const CALL_WRONG_SIDE = 0.35
export const CALL_COME = 5
export const CALL_WAIT = 30_000
export const ENCOUNTER_LOST_EVERY: [number, number] = FAST ? [8_000, 12_000] : [30_000, 55_000]
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
export const THREAT_FIRST: [number, number] = FAST ? [5_000, 8_000] : [90_000, 150_000]
export const THREAT_EVERY: [number, number] = FAST ? [10_000, 16_000] : [100_000, 200_000]
/** Deeper and lost, they come more often: the gap shrinks to this much at most. */
export const THREAT_DEEP_FASTER = 0.5
/** Once you're lost: the first threat comes within this long (ms), then this often. */
export const THREAT_LOST_FIRST: [number, number] = FAST ? [3_000, 5_000] : [20_000, 35_000]
export const THREAT_LOST_EVERY: [number, number] = FAST ? [8_000, 12_000] : [35_000, 60_000]
/** Getting lost adds this many real dangers to the trip's budget (DANGER_PER_TRIP). */
export const LOST_DANGER = 1
/** The chance a cue is only a cue (nothing is there). */
export const FALSE_ALARM = 0.35
/**
 * Real danger is rare (FOREST.md, after the turn to exploration): a trip has at most this many,
 * shared between the threats and a fake coming for you. After that every cue is only a cue, and
 * every fake you turn away just walks off.
 */
export const DANGER_PER_TRIP = 1
/** A fake you turn away stares at you for this long (ms) before it backs off, grinning. */
export const STARE_MS = 2600
/**
 * How strongly its grin (the teeth and the pinprick eyes) shows through the dark as it backs off
 * beyond your light (0–1): a smile hanging in the black after the rest of it has gone.
 */
export const GRIN_GLOW = 0.75
/**
 * Then it backs off into the dark, facing you, grinning, for up to this long (ms). Follow it
 * (closer than FOLLOW_NEAR tiles, walking after it, for FOLLOW_MS) and it stops, grows, turns
 * (TURN_MS) and lunges at LUNGE_SPEED (tiles/s): you're caught. Your own choice, so it isn't
 * limited by DANGER_PER_TRIP.
 */
export const FAKE_LEAVE_MS = 14_000
export const FOLLOW_NEAR = 5
export const FOLLOW_MS = 2500
export const TURN_MS = 900
export const LUNGE_SPEED = 9

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
/** Its steps fall this long (s) after yours, and it takes this many more after you stop. */
export const STALK_LAG = 0.22
export const STALK_EXTRA_STEPS = 1
/** A false alarm's footsteps just stop after this long (s). */
export const STALK_FALSE_S = 6

/**
 * The face in the dark: rule, keep away from it (never walk towards it). It opens this far beyond
 * the edge of your light...
 */
export const EYES_BEYOND = 3
/** ...and drifts towards you this fast (tiles/s): slow, but it doesn't stop. Stand still and it
 * reaches you in about 12 s. */
export const EYES_CREEP = 0.55
/** It gives up after this long (ms). */
export const EYES_MS = 20_000
/** Walk this far towards it and it takes some of your light; within this many tiles it has you. */
export const EYES_APPROACH = 1.5
export const EYES_CATCH = 2.2
/** Get this much further away than it started and it's lost you. */
export const EYES_RETREAT = 4
/** A false alarm creeps too, then just isn't there once it's this close. */
export const EYES_FALSE_NEAR = 4
/**
 * Its gasp (sfx/forest-gasp.mp3), over and over while it's there: every GASP_FAR ms when it has
 * just opened, every GASP_NEAR ms when it's nearly on you, and louder as it comes (GASP_QUIET of
 * full volume at first, rising to full).
 */
export const GASP_FAR = 4200
export const GASP_NEAR = 1500
export const GASP_QUIET = 0.15
/** How far the grin opens (px the jaw drops) when it's nearly on you. */
export const GRIN_DROP = 8

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

// --- the story: things to find, the inner voice, uncanny moments (Act I) -----------------------

/** Small look-only finds lying about each trip (random between the two), at the map's find spots. */
export const FINDS_PER_TRIP: [number, number] = [5, 8]
/** Clues glint faintly in the dark (within this many tiles), every so often (ms period). */
export const GLINT_NEAR = 12
export const GLINT_PERIOD = 2600

/** Thoughts: on screen this long (ms) plus this per character, and at least this far apart. */
export const THOUGHT_MS = 2400
export const THOUGHT_PER_CHAR = 45
export const THOUGHT_GAP_MS = 1500

/** Uncanny moments (story/events.ts): the first this long into a trip, then this far apart (ms). */
export const EVENT_FIRST: [number, number] = FAST ? [4_000, 8_000] : [20_000, 40_000]
export const EVENT_EVERY: [number, number] = FAST ? [8_000, 14_000] : [30_000, 90_000]
/** Lost, uncanny moments come this much more often (the gap is divided by it). */
export const EVENT_LOST_FASTER = 2.5
/** How long the hush and the thick fog last (ms). */
export const HUSH_MS = 7_000
export const FOG_MS = 14_000
/** Footprints laid beside you (how many, tiles apart). */
export const PRINTS = 9

/**
 * Lost: your 1987 self's lean-to (with the tin box of notes) is put out this long (ms) after you
 * get lost, this far off (tiles) the way you're facing, with your red marks on the trees every
 * SHELTER_MARK_EVERY tiles leading to it from just off-screen.
 */
export const SHELTER_AFTER = FAST ? 4_000 : 20_000
export const SHELTER_DIST = 26
export const SHELTER_MARK_EVERY = 4

/**
 * The Route 9 bus (story/bus.ts, PUZZLES.md P04). The forest still runs it on the old crew
 * timetable: at BUS_CREW_HOURS (on the shared game clock: a game hour is a real minute) a full bus
 * pulls in at the stop if you're within BUS_HEAR tiles, setting off BUS_CREW_LEAD_MS ahead so it
 * stops on the hour. Off the timetable, an empty one comes once you've been within BUS_NEAR tiles
 * of the stop for BUS_EMPTY_AFTER ms, never with a crew run less than BUS_EMPTY_QUIET_MS away and
 * never within BUS_EMPTY_GAP_MS of the last bus. Either waits BUS_WAIT_MS with its doors open.
 */
export const BUS_CREW_HOURS = [6, 14, 22] as const
export const BUS_HEAR = 26
export const BUS_NEAR = 9
export const BUS_CREW_LEAD_MS = 6_000
export const BUS_EMPTY_AFTER = FAST ? 4_000 : 20_000
export const BUS_EMPTY_QUIET_MS = 60_000
export const BUS_EMPTY_GAP_MS = 45_000
export const BUS_WAIT_MS = 25_000
/**
 * Lost: the copy of the bus stop is put out BUS_DIST tiles off to your side once you've been lost
 * BUS_AFTER ms, but only when the next crew run is BUS_COPY_SOON ms away (soon enough to wait for
 * it before you'd collapse), so a safe ride is always possible from it.
 */
export const BUS_AFTER = FAST ? 8_000 : 60_000
export const BUS_DIST = 24
export const BUS_COPY_SOON: [number, number] = [70_000, 170_000]
/**
 * The ride (story/ride.ts). A crew bus drives RIDE_CREW_MS and lets you off at the camp gate. The
 * empty one drives RIDE_EMPTY_MS, faster and faster, brakes for RIDE_BRAKE_MS and lets you off
 * BUS_DROP tiles from where you got on, lost: deep in, where the dark closes in to BUS_DEEP (and
 * stays, until someone finds you), with one more real danger this trip.
 */
export const RIDE_CREW_MS = 9_000
export const RIDE_EMPTY_MS = 10_000
export const RIDE_BRAKE_MS = 1_600
export const BUS_DROP = 70
export const BUS_DEEP = 0.92
/**
 * Deep in, after the empty bus: the colour drains almost to nothing (forestGrade's deepest), both
 * drones play at once, and the wind drops to this much of itself: the forest is holding its breath.
 */
export const BUS_DEEP_WIND = 0.3

// --- Nora (story/nora.ts; PUZZLES.md E_NORA_SIGHTING, E_NORA_MEET_1/2) ---------------------------

/** How often (per trip, until it's happened) she's on the trail ahead and runs. */
export const NORA_SIGHT_CHANCE = 0.5
/** Seconds in the courtyard before she turns up for the first meeting (sooner if you look at things). */
export const NORA_MEET_AFTER = 10

/** How often a grandchild's, niece's or nephew's face gives you pause as they reach you (encounters.ts FACE_DOUBT). */
export const FACE_DOUBT_CHANCE = 0.35

// --- the thing in the deep (thing.ts; FOREST.md "The thing in the deep") ----------------------

/** Its drift towards you (tiles/s): slow at first, THING_SPEED_RISE faster each minute out. */
export const THING_SPEED = 1
export const THING_SPEED_RISE = 0.25
export const THING_SPEED_MAX = 2.4
/** It notices you (and comes for you) this close, if you're not inside. */
export const THING_NOTICE = 8
/** Coming for you: faster than you walk (3.3), slower than you hurry (5.2). */
export const THING_CHASE_SPEED = 4.1
/** It has you this close. */
export const THING_CATCH = 0.8
/** It loses you once you've stayed this far off for THING_LOSE_MS, or gives up after the max. */
export const THING_LOSE = 12
export const THING_LOSE_MS = 2500
export const THING_CHASE_MAX_MS = 15_000
/** Having lost you (or waited at a door), it's gone this long, then back from this far off. */
export const THING_RETURN_MS = FAST ? 10_000 : 50_000
export const THING_RETREAT = 55
/** It waits this far from a door you went in by (a start on it when you come out)... */
export const THING_DOOR = 5
/** ...for this long, then drifts off. */
export const THING_WAIT_MS = 35_000
/** Its steps carry this far (tiles); your unease starts this far off. */
export const THING_HEAR = 26
export const THING_UNEASE_RANGE = 30
/** On the map it never comes south of this row (just north of the creek). */
export const THING_SOUTH = -76
/** Where it starts: up the deep road at the fork, or this far from you if that's closer. */
export const THING_START = { x: -2, y: -205 }
export const THING_START_MIN = 70
/** Lost, or let off the empty bus: it starts this far off (it's never far, out there). */
export const THING_LOST_START = 35
export const THING_BUS_START = 22

// --- unease and energy (the gauges beside stamina; FOREST.md) ------------------------------------

/** Unease follows what's wrong (0–1 a second): quick to rise, slow to settle. */
export const UNEASE_RISE = 0.6
export const UNEASE_FALL = 0.12
/** Energy drains this much a second on the map (a full bar lasts about 12 minutes)... */
export const ENERGY_DRAIN = FAST ? 1 / 90 : 1 / 720
/** ...this many times faster lost (about 5 minutes), hurrying, or very uneasy (over UNEASY)... */
export const ENERGY_LOST = 2.0
export const ENERGY_HURRY = 1.3
export const ENERGY_UNEASY = 1.4
export const UNEASY = 0.6
/** ...more slowly inside a building, and it comes back a little sitting down to wait. */
export const ENERGY_INDOORS = 0.6
export const ENERGY_SIT = 0.004
/** Below this, you feel it (a thought, once a trip). */
export const ENERGY_LOW = 0.2
/** Eating a meal from your pocket in the forest gives back this much energy. */
export const MEAL_ENERGY = 0.4

// --- your lantern, turned down (game.ts toggleLantern; FOREST.md "Your lantern") ----------------

/** With the lantern off, your light is only this (tiles): enough to see your feet. */
export const LANTERN_OFF_LIGHT = 1.4
/** How fast the light goes down or comes back up (0–1 a second). */
export const LANTERN_FADE = 4
/** The thing notices you only this close in the dark (THING_NOTICE with the lantern lit)... */
export const THING_NOTICE_DARK = 3.5
/** ...this much further if you're hurrying (it hears you)... */
export const THING_NOTICE_LOUD = 1.5
/** ...loses you this close (THING_LOSE lit), and hunts this much more slowly... */
export const THING_LOSE_DARK = 7
export const THING_DARK_SLOW = 0.75
/**
 * ...and can only guess where you are: it searches round where it last saw your light, a spot
 * THING_GUESS tiles from there at a time, and each new guess (every THING_GUESS_MS, or on reaching
 * the last) moves that centre only THING_GUESS_DRIFT of the way towards you. Hurrying, it hears
 * you: the centre jumps to you. Standing still, it notices you only THING_NOTICE_STILL as far.
 */
export const THING_GUESS: [number, number] = [2, 8]
export const THING_GUESS_DRIFT = 0.3
export const THING_GUESS_MS = 6000
export const THING_NOTICE_STILL = 0.7
/** In the dark the threats come this much sooner, and they're always the eyes. */
export const THREAT_DARK_FASTER = 2.5
/**
 * Eyes in the dark around you (only cues): the first opens this long (ms) after the light goes
 * down, then one every EYES_DARK_EVERY ms, up to EYES_DARK_MAX open at once (more the longer
 * you're dark: one more every EYES_DARK_GROW ms), each EYES_DARK_FAR tiles away, open for
 * EYES_DARK_LIFE ms. They close if you come within EYES_DARK_NEAR.
 */
export const EYES_DARK_FIRST = 2500
export const EYES_DARK_EVERY: [number, number] = [1200, 3500]
export const EYES_DARK_MAX = 9
export const EYES_DARK_GROW = 5000
export const EYES_DARK_FAR: [number, number] = [3.5, 9]
export const EYES_DARK_LIFE: [number, number] = [2500, 7000]
export const EYES_DARK_NEAR = 2.5
/** Your unease in the dark, from the eyes watching (at most). */
export const EYES_DARK_UNEASE = 0.35

// --- your lantern's beam (game.ts updateAim; FOREST.md "Your lantern") --------------------------

/** The beam reaches this many times your light's old radius, BEAM_SPREAD radians either side. */
export const BEAM_REACH = 1.7
export const BEAM_SPREAD = 0.42
/** Round you, lit, only this much light spills (tiles): enough to see what's next to you. */
export const BEAM_SPILL = 1.9
/** The left and right arrows turn it this fast (radians a second). */
export const BEAM_TURN = 2.8
/** With neither mouse nor arrows, it swings round to the way you're walking this fast (1/s). */
export const BEAM_FOLLOW = 7
/** Hold the beam on the arm this long (s) and it pulls back into the dark. */
export const STALK_SHINE_S = 0.45
