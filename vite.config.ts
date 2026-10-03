import { cp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    svelte(),
    strokeData(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bihua 笔画',
        short_name: 'Bihua',
        description: 'Look up Chinese characters by pinyin and see their stroke order.',
        lang: 'en',
        theme_color: '#f7f4ee',
        background_color: '#f7f4ee',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + dictionary are precached; stroke files (thousands) are cached when viewed.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'data/dict.json', 'data/words.json'],
        globIgnores: ['strokes/**'],
        // words.json is ~8.3 MB; keep headroom so a data update can't silently drop it from the precache.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            // Serialized into the service worker: must not reference variables from this file.
            urlPattern: ({ url }) => url.pathname.startsWith('/bihua/strokes/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'strokes',
              expiration: { maxEntries: 5000 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
