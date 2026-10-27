# Jumpscare

A standalone trivia game, separate from the rest of DAWN. It asks one multiple-choice question at a time from the [Open Trivia Database](https://opentdb.com/) (category: Science: Computers, any difficulty). A wrong answer shows a random image from `media/` full screen for 3 seconds, with a sound.

```bash
npm install
npm run dev      # localhost:5173
```

Images (png, jpg, gif, webp, svg) go in `media/`. One sound file (mp3, wav or ogg) goes directly in this folder, next to `package.json`, and plays for the 3 seconds an image shows. Restart the dev server after adding files so it picks them up. With no images a wrong answer shows "WRONG!" instead, and with no sound it's silent.

The API allows one request every 5 seconds, so a new question can take a few seconds to load if you click through quickly.
