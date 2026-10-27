import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The jumpscare trivia game is its own app, unrelated to the DAWN site. It builds into
// dist/game and is served at /game. Using the site's own dependencies means Vercel's
// single root `npm install` is enough to build it.
export default defineConfig({
  root: fileURLToPath(new URL('./jumpscare', import.meta.url)),
  base: '/game/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist/game', import.meta.url)),
    emptyOutDir: true,
  },
})
