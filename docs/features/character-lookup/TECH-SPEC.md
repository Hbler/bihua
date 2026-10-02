# Technical Specification: Character Lookup (v1)

## Overview

A Vite + Svelte 5 + TypeScript static app. A local Node script merges four open datasets into `public/data/dict.json`. At runtime the app loads that file once, indexes it in memory, parses the user's input, and renders results and character pages. Stroke data comes from `hanzi-writer-data`, copied into `dist/strokes/` at build time and loaded per character through a custom Hanzi Writer loader. A service worker makes it installable and offline-capable.

## Subtasks

- [ ] **Scaffold** — Vite + Svelte 5 + TS (strict), ESLint, Prettier, Vitest, svelte-check; `base: '/bihua/'`; `$lib` alias; `.gitignore` with `data/raw/`.
- [ ] **Resolve data sources** — confirm download URLs and licenses (see Open Questions), record them in `scripts/data/sources/README.md`.
- [ ] **Pinyin module** — syllable table, `parseQuery`, `numberedToMarks`, `marksToNumbered`; tests first.
- [ ] **Data pipeline** — `fetch.ts`; parsers for CC-CEDICT, MMAH `dictionary.txt`, frequency list, HSK lists; `build.ts` merge; size report; spot-check script for 了 行 发 說 睨.
- [ ] **Dictionary loading** — `loadDictionary()` → `{ byChar, bySyllable }`; tests on a fixture.
- [ ] **Search** — `search(query, dict, settings)` with tone/script/HSK filters and ranking; tests.
- [ ] **Router + settings** — hash router, settings with localStorage persistence.
- [ ] **Search page UI** — SearchBar (debounced, autofocus), Filters, ResultList/ResultItem, empty/invalid states, multi-character picker.
- [ ] **Stroke loader** — `charDataLoader` against `BASE_URL/strokes/`; copy step in `vite.config.ts`.
- [ ] **Character page UI** — StrokeAnimation (replay, speed), StrokeSteps strip, CharacterInfo, counterpart links, PRC note, fallbacks.
- [ ] **PWA** — `vite-plugin-pwa`: manifest, icons, precache shell + `dict.json`, runtime cache-first for `strokes/`.
- [ ] **About page** — credits and licenses.
- [ ] **CI/CD** — GitHub Actions: `npm ci`, lint, check, test, build, deploy to Pages.
- [ ] **Manual QA** — the PRD acceptance criteria on phone, tablet and desktop; offline mode in DevTools.

## API Design

No server API. The app reads two kinds of static files from its own origin.

### Endpoints

#### `GET {BASE_URL}data/dict.json`

- **Purpose**: Full character dictionary, loaded once at startup.
- **Response**:

```json
{
  "version": 1,
  "built": "2026-10-02",
  "chars": [/* CharEntry[] */]
}
```

- **Errors**: Network failure with no cache → full-page "Couldn't load the dictionary" with Retry.

#### `GET {BASE_URL}strokes/{char}.json`

- **Purpose**: Stroke paths and medians for one character (hanzi-writer-data format), consumed by Hanzi Writer and the stroke strip.
- **Response**:

```json
{ "strokes": ["M 362 ...", "..."], "medians": [[[x, y], ...], ...], "radStrokes": [0, 1] }
```

- **Errors**: 404 → `{ kind: 'missing' }`; offline and not cached → `{ kind: 'offline' }`.

## Data Model

Shared in `src/lib/data/types.ts`, imported by both the pipeline and the app. Short keys are not used — `dict.json` is gzip-compressed by Pages, so readability wins.

### CharEntry

| Field          | Type                 | Description                                                                               |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `char`         | `string`             | The character (one code point)                                                            |
| `script`       | `'S' \| 'T' \| 'ST'` | Simplified-only, Traditional-only, or identical in both                                   |
| `readings`     | `Reading[]`          | One per distinct pinyin, ordered by CC-CEDICT order                                       |
| `freqRank`     | `number \| null`     | Jun Da rank (1 = most common); Traditional inherits from counterpart                      |
| `hsk`          | `1–7 \| null`        | HSK 3.0 level; `7` = band 7–9                                                             |
| `hskWriteBand` | `1–3 \| null`        | HSK 3.0 handwriting list band: 1 elementary (1–3), 2 intermediate (4–6), 3 advanced (7–9) |
| `radical`      | `string \| null`     | From Make Me a Hanzi                                                                      |
| `strokeCount`  | `number \| null`     | From stroke data (`strokes.length`)                                                       |
| `hasStrokes`   | `boolean`            | Whether `strokes/{char}.json` exists                                                      |

### Reading

