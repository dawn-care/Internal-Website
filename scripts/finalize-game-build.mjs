import { mkdirSync, renameSync } from 'node:fs'

// Vite always builds each game's entry HTML alongside its public assets in dist/<game>.
// Moving it out of dist (which Vercel serves as static files) and into api/_<name> (which
// only that game's function can read, via vercel.json's includeFiles) is what makes the
// GitHub sign-in gate in api/game.ts and api/retirement.ts actually binding — otherwise
// Vercel's static file serving finds dist/<game>/index.html itself and serves it directly,
// bypassing the gate.
for (const [from, to] of [
  ['dist/game/index.html', 'api/_game'],
  ['dist/retirement/index.html', 'api/_retirement'],
]) {
  mkdirSync(to, { recursive: true })
  renameSync(from, `${to}/index.html`)
}
