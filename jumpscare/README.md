# Jumpscare

A standalone game, separate from the rest of DAWN. It starts as a plain multiple-choice memory quiz: three facts about memory, then two questions about you, where the only right answer is "I can't remember". The questions live in `src/quiz.ts`, with no network calls.

After 5 questions it stops being a quiz. "Can you remember your life?" has only blank answers, and every one is wrong. "Can you remember why you matter?" has nothing you can click. Five seconds later you wake up in a dark house you can walk around in first person (`src/house/`).

## The house

- **Controls:** mouse (click to capture it, Esc to let go) or arrow keys to look, WASD or arrow keys to walk, Shift to hurry, E to look closer at a painting, read a journal or try a door, P or Esc to pause. On touch screens, drag on the left half to walk and on the right half to look, and tap the prompt that appears.
- **Memories:** each painting holds a memory. Walk up to one and press E to remember it. The photo shows up hazy, the way a memory would.
- **Doors:** doors with words scratched into them open if you answer their riddle, and the answers are in the memories, so you'll find some riddles long before you can answer them and have to come back. Opened doors stay visibly open. Door 1 (answer: Ashton) opens onto stairs down to the basement, where the statue stands. Door 2 (answer: Thanatos, from a memory in the basement) leads to the east wing, where the pale thing lives. The double door (answer: Minnow, from a memory in the east wing) leads outside. Plain doors never open.
- **Journals** lie open on little stands around the house: one page each, in `JOURNALS` in `src/house/story.ts`. Everything freezes while you read one, or a memory or a riddle, so nothing can chase you. All the journal text is placeholder for now.
- **The flashlight** is the only real light. Outside its beam it's nearly black, apart from the odd lamp or candle, and it flickers more in the basement.
- **The statue** in the basement looks like a woman praying under a swinging lamp, and you have to pass it to reach the Thanatos painting. It stays still until the first time you look away. After that it only moves when you can't see it, but it sprints: faster than you walk, slower than you run, and you can hear it coming. It counts as seen only while it's in your flashlight's beam or a lamp's light, so a flicker gives it a moment to move. If it reaches you, you get a jumpscare, wake up back at the start, and it's back on its plinth. Its tuning is the `STATUE_*` constants at the top of `src/house/game.ts`.
- **Spiders** in the basement scatter from your flashlight and creep up on you in the dark. A bite slows you down for a couple of seconds.
- **Cobwebs** fill the basement's doorways. You have to push through them, and they slow you to about a third of your speed. They don't slow the statue.
- **The pale thing** is long and pale, with long hair and eyes that glow in the dark, and it acts like an animal. It wanders with its nose to the floor until it catches your scent, then follows you, slower than you walk and in fits and starts. It stops just out of reach, rears up and sniffs at you, and if you stand still it gets bored and leaves for a while. Walk into it, or run while it's near, and it lunges. It can't take the stairs, so the basement shakes it off. Its tuning is the `PALE_*` constants at the top of `src/house/game.ts`.
- **The figure** turns up in rooms far from you. Walk up to it and it vanishes. Stare at it for too long and you get a jumpscare.
- **Outside**, the door slams shut behind you. There's only dead ground and fog you can't walk through, and a forty-foot shadow walking toward you, very slowly. Wherever you run, it's ahead of you in the fog. When it reaches you, the game ends (for now).
- **The house:** tables with candles, chairs, rocking chairs that rock by themselves, a ticking grandfather clock, bookshelves, dressers, beds, coat racks, boxes, barrels, vases, mannequins, and claw marks torn into the walls and doors.
- **Atmosphere:** swinging, creaking ceiling lamps, fog and the sea outside every window, footsteps that sometimes run up behind you, and a low drone with distant knocks, creaks, whispers and the house groaning.

The house is a hand-written raycaster on a canvas, with procedurally drawn textures. Its footsteps, ambience and other sounds are synthesized with the Web Audio API, so they need no extra files or dependencies.

### Adding memories and riddles

- **More notes:** `CLAUDE.md` in this folder has the route through the game and how the code fits together.
- **Memories and riddles:** `src/house/story.ts` holds every memory (the painting's image file, or `null` for a black frame, and its text) and every riddle (its text and accepted answers). Answers are compared ignoring case, spaces and punctuation.
- **The map:** `src/house/map.ts` is a grid of characters. A painting is its letter from `story.ts` placed on a wall, and a riddle door is its digit. The key at the top of the file lists the rest (furniture, lamps, claw marks and so on).
- **Images:** they go in `media/`, and `story.ts` refers to them by file name. Restart the dev server after adding files so it picks them up.

## Running it

```bash
npm install
npm run dev      # localhost:5173
```

From the site root, `npm run dev:game` serves it at localhost:5173/game/. In dev, localhost:5173/game/#house skips straight to the house, and the browser console can move things around through `window.__house` (for example `__house.player.x = 22`).

Each jumpscare plays a random sound from `sounds/` (mp3, wav or ogg) with a random image from `media/`. On the deployed site, `/game` is only served to signed-in team members. 