| Field          | Type       | Description                                                         |
| -------------- | ---------- | ------------------------------------------------------------------- |
| `syllable`     | `string`   | Toneless ASCII key, ü as `v` (`lv`)                                 |
| `tone`         | `1–5`      | 5 = neutral                                                         |
| `pinyin`       | `string`   | Display form with tone mark (`lǜ`)                                  |
| `meanings`     | `string[]` | CC-CEDICT glosses, trimmed; `meanings[0]` used as the short meaning |
| `counterparts` | `string[]` | Other-script forms for this reading (empty if identical)            |

### ParsedQuery

```ts
type Tone = 1 | 2 | 3 | 4 | 5
type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'char'; char: string }
  | { kind: 'chars'; chars: string[] } // several pasted characters
  | { kind: 'pinyin'; syllable: string; tone?: Tone }
  | { kind: 'multi-syllable'; input: string } // e.g. "nihao" — hint only in v1
  | { kind: 'invalid'; input: string }
```

### Settings (localStorage key `bihua:settings`)

```ts
type Settings = {
  script: 'S' | 'T' | 'ST' // default 'S'
  hskFilter: boolean // default false
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 // default 1
  handwritingOnly: boolean // default false
  animationSpeed: 0.5 | 1 | 2 // default 1
}
```

## Implementation Notes

### Pinyin parsing (`src/lib/pinyin/parse.ts`)

1. Trim, NFC-normalize, lowercase.
2. If every code point is in a CJK Unified Ideographs block (incl. Ext A and compatibility) → `char` / `chars`.
3. Replace `ü`, `u:` with `v`. Detect a tone mark on any vowel → strip it and record the tone. A trailing digit `0–5` → tone (`0` → 5).
4. Map `lue`/`nue` → `lve`/`nve`. (`ju`, `qu`, `xu`, `yu` stay as written — their u is ü but pinyin writes u, and CC-CEDICT does too.)
5. Check against the full syllable table (~410 syllables). Not found → try segmenting into multiple valid syllables → `multi-syllable`, else `invalid`.

### CC-CEDICT parsing (`scripts/data/sources/cedict.ts`)

- Line format: `Trad Simp [pin1 yin1] /gloss/gloss/`. Keep only single-character entries.
- CC-CEDICT pinyin uses `u:` for ü and `5` for neutral; an uppercase first letter marks proper nouns — lowercase the syllable, keep the entry, and sort `surname …` glosses last within a reading.
- Glosses starting with `variant of`, `old variant of`, `see …` are kept but never used as `meanings[0]` if another gloss exists.
- Build per character: readings keyed by `(syllable, tone)`; merge glosses from both the Trad and Simp side; counterparts per reading = the other side when it differs.
- `script`: char appears only as Simp of differing entries → `S`; only as Trad → `T`; otherwise `ST`.

### Merge (`scripts/data/build.ts`)

- Universe of characters = CC-CEDICT single chars ∪ stroke-data chars.
- Frequency, HSK and HSK-handwriting from their lists (Simplified); then propagate to `T` characters via counterparts (minimum value).
- `radical` from MMAH `dictionary.txt`; `strokeCount` / `hasStrokes` from `hanzi-writer-data` files.
- Print a report: entry count, chars with/without strokes, HSK chars without strokes (should be 0), output size raw/gzip.

### Dictionary index (`src/lib/data/dictionary.ts`)

- `bySyllable`: for each entry and each reading, push `{ entry, readingIndex }` under `reading.syllable`; sort each list once by the ranking rule (freq, stroke count, code point).
- Search then only filters a pre-sorted list.

### Stroke loader (`src/lib/data/strokes.ts`)

```ts
export async function loadStrokes(char: string): Promise<StrokeResult> // cached in a Map
export const charDataLoader: HanziWriterOptions['charDataLoader'] = (char, onLoad, onError) => {
  loadStrokes(char).then((r) => (r.kind === 'ok' ? onLoad(r.data) : onError(r)))
}
```

### Stroke strip (`src/components/StrokeSteps.svelte`)

