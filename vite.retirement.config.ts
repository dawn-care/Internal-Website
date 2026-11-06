import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Sunset Acres (the shared nursing-home garden game) is its own app, unrelated to the DAWN
// site's UI. It builds into dist/retirement and is served at /retirement, signed-in only
// (see api/retirement.ts). Plain TypeScript + canvas: no extra dependencies.
export default defineConfig({
  root: fileURLToPath(new URL('./retirement', import.meta.url)),
  base: '/retirement/',
  build: {
    outDir: fileURLToPath(new URL('./dist/retirement', import.meta.url)),
    emptyOutDir: true,
  },
})
