You're implementing "the forest" for Sunset Acres, a multiplayer pixel game in this repo under
retirement/ (served at /retirement). The cozy half (grounds, garden, kitchen, rooms, multiplayer
presence and chat, music and soundscape) already exists. The forest is fully designed but not built.

Read these first, in full, before writing any code:
- CLAUDE.md (repo root): project rules. Don't add dependencies; run `npm run build` and
  `npm run lint` before declaring anything done; list every file you create or change.
- retirement/CLAUDE.md: how the game is built (maps, art, people, game loop, UI, save schema,
  the /api/retirement function, music and soundscape).
- retirement/FOREST.md: every design decision for the forest. It is the spec. Follow it, and
  keep it current: when you build something, update its status; when you make a judgement call,
  record it there.
- retirement/COMMUNITY.md: the cozy features. Pets and cooking aren't built yet, which is why
  FOREST.md stages 7 (meals) and 8 (pet rescue) depend on them.

Scope: FOREST.md "Build stages" 1 to 6, in order. Skip 7 and 8 unless pets/cooking exist by then.

Non-negotiables from the design:
- No combat of any kind. No weapons, armour, health bars or attacks.
- No jumpscares. Slow dread only.
- No opt-in, gate or warning sign: the forest is reached through unmarked gaps in the treeline.
- Players are invisible to each other in the forest and chat goes quiet. Everything in the
  forest runs only in the player's own browser.
- Past the point of no return, the way home stops existing. Only a real nurse/relative (or the
  pet, once pets exist) can bring you home, with a collapse safety net so nobody is stuck forever.
- Notes found on a trip are only kept if you get home safely.
- Every risky choice has a fair, learnable clue.
- Art stays procedural (drawn in code, like src/art.ts and src/people.ts) and sound stays
  synthesized or processed like the existing files (see retirement/CLAUDE.md "Music and sound").

How to work:
- Work on a new branch. One stage at a time: build it, test it, then stop and show me (a short
  summary, plus what to try in the game) before starting the next stage. Commit each stage
  separately when I approve it.
- Put tuning numbers (distances, speeds, ratios, timers) in one constants file so they're easy to
  adjust.
- Story fragments, events and buildings are data in their own files. Write the content from the
  draft story and events in FOREST.md, matching its tone; write more fragments where the draft
  says "more to write", and tell me which ones you invented.
- Save changes go in retirement/shared/schema.ts with server-side validation (old saves must
  still load), with tests in api/_lib/retirement.test.ts. Add the `forest` map id to isMapId.
  Stay within the single api/retirement.ts function.
- If FOREST.md leaves something open that blocks you (e.g. whether light can be bought, when
  existing characters set up their family), ask me instead of guessing.

Testing:
- `npm run dev:retirement` runs the game offline (localStorage save, two fake neighbours); the
  game is at http://localhost:5173/retirement/ (or the port in retirement/.claude/launch.json).
  In dev the game object is on `window.game`.
- If the browser pane is hidden, requestAnimationFrame is paused: drive the game by calling
  `game.update(dt)` and `game.render()` yourself from the console, and set `game.keys` to simulate
  held keys.
- Run `npx vitest run api/_lib/retirement.test.ts`, then `npm run build` and `npm run lint`.
  Note that src/lib/tasks/edits.test.ts already fails on main; that's unrelated.

Start by reading the files above, then propose your plan for stage 1 (how you'll generate the
forest, the treeline exits, the point of no return and the infirmary wake-up) before writing code.