- For `i` in `0..n-1`, render an SVG (viewBox `0 0 1024 1024`, transform `scale(1,-1) translate(0,-900)` as in Hanzi Writer's diagram example) with a faint 田字格, strokes `< i` in the text color, stroke `i` in the accent color, strokes `> i` omitted (option later: faint outline).
- Wraps responsively: ~4 frames per row on phones, more on wider screens. Frames numbered.

### Stroke animation (`src/components/StrokeAnimation.svelte`)

- `HanziWriter.create(el, char, { charDataLoader, showOutline: true, strokeAnimationSpeed, delayBetweenStrokes, padding })`, size from container width (ResizeObserver).
- Controls: Replay, speed 0.5×/1×/2× (persisted). Recreate on char change; clean up on unmount.

### Copying strokes (`vite.config.ts`)

- Small plugin on `closeBundle`: copy `node_modules/hanzi-writer-data/*.json` to `dist/strokes/`. In dev, serve the same directory under `/strokes/` via `server` middleware or `publicDir` alias.
- Generate the list of characters with strokes for the pipeline from the same package, so `hasStrokes` always matches what is deployed.

### Routing (`src/lib/router.svelte.ts`)

- Listen to `hashchange`; expose `route = $state<Route>()`.
- `#/`, `#/search/<q>`, `#/about`, `#/<char>` (decodeURIComponent; one code point → character page, otherwise treat as a search).
- Typing updates the hash with `history.replaceState`; selecting a result uses a normal navigation so Back returns to the list.

## Testing Requirements

### Unit Tests

- `parseQuery`: `shi`, `SHI`, `shi4`, `shì`, `shi0`, `shi5`, `lv`, `lu:`, `lü`, `lǜ`, `lue`, `nue`, `ju`, `er`, `r5`, `xyz` (invalid), `nihao` (multi-syllable), `你`, `說`, `你好`, empty and whitespace.
- `numberedToMarks`: tone placement rules (a/e first, `ou` → ǒu, otherwise last vowel), ü handling, neutral tone.
- `search`: fixture dictionary covering polyphone, one-to-many counterparts, S/T/ST script filtering, HSK cumulative filter, handwriting filter, ranking ties (no frequency → stroke count → code point).
- Pipeline parsers: CC-CEDICT line parsing (incl. `u:`, `5`, proper nouns, variant glosses); merge producing correct counterparts for 发, 干, 了, 说/說 and `script` for 人.

### Integration Tests

- Run `build.ts` against small checked-in fixture files in `scripts/data/__fixtures__/` and snapshot the output.

### E2E Tests

- None automated in v1. Manual pass over the PRD acceptance criteria, including DevTools offline mode and a phone.

## Observability

### Logs

- Pipeline: build report to stdout (counts, sizes, warnings for HSK chars missing strokes or meanings).
- App: `console.warn` only for unexpected states during development (dictionary load failure, malformed stroke file). No logs leave the browser.

### Metrics

- None collected. Bundle size and `dict.json` size printed by the build and checked by eye.

### Alerts

- None. CI failure emails from GitHub are enough.

## Security Considerations

- No third-party requests at runtime; CSP meta tag `default-src 'self'; style-src 'self' 'unsafe-inline'` (Svelte scoped styles; verify what Hanzi Writer needs).
- Character and query text from the URL is rendered as text only — never `{@html}`.
- localStorage reads validated against the `Settings` shape; invalid → defaults.

## Performance Requirements

- `dict.json` ≤ 4 MB raw / ≤ 650 KB gzip (first build: 3.8 MB / 590 KB; gzip is what is downloaded).
- Dictionary parse + index ≤ 200 ms on a mid-range phone.
- Search results ≤ 100 ms after input settles (debounce 100 ms; lookup itself < 5 ms).
- JS bundle (excluding data) ≤ 100 KB gzip.
- Lighthouse PWA installable; performance ≥ 90 on mobile.

## Rollout Plan

1. Create the GitHub repo `bihua`, enable Pages (source: GitHub Actions).
2. Merge scaffold + CI; confirm an empty app deploys at `https://<user>.github.io/bihua/`.
3. Land pinyin, pipeline and search with tests; commit the first `dict.json`.
4. Land the UI and PWA; manual QA on phone/tablet/desktop.
5. Add Bihua links to the Obsidian glossary workflow (`https://<user>.github.io/bihua/#/<char>`).

## Data notes (from the first build)

- HSK 3.0 handwriting lists are published per band (elementary / intermediate / advanced), not per level, so the "handwriting only" filter uses the band of the selected level.
- Jun Da's pinyin column is alphabetical, so the main reading comes from Make Me a Hanzi's `pinyin` order instead; remaining readings are ordered by number of ordinary glosses.
- CC-CEDICT entries whose glosses are all "variant of …" (昰 → 是) describe only the Traditional side; they add no counterpart or meaning to the Simplified character.
- Proper-noun entries (法 Fǎ "France") are merged into the reading but their glosses go after the common ones.
- Counterparts without stroke data (乹, 亁) are dropped when a drawable one exists.
- Known limitation: CC-CEDICT order decides the first meaning when one reading merges several entries (后 shows "empress" first).

## Open Questions

- **HSK 3.0 machine-readable lists**: the official standard (GF0025-2021) is a PDF. Pick a community transcription that includes both the character list and the handwriting list per level, and spot-check it against the PDF.
- **Frequency list**: confirm the current URL and terms of Jun Da's Modern Chinese character frequency list; fallback SUBTLEX-CH.
- **Traditional stroke coverage**: after the first data build, check how many common Traditional characters lack stroke data; decide whether that needs work.
