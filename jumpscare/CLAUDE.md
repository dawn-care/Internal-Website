# Jumpscare (/game)

Standalone game, unrelated to D.A.W.N. The root CLAUDE.md covers how it's built and served;
this file is the map of the game itself. README.md has the player-facing description.

## Run and test it
- `npm run dev:game` from the site root serves localhost:5173/game/.
- localhost:5173/game/#house skips the trivia (dev only). The hash is read once at load, so
  reload after changing it. The trivia API rate-limits to one request per 5 seconds.
- In dev, `window.__house` exposes { player, head, pale, giant, world, openDoor }. Teleport
  with `__house.player.x = 22`, open a door with `__house.openDoor("2")`, freeze the pale thing
  with `Object.assign(__house.pale, { boredUntil: 1e9, restUntil: 1e9 })`.
- Game time only advances per animation frame (capped at 0.05s), so in a hidden or throttled
  browser pane everything runs slowly, including the 3-second fade in. Screenshots right after
  a load or a jumpscare can be nearly black; wait before trusting them.
- `npx tsc -b` type-checks it. It isn't linted.

## The route through the game
Backtracking by design, like Resident Evil 2. Every riddle can be found before its answer.
1. Painting a (Ashton), in the room you wake up in, answers door 1.
2. Door 1 (corridor's north wall) opens onto stairs down to the basement. The floating head
   lives there, and so does painting f (Thanatos).
3. Door 2 (corridor's east end) opens the east wing, where the pale thing lives. Painting k there
   hints how to survive it, and painting j (Minnow), in the far south-east room, answers door 3.
4. Door 3, the double door in the south-west room's south wall, leads outside to the giant, which
   is the current ending. It looks unsolvable until you've seen painting j, but nothing enforces
   that: the riddle's answer simply isn't known yet.

## Where things live (jumpscare/src/house)
- story.ts: memories, riddles and accepted answers.
- map.ts: the character grid and its key. LAYOUT is house, then outside, then basement. The
  basement isn't connected to anything except by world.stairs, so nothing can follow you between
  floors, and `world.basementTop` is the row where it starts. Keep every row the same width.
- game.ts: the loop and everything that moves. Tuning constants are at the top, grouped by
  entity (HEAD_*, PALE_*, GIANT_*).
- raycaster.ts: rendering. An open door has no geometry: `world.openDoors` makes the side walls
  of its empty cell draw with the door's texture, so it looks swung flat against the frame.
- textures.ts: everything is drawn on a canvas at startup. Texture alpha 0 is see-through, 255 is
  lit normally, and anything between glows (never darker than alpha / 255), which is how the
  pale thing's eyes show in the dark. New cell ids go before WRITING.
- ../audio.ts: all sound except the jumpscare files in sounds/ is synthesized with Web Audio.

## Conventions
- No new dependencies and no image files for textures.
- The source files use CRLF line endings, so multi-line find-and-replace has to allow for that.
- `hear()` in game.ts mutes anything on a different floor. Use it for any new placed sound.
