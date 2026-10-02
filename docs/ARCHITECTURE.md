# Architecture Overview

## System Diagram

```
┌──────────────────────────── build time (local, manual) ────────────────────────────┐
│                                                                                     │
│  CC-CEDICT ──────► sources/cedict.ts ────┐                                          │
│  MMAH dictionary ► sources/mmah.ts ──────┤                                          │
│  Jun Da freq ────► sources/frequency.ts ─┼──► build.ts ──► public/data/dict.json    │
│  HSK 3.0 lists ──► sources/hsk.ts ───────┘                 (committed)              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── build time (CI, every deploy) ─────────────────────────┐
│  vite build ──► dist/  (+ copy node_modules/hanzi-writer-data/*.json → dist/strokes/)│
└─────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── runtime (browser) ─────────────────────────────────────┐
│                                                                                     │
│  service worker ── precache: app shell + dict.json                                  │
│        │           runtime cache-first: strokes/*.json                              │
│        ▼                                                                            │
│  dict.json ──► loadDictionary() ──► Dictionary { byChar, bySyllable }               │
│                                         │                                           │
│   hash router ──► SearchPage ──► search(query, settings) ──► ResultList             │
│              └──► CharacterPage ──► CharacterInfo                                   │
│                                └──► strokes.ts loader ──► StrokeAnimation (HW)      │
│                                                       └──► StrokeSteps (SVG)        │
│   settings.svelte.ts (script, HSK filter) ◄──► localStorage                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Data pipeline (`scripts/data/`)

- **Purpose**: Turn several raw open datasets into one compact file the app can load.
- **Responsibilities**: Download sources (`fetch.ts`); parse each source (`sources/*.ts`); merge per character, compute script and counterparts per reading, attach frequency rank, HSK level, radical, stroke availability (`build.ts`); write `public/data/dict.json`.
- **Dependencies**: Node 22, `tsx`, the raw files in `data/raw/`, `hanzi-writer-data` (to know which characters have strokes and their stroke count).

### Dictionary (`src/lib/data/`)

- **Purpose**: Hold the dictionary in memory and expose fast lookups.
- **Responsibilities**: Fetch `dict.json` once; build `byChar: Map<string, CharEntry>` and `bySyllable: Map<string, Hit[]>` (a hit = char + reading index), pre-sorted by rank.
- **Dependencies**: `types.ts` (shared with the pipeline).

### Pinyin (`src/lib/pinyin/`)

- **Purpose**: Normalize what the user types.
- **Responsibilities**: Classify input as a Han character or pinyin; parse `shi`, `shi4`, `shì`, `lv`, `lu:`, `lü`, `lue` → `{ syllable, tone? }`; validate against the syllable table; convert numbered pinyin to tone marks for display.
- **Dependencies**: none (pure).

### Search (`src/lib/search/`)

- **Purpose**: Turn a parsed query plus settings into an ordered result list.
- **Responsibilities**: Syllable lookup, tone filter, script filter, HSK filter, ranking.
- **Dependencies**: Dictionary, Pinyin.

### Stroke loader (`src/lib/data/strokes.ts`)

- **Purpose**: Serve stroke data to Hanzi Writer and the stroke strip from the app's own origin.
- **Responsibilities**: `charDataLoader` implementation fetching `${BASE_URL}strokes/{char}.json`; a small in-memory cache; a typed "no stroke data" result on 404.

### UI (`src/routes/`, `src/components/`)

- **SearchPage**: search bar, filters (script toggle, HSK toggle + level, handwriting-only), result list.
- **CharacterPage**: big animation with replay/speed, stroke strip, readings/meanings, radical, stroke count, HSK tag, counterpart links, PRC-order note on Traditional pages, fallback when no strokes.
- **AboutPage**: data credits and licenses.

### Router (`src/lib/router.svelte.ts`)

- Hash routes: `#/` (search), `#/search/<query>` (search with query, so a search is linkable), `#/<char>` (character page, a single Han character, URL-decoded), `#/about`.

## Data Flow

1. App starts → registers service worker → fetches `dict.json` (from cache after first visit) → builds indexes.
2. User types `shi4` → `parse()` → `{ syllable: 'shi', tone: 4 }` → `search()` reads `bySyllable.get('shi')`, keeps tone 4, applies script + HSK filters → ranked results render. URL updates to `#/search/shi4` (replaceState, no history spam).
3. User pastes `說` → `parse()` returns a character → router navigates to `#/說`.
4. CharacterPage looks up `byChar`; if `hasStrokes`, the stroke loader fetches `strokes/說.json` (network on first view, cache afterward) and both the animation and the strip render from it.

## Design Decisions

### Static site, no backend

- **Context**: Personal reference tool; data is fixed open datasets.
- **Decision**: Pre-build all data; host on GitHub Pages.
- **Consequences**: Zero running cost and maintenance; data updates require a rebuild and redeploy.

### One committed `dict.json`, strokes copied at build

- **Context**: CC-CEDICT changes over time; downloading it in CI would make builds non-reproducible. Stroke data is a versioned npm package.
- **Decision**: Commit the generated `dict.json` (about 3.8 MB raw, 0.6 MB gzipped). Copy stroke JSON from `hanzi-writer-data` into `dist/strokes/` at build time instead of committing ~9,500 files.
- **Consequences**: Reproducible CI builds; refreshing dictionary data is a deliberate local step.

### Strokes cached on demand, not precached

- **Context**: Stroke files total tens of MB; mobile browsers limit storage and precaching that much makes install slow.
- **Decision**: Precache the shell and `dict.json`; cache stroke files cache-first when first viewed.
- **Consequences**: Search and dictionary info work fully offline; stroke order works offline for characters already viewed. A "download all strokes" option can be added later if needed.

### Counterparts per reading from CC-CEDICT

- **Context**: Simplified↔Traditional is one-to-many (发 → 發/髮, 干 → 乾/幹/干).
- **Decision**: Counterparts are stored per reading, taken from CC-CEDICT single-character entries.
- **Consequences**: Correct pairing for each meaning; characters missing from CC-CEDICT have no counterpart shown.

### PRC stroke order for both scripts

- **Context**: Only open stroke dataset of this coverage is Make Me a Hanzi, which follows the PRC standard.
- **Decision**: Use it for Traditional too, with a visible note on Traditional pages.
- **Consequences**: Some Traditional characters (e.g. 必) differ from Taiwan MOE order.

### HSK 3.0 levels; Traditional inherits

- **Context**: HSK 3.0 publishes per-level character and handwriting lists in Simplified.
- **Decision**: Tag Simplified characters directly; Traditional characters take the lowest level among their Simplified counterparts. Levels 7–9 are one band, stored as `7`.
- **Consequences**: Traditional-only rare forms usually have no HSK tag, which is correct.

### Hash routing

- **Context**: GitHub Pages has no SPA fallback, and URLs must be pasteable into Obsidian.
- **Decision**: `#/` routes with the raw character in the hash.
- **Consequences**: Works on any static host; URLs are slightly less pretty.

## Security Model

No authentication, no user data, no network calls except same-origin static files. Preferences (script, HSK filter) are stored in `localStorage` only, wrapped in try/catch so private mode still works. A strict CSP (`default-src 'self'`) is possible because nothing loads from third parties at runtime.

## Scalability Considerations

Single user, static files. The limits that matter are client-side:

- `dict.json` size and parse time on phones (keep entries compact; target < 200 ms index build on a mid-range phone).
- Search is a map lookup plus a filter over at most a few hundred hits per syllable — no indexing library needed.
- Service-worker storage for viewed strokes (a few KB each).
