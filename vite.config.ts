import { cp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const BASE = '/bihua/'
const STROKES_DIR = fileURLToPath(new URL('./node_modules/hanzi-writer-data', import.meta.url))

/** Serves hanzi-writer-data under `strokes/` in dev and copies it into dist/strokes/ on build. */
function strokeData(): Plugin {
  let outDir = 'dist'
  return {
    name: 'bihua-stroke-data',
    configResolved(config) {
      outDir = config.build.outDir
    },
    configureServer(server) {
      server.middlewares.use(`${BASE}strokes/`, async (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0].slice(1))
        if (!/^[^/\\]+\.json$/.test(name)) return next()
        try {
          const body = await readFile(join(STROKES_DIR, name))
          res.setHeader('Content-Type', 'application/json')
          res.end(body)
        } catch {
          res.statusCode = 404
          res.end()
        }
      })
    },
    async writeBundle() {
      await cp(STROKES_DIR, join(outDir, 'strokes'), {
        recursive: true,
        filter: (source) =>
          source === STROKES_DIR || (source.endsWith('.json') && !source.endsWith('package.json')),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [svelte(), strokeData()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
