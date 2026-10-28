# Jumpscare

A standalone game, separate from the rest of DAWN. It starts as a plain trivia quiz: one multiple-choice question at a time from the [Open Trivia Database](https://opentdb.com/) (category: Science: Computers, any difficulty).

After 5 questions it stops being trivia. "Can you remember your life?" has only blank answers, and every one is wrong. "Can you remember why you matter?" has nothing you can click. Five seconds later you wake up in a dark house you can walk around in first person (`src/house/`).

## The house

- **Controls:** mouse (click to capture it, Esc to let go) or arrow keys to look, WASD or arrow keys to walk, Shift to hurry, E to look closer at a painting or try a door. On touch screens, drag on the left half to walk and on the right half to look, and tap the prompt that appears.
- **Memories:** each painting holds a memory. Walk up to one and press E to remember it. The photo shows up hazy, the way a memory would.
- **Doors:** doors with words scratched into them open if you answer their riddle, and the answers are in the memories. Door 1 (answer: Ashton) leads to the east wing, where the floating head lives. Door 2 (answer: Thanatos, from a memory found in the east wing) leads outside. Plain doors never open.
- **The floating head** drifts slower than you walk. It chases you while it can see you, or if you run near it. If it loses you, it searches where it last saw you, then wanders. Hold your flashlight on it for a couple of seconds and it fades away, then comes back somewhere else later. If it reaches you, you get a jumpscare and wake up back at the start. You can hear it wheezing, through walls too.
- **The figure** turns up in rooms far from you. Walk up to it and it vanishes. Stare at it for too long and you get a jumpscare.
- **Outside**, the door slams shut behind you. There's only dead ground and fog you can't walk through, and a forty-foot shadow walking toward you, very slowly. Wherever you run, it's ahead of you in the fog. When it reaches you, the game ends (for now).
- **The house:** tables with candles, chairs, a rocking chair that rocks by itself, a ticking grandfather clock, bookshelves, and claw marks torn into the walls and doors.
- **Atmosphere:** swinging, creaking ceiling lamps, fog and the sea outside every window, footsteps that sometimes run up behind you, and a low drone with distant knocks, creaks, whispers and the house groaning.

The house is a hand-written raycaster on a canvas, with procedurally drawn textures. Every sound in it is synthesized with the Web Audio API, so it needs no extra files or dependencies.

### Adding memories and riddles

- **Memories and riddles:** `src/house/story.ts` holds every memory (the painting's image file, or `null` for a black frame, and its text) and every riddle (its text and accepted answers). Answers are compared ignoring case, spaces and punctuation.
- **The map:** `src/house/map.ts` is a grid of characters. A painting is its letter from `story.ts` placed on a wall, and a riddle door is its digit. The key at the top of the file lists the rest (furniture, lamps, claw marks and so on).
- **Images:** they go in `media/`, and `story.ts` refers to them by file name. Restart the dev server after adding files so it picks them up.

## Running it

```bash
npm install
npm run dev      # localhost:5173
```

From the site root, `npm run dev:game` serves it at localhost:5173/game/. In dev, localhost:5173/game/#house skips straight to the house, and the browser console can move things around through `window.__house` (for example `__house.player.x = 22`).

The jumpscare sound is the one sound file (mp3, wav or ogg) directly in this folder, next to `package.json`. The trivia API allows one request every 5 seconds, so a new question can take a few seconds to load if you click through quickly.
