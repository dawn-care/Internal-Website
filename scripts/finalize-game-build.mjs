import { mkdirSync, renameSync } from 'node:fs'

// Vite always builds the game's entry HTML alongside its public assets in dist/game.
// Moving it out of dist (which Vercel serves as static files) and into api/_game (which
// only the /api/game function can read, via vercel.json's includeFiles) is what makes the
// GitHub sign-in gate in api/game.ts actually binding — otherwise Vercel's static file
// serving finds dist/game/index.html itself and serves it directly, bypassing the gate.
mkdirSync('api/_game', { recursive: true })
renameSync('dist/game/index.html', 'api/_game/index.html')
