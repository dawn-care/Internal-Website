# Sunset Acres (/retirement)

A shared, Stardew-style pixel game about life in a nursing home, unrelated to D.A.W.N.
Plain TypeScript + canvas, no React, no new dependencies, no image files (all art is drawn in
code). Built by vite.retirement.config.ts into dist/retirement; `npm run dev:retirement`
serves it alone at localhost:5173/retirement/ in offline mode (localStorage save, two fake
neighbours who wander and chat, see src/net.ts LocalNet).

The forest beyond the grounds is designed but not built yet: FOREST.md records every decision
(alone in the forest, no combat, real vs fake nurses and family, run-only chases, story notes
kept only on a safe return, the draft Hollow Pines story). Read it before
working on the forest and keep it current.
COMMUNITY.md lists the agreed cozy additions (intro, pets, animals, benches, board games,
plot upgrades, Chef Rosa's orders, collectibles), also not built yet.

## Layout
- shared/catalog.ts: crops, furniture, wallpapers, floors, look options, sizes. Pure data,
  also imported by the server to validate saves.
- shared/schema.ts: Save / Profile / presence / chat types, newSave, validateSave.
- src/maps.ts: the grounds (home, Community Kitchen, Community Garden with 12 plots, pond,
  the henhouse in the north-west corner),
  the hallway (12 doors, Nurse Ada), and rooms (14×10, built from a player's furniture).
- src/art.ts (tiles, buildings, crops, furniture), src/people.ts (16×24 characters with an
  auto outline), src/game.ts (loop, movement, interaction, decorating, sync, rendering),
  src/ui.ts (HUD, hotbar, chat, Kitchen / Catalog / Wardrobe / Help panels),
  src/garden.ts (growth), src/audio.ts (synth sfx and the dialogue voice blip),
  src/intro.ts (Nurse Ada's introduction for new players: steps, hints, guide arrow targets;
  see COMMUNITY.md), src/portraits.ts (detailed dialogue portraits drawn from a Look),
  src/pets.ts (dog and cat sprites, the Follower that trails an owner, daily-care helpers),
  src/animals.ts (hens and eggs, ducks, squirrels, butterflies, fireflies, Mittens the house cat;
  positions from the game clock), src/clock.ts (the shared game clock).
- Look: the property is bright and saturated; `MOODS` in src/game.ts sets a colour grade per area
  (the forest will be drained and dark). Night is a multiply tint, not a grey overlay.

## Rules
- Crops grow in real time only while watered (WATER_MS per watering), computed from
  timestamps, so they grow while you're away and everyone sees the same plot.
- Day/night is a shared game clock (one day per 24 real minutes, from the timestamp), not
  the viewer's wall clock.
- Eggs: each hen lays once per game day at LAY_HOUR; each player collects their own share
  (save.coop records the egg day and how many were taken).
- Plot/door slot is assigned by the server (first free of MAX_SLOTS) and never trusted from
  the client. The game is client-authoritative for coins/inventory; the server only checks
  saves are well-formed (validateSave).

## Music and sound
- retirement/sounds holds source recordings as added (not used by the game directly).
  retirement/music and retirement/sfx hold the processed copies the game plays.
- Music: `scripts/normalize-music.sh <in> <out>` (ffmpeg: -18 LUFS, -1.5 dBTP, 4s fade in/out,
  128 kbps) into retirement/music. src/music.ts plays every file there (import.meta.glob) as a
  shuffled playlist with about 30 seconds of silence between tracks (GAP_MS; each file's own
  fade-out ends it) and a 3s fade-in on start and resume. Starts on the first
  click/key (autoplay rules), pauses while the tab is hidden, has its own on/off toggle
  (localStorage), and setMusicLevel() for fading it down later. Original music files are no
  longer kept in the repo; to add a track, run the script on it into music/. No code change.
- Sound effects (src/soundscape.ts, files in retirement/sfx, all following "Sound: on/off"):
  - `scripts/cut-sfx.sh <in> <out> <start> <duration> [fade-out-ms] [mean-dB]` cuts a clip out of
    a recording and levels it (mono 44.1 kHz 96 kbps, 4ms fade in, mean -24 dB by default, peaks
    under -1 dBFS). Use it for new footsteps and one-shot sounds.
  - Footsteps: `step-<group>-<n>.mp3`, single steps cut from sounds/walking_on_*.mp3 and levelled
    to about -24 dB RMS (peaks under -1 dBFS, 4ms in / 60ms out, mono 96 kbps). Groups: grass,
    gravel, wood, stone (six steps from walking_on_stone, 80ms out). Each surface maps to a group
    plus a pitch and level (SURFACES): grass; gravel (paths, dirt, sand); stone (plaza); wood
    (rooms); tile (hall linoleum, wood pitched up and quieter); rug (rugs and mats, muffled).
    STEP_VOLUME sets them all (0.24). Game.surfaceAt picks the surface. One
    step per foot landing (walk frames 1 and 3), random take with ±8% pitch and loudness; other
    players' steps play within 8 tiles, quieter with distance and panned.
  - Ambience: amb-*.mp3, two-pass loudnorm to -26 LUFS with 2s fades baked in; each loops by
    starting a new copy over the previous one's fade-out. Follows the shared game clock: dawn
    birds 5–8, day birds (chirping_birds_ambience) 8–19:30, crickets otherwise, 6s crossfades
    between them. Indoors plays at 18% (heard through the windows).
  - Pets: `pet-bark` (dog_bark, both woofs), `pet-whine` (dog_whining 0.28–2.14s), `pet-pant`
    (dog_panting 0.15–1.4s, 300ms fade), `pet-meow` (cat_meow), `pet-purr` (cat_purring 1.5–4.5s), cut with
    cut-sfx.sh at -20/-22 dB mean. src/soundscape.ts `petSound()` plays them a touch higher or
    lower each time. Dogs pant and cats purr when petted (half volume when asleep); a bark or meow
    for a treat, a gift, adoption and coming out of the front door to find you; a whine (dog) or
    meow (cat) when begging for a treat you can't give. The treat crunch is still synthesized.
  - Animals: `hen-cluck-1..4` (chicken_clucking 0–2, 4.2–6.2, 8–10, 10.9–12.9s), `duck-quack-1..3`
    (multiple_ducks_quacking_in_pond 0.3, 4.6, 6.9s, 2.2s each), `duck-quack-4` (single_duck_quack),
    `rooster` (rooster_call 0.3–2.75s), `squirrel-chitter` (squirrel_chittering 0.1–1.5s), cut with
    cut-sfx.sh at -22 dB mean (rooster -20). `playClip()` in src/soundscape.ts plays any one-shot
    (a random take, never the same twice running, panned); Wildlife.sounds() in src/animals.ts
    schedules them: hens cluck every 4–10s while out (heard within 14 tiles of the run), ducks
    quack every 5–11s by day (within 16 tiles of the mother duck), the rooster crows once as the
    hens come out at 6 am (carries across the grounds, at least 35% volume; faint indoors), a
    squirrel chitters as it darts up its tree, and the hens cluck when you take their eggs.
  - sounds/birds_chirping.mp3, walking_on_dirt.mp3 and walking_on_leaves.mp3 aren't used yet
    (dirt could replace pitched gravel on the garden paths; leaves are for the forest).
  - To add footsteps for a new surface (e.g. the forest), cut single steps into
    `step-<group>-<n>.mp3` and add the surface to SURFACES.

## Server: api/retirement.ts (one function)
- GET /retirement → the page (signed-in) or a sign-in page. GET ?op=me, GET ?op=world,
  POST ?op=save, POST ?op=sync (presence + chat, ~1/s per player, 5s when the tab is hidden).
- Storage in api/_lib/retirement/store.ts: Upstash Redis over REST when KV_REST_API_URL +
  KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*) are set; otherwise saves in private Blob
  (retirement/saves/<login>.json) and presence/chat in function memory (players on
  different instances may not see each other).
- Chat: ≤140 chars, cleaned server-side, 1 message per 1.2s per player, last 50 kept.
