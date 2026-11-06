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
- src/maps.ts: the grounds (home, Community Kitchen, Community Garden with 12 plots, pond),
  the hallway (12 doors, Nurse Ada), and rooms (14×10, built from a player's furniture).
- src/art.ts (tiles, buildings, crops, furniture), src/people.ts (16×24 characters with an
  auto outline), src/game.ts (loop, movement, interaction, decorating, sync, rendering),
  src/ui.ts (HUD, hotbar, chat, Kitchen / Catalog / Wardrobe / Help panels),
  src/garden.ts (growth), src/audio.ts (synth sfx and the dialogue voice blip),
  src/intro.ts (Nurse Ada's introduction for new players: steps, hints, guide arrow targets;
  see COMMUNITY.md), src/portraits.ts (detailed dialogue portraits drawn from a Look).
- Look: the property is bright and saturated; `MOODS` in src/game.ts sets a colour grade per area
  (the forest will be drained and dark). Night is a multiply tint, not a grey overlay.

## Rules
- Crops grow in real time only while watered (WATER_MS per watering), computed from
  timestamps, so they grow while you're away and everyone sees the same plot.
- Day/night is a shared game clock (one day per 24 real minutes, from the timestamp), not
  the viewer's wall clock.
- Plot/door slot is assigned by the server (first free of MAX_SLOTS) and never trusted from
  the client. The game is client-authoritative for coins/inventory; the server only checks
  saves are well-formed (validateSave).

## Music and sound
- retirement/sounds holds source recordings as added (not used by the game directly).
  retirement/music and retirement/sfx hold the processed copies the game plays.
- Music: `scripts/normalize-music.sh <in> <out>` (ffmpeg: -18 LUFS, -1.5 dBTP, 4s fade in/out,
  128 kbps) into retirement/music. src/music.ts plays every file there (import.meta.glob) as a
  shuffled playlist with 5s crossfades and a 3s fade-in on start and resume. Starts on the first
  click/key (autoplay rules), pauses while the tab is hidden, has its own on/off toggle
  (localStorage), and setMusicLevel() for fading it down later. Original music files are no
  longer kept in the repo; to add a track, run the script on it into music/. No code change.
- Sound effects (src/soundscape.ts, files in retirement/sfx, all following "Sound: on/off"):
  - Footsteps: `step-<group>-<n>.mp3`, single steps cut from sounds/walking_on_*.mp3 and levelled
    to about -24 dB RMS (peaks under -1 dBFS, 4ms in / 60ms out, mono 96 kbps). Groups: grass,
    gravel, wood. Each surface maps to a group plus a pitch and level (SURFACES): grass; gravel
    (paths, dirt, sand); stone (plaza, gravel pitched up); wood (rooms); tile (hall linoleum, wood
    pitched up and quieter); rug (rugs and mats, muffled). Game.surfaceAt picks the surface. One
    step per foot landing (walk frames 1 and 3), random take with ±8% pitch and loudness; other
    players' steps play within 8 tiles, quieter with distance and panned.
  - Ambience: amb-*.mp3, two-pass loudnorm to -26 LUFS with 2s fades baked in; each loops by
    starting a new copy over the previous one's fade-out. Follows the shared game clock: dawn
    birds 5–8, day birds (chirping_birds_ambience) 8–19:30, crickets otherwise, 6s crossfades
    between them. Indoors plays at 18% (heard through the windows).
  - sounds/birds_chirping.mp3 isn't used yet.
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
