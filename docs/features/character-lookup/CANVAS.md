# REASONS Canvas: Character Lookup (v1)

**Status**: shipped (2026-10-02) · follow-up O12 (scroll position) done 2026-10-08
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

Search a Chinese character by pinyin or by pasting it, choose it from a list of candidates sharing that pronunciation, and view its stroke order in a form that is easy to copy by hand on paper. This was the whole of v1.

### User Stories

- As a beginner writing characters on paper, I want to type `shi` and see all characters read that way, most common first, so that I can find the one I'm studying without knowing how to type it.
- I want to add a tone (`shi4` or `shì`) to narrow the list, so that I don't scroll past other tones.
- I want a stroke-by-stroke diagram I can glance at while writing, and a slower animation, so that I copy each stroke in the right order and direction.
- As a reader of a Chinese web novel, I want to paste a character (睨) and open its page directly, and link to it from my Obsidian notes.
- As a learner who may meet Traditional text, I want Simplified, Traditional or both, with the matching form of each character.
- As a learner following HSK, I want to optionally limit results to an HSK 3.0 level, or to that level's handwriting list.

### Definition of Done

Search

- [x] `shi`, `shi4`, `shì`, `SHI` all find the syllable shi; toned forms show only that tone.
- [x] `lv`, `lu:`, `lü`, `lǜ` find ü syllables; `lue`/`nue` are treated as `lüe`/`nüe`.
- [x] Results are ordered by character frequency; characters without frequency data come last.
- [x] Each result shows character, pinyin with tone mark, short meaning, HSK tag (if any) and counterpart form (if different). Long meanings wrap.
- [x] A polyphone (了, 行) appears under each of its readings, with that reading's meaning.
- [x] Pasting or typing a single Han character (Simplified or Traditional) opens its page.
- [x] Input that is neither a valid syllable nor a Han character shows `No syllable "<input>".`
- [x] The current search is in the URL (`#/search/shi4`) and survives a reload.

Navigation

- [x] Opening a new page (a result, a link, a counterpart, a word, a part) shows it from the top.
- [x] Back and Forward return to the scroll position that page had.
- [x] Updates within a page (typing a search, choosing a character on the word page) never reset the scroll position. (When typing shortens the results, the browser's scroll anchoring may shift the view slightly to keep a visible result in place; that is browser behaviour, unchanged from before.)

Filters

- [x] Script toggle Simplified / Traditional / Both, default Simplified, remembered between visits.
- [x] HSK filter off by default; when on, a level 1–6 or 7–9 limits results to that level and below.
- [x] "Handwriting list only" limits to the HSK 3.0 handwriting characters for the band of the selected level.

Character page

- [x] `#/睨` (also URL-encoded) opens the character page directly.
- [x] Large animation with Replay and speed 0.5×, 1×, 2× (remembered).
- [x] Stroke strip: one frame per stroke on a faint 田字格 grid, earlier strokes dark, current stroke in the accent colour; placed directly under the animation.
- [x] All readings with meanings, radical, stroke count and HSK level.
- [x] Counterparts are links (说 ↔ 說); in one-to-many cases each counterpart is shown next to its reading.
- [x] Traditional-only characters show "Stroke order follows the PRC standard; Taiwan's may differ."
- [x] Characters without stroke data show dictionary info and "No stroke data for this character."
- [x] An unknown character shows "No dictionary entry for this character." with a link back to search.

Platform

- [x] Usable at phone (360 px), tablet and desktop widths without horizontal scrolling.
- [x] Installable PWA; offline behaviour as in `docs/SAFEGUARDS.md`.
- [x] No requests to third-party origins at runtime.
- [x] About page credits all data sources and their licenses.

### Edge Cases

| Scenario                                       | Expected Behavior                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Polyphone 了                                   | Listed under `le` and `liao`, each with its own meaning                                                                                                      |
| One-to-many 发                                 | Reading fā → counterpart 發; reading fà → 髮                                                                                                                 |
| Same form in both scripts (人)                 | No counterpart shown; visible in every script mode                                                                                                           |
| `lue`, `nue` typed                             | Treated as lüe / nüe                                                                                                                                         |
| `ü` with tone mark (`lǜ`)                      | Syllable `lv`, tone 4                                                                                                                                        |
| Neutral tone (`ma5`, `ma0`, `ma`)              | `ma5`/`ma0` → tone 5 only; `ma` → all tones                                                                                                                  |
| Several syllables typed (`nihao`)              | Now handled by [word search](../word-search/CANVAS.md); the "Type one syllable at a time" hint remains for input that is neither a syllable nor a word query |
| Several characters pasted (`你好`)             | A known word opens its word page; otherwise a small picker of the characters, each linking to its page                                                       |
| Character with no stroke data                  | Info shown; strokes section replaced by a message                                                                                                            |
| Character with strokes but no dictionary entry | Strokes shown with "No dictionary entry for this character." (component forms: see character-composition)                                                    |
| Offline, stroke file never viewed              | "Couldn't load the stroke order. It is available offline after viewing a character once…"                                                                    |
| HSK filter on, nothing at that level           | `No HSK ≤ N characters for "shi". Turn off the HSK filter to see all.`                                                                                       |
| Page opened after scrolling another page       | Starts at the top (bug found on the phone 2026-10-07: the new page kept the old scroll position)                                                             |
| Back to a long results list                    | Returns to where the list was scrolled                                                                                                                       |
| `localStorage` unavailable                     | Defaults used; app works normally                                                                                                                            |

### Out of Scope

See `BRIEF.md`. At v1 English and multi-syllable search were out of scope; they shipped later as their own features (english-search, word-search).

## E — Entities

See [ARCHITECTURE.md › Domain Model](../../ARCHITECTURE.md#domain-model). Shared types in `src/lib/data/types.ts`.

### CharEntry

| Field                                            | Type                 | Description                                                                       |
| ------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------- |
| `char`                                           | `string`             | One code point                                                                    |
| `script`                                         | `'S' \| 'T' \| 'ST'` | Simplified-only, Traditional-only, identical in both                              |
| `readings`                                       | `Reading[]`          | One per distinct pinyin                                                           |
| `freqRank`                                       | `number \| null`     | Jun Da rank (1 = most common); Traditional inherits from its counterpart          |
| `hsk`                                            | `1–7 \| null`        | HSK 3.0 level; `7` = band 7–9                                                     |
| `hskWriteBand`                                   | `1–3 \| null`        | Handwriting list band: 1 elementary (1–3), 2 intermediate (4–6), 3 advanced (7–9) |
| `radical`                                        | `string \| null`     | From Make Me a Hanzi                                                              |
| `strokeCount`                                    | `number \| null`     | From stroke data                                                                  |
| `hasStrokes`                                     | `boolean`            | Whether `strokes/{char}.json` exists                                              |
| `components`, `hasUnknownComponent`, `etymology` | —                    | Added by [character-composition](../character-composition/CANVAS.md)              |

### Reading

| Field          | Type       | Description                                              |
| -------------- | ---------- | -------------------------------------------------------- |
| `syllable`     | `string`   | Toneless ASCII key, ü as `v` (`lv`)                      |
| `tone`         | `1–5`      | 5 = neutral                                              |
| `pinyin`       | `string`   | Display form with tone mark (`lǜ`)                       |
| `meanings`     | `string[]` | CC-CEDICT glosses; `meanings[0]` is the short meaning    |
| `counterparts` | `string[]` | Other-script forms for this reading (empty if identical) |

### ParsedQuery

```ts
type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'char'; char: string }
  | { kind: 'chars'; chars: string[] }
  | { kind: 'pinyin'; syllable: string; tone?: Tone }
  | { kind: 'multi-syllable'; input: string }
  | { kind: 'invalid'; input: string }
```

### Settings (`localStorage` key `bihua:settings`)

`script` (default `'S'`), `hskFilter` (default `false`), `hskLevel` (default `1`), `handwritingOnly` (default `false`), `animationSpeed` (`0.5 | 1 | 2`, default `1`). `searchMode` was added by english-search.

## A — Approach

A Vite + Svelte 5 + TypeScript static app. A local Node script merges open datasets into `public/data/dict.json`; the app loads it once, indexes it in memory, parses the input and renders. Stroke data comes from `hanzi-writer-data`, copied into `dist/strokes/` at build time and loaded per character through a custom Hanzi Writer loader. A service worker makes it installable and offline-capable.

### Business rules

1. Search key is the toneless syllable; ü stored as `v`; tone 5 is neutral.
2. Ranking: frequency rank ascending (no rank last), then stroke count, then code point (`compareHits` in `src/lib/data/dictionary.ts`).
3. A Traditional character's frequency rank and HSK level come from its best (lowest) Simplified counterpart.
4. Script membership: `ST` shown in every mode; `S` in Simplified/Both; `T` in Traditional/Both.
5. HSK filter is cumulative (level ≤ N). The handwriting lists are published per band, so "handwriting only" uses the band of the selected level.
6. Counterparts come only from CC-CEDICT entries, per reading.

### Pinyin parsing (`src/lib/pinyin/parse.ts`)

1. Trim, NFC-normalize, lowercase.
2. All code points Han → `char` / `chars`.
3. `ü`, `u:` → `v`; a tone mark → strip and record the tone; trailing `0–5` → tone (`0` → 5).
4. `lue`/`nue` → `lve`/`nve` (`ju`, `qu`, `xu`, `yu` stay as written).
5. Check against the syllable table; else try segmenting into several syllables → `multi-syllable`; else `invalid`.

### Data pipeline (`scripts/data/`)

- Sources (`fetch.ts`): CC-CEDICT (MDBG), Make Me a Hanzi `dictionary.txt`, Jun Da character frequency, HSK 3.0 lists (krmanik/HSK-3.0 transcription), and the `hanzi-writer-data` package for strokes.
- CC-CEDICT (`sources/cedict.ts`): single-character entries; `u:` → ü, `5` → neutral; proper nouns kept with their glosses sorted last; `variant of` / `see …` glosses never used as the short meaning when another exists; readings keyed by (syllable, tone); counterparts per reading; `script` from which side the character appears on.
- Merge (`build.ts`, `merge.ts`): character universe = CC-CEDICT single characters ∪ stroke-data characters; frequency/HSK/handwriting from their lists, propagated to Traditional via counterparts (minimum value); radical from MMAH; stroke count/availability from `hanzi-writer-data`. Prints a build report.
- Data notes from the first build: main reading order comes from MMAH's `pinyin` order (Jun Da's pinyin column is alphabetical); all-"variant of" entries (昰 → 是) add no counterpart; counterparts without stroke data (乹, 亁) are dropped when a drawable one exists. Known limitation: CC-CEDICT order decides the first meaning when one reading merges several entries (后 shows "empress" first).

### Runtime

- `loadDictionary()` builds `byChar` and `bySyllable` (each list pre-sorted by the ranking rule); search only filters a pre-sorted list.
- Stroke loader (`src/lib/data/strokes.ts`): `loadStrokes(char)` with an in-memory cache; `charDataLoader` for Hanzi Writer, fetching `${BASE_URL}strokes/{char}.json`; 404 → `missing`, offline uncached → `offline`.
- Stroke strip (`StrokeSteps.svelte`): one SVG per stroke (viewBox 1024, Hanzi Writer's diagram transform) on the 田字格 (`PracticeGrid.svelte`); wraps responsively, frames numbered.
- Animation (`StrokeAnimation.svelte`): Hanzi Writer created in an `$effect`, sized from the container, recreated on character change; speed persisted.
- Strokes are copied from `node_modules/hanzi-writer-data` into `dist/strokes/` by a `vite.config.ts` plugin; the pipeline reads the same package, so `hasStrokes` matches what is deployed.
- Routing: hash router; typing updates the hash with `replaceState`; choosing a result is a normal navigation so Back returns to the list.
- Scroll position: browsers keep the scroll position on hash navigation, so the router manages it. `history.scrollRestoration = 'manual'`; each history entry gets an id in `history.state` and its scroll position is remembered (in memory, keyed by id) before leaving. On `hashchange`: if the entry has a remembered position (Back/Forward), restore it once the page has rendered; otherwise (a new page) scroll to the top. `replaceState` updates fire no `hashchange`, so they never move the page.

### Open questions from v1, as resolved

- HSK 3.0 machine-readable lists → krmanik/HSK-3.0 transcription (credited on the About page).
- Frequency list → Jun Da (credited); SUBTLEX-CH is used for words.
- Traditional stroke coverage → checked 2026-10-07: 58 of the 1,225 Traditional-only characters ranked in the top 3,000 have no stroke data; every Simplified HSK character has strokes. No further work planned.

### Alternatives Considered

- Committing ~9,500 stroke files: rejected; copied from the npm package at build time instead.
- Precaching stroke files: rejected (tens of MB); cached on demand.
- Short JSON keys in `dict.json`: rejected; gzip makes readable keys cheap.

## S — Structure

- `scripts/data/` — `fetch.ts`, `sources/{cedict,mmah,frequency,hsk}.ts`, `merge.ts`, `build.ts` → `public/data/dict.json` (committed)
- `src/lib/pinyin/` — `parse.ts`, `syllables.ts`, `tone-marks.ts`
- `src/lib/data/` — `types.ts`, `dictionary.ts`, `strokes.ts`; `src/lib/dictionary.svelte.ts`
- `src/lib/search/search.ts`; `src/lib/route.ts`, `router.svelte.ts`; `src/lib/settings.svelte.ts`
- `src/routes/` — `SearchPage`, `CharacterPage`, `AboutPage`; `src/components/` — `SearchBar`, `Filters`, `ResultList`, `CharacterView`, `CharacterInfo`, `StrokeAnimation`, `StrokeSteps`, `PracticeGrid`
- `vite.config.ts` — `base: '/bihua/'`, PWA (precache shell + data, cache-first `strokes/`), stroke copy plugin
- `.github/workflows/` — lint, check, test, build, deploy to Pages

### Interfaces

Static files from the app's own origin: `GET {BASE_URL}data/dict.json` (`{ version, built, chars: CharEntry[] }`; failure → full-page "Couldn't load the dictionary" with Retry) and `GET {BASE_URL}strokes/{char}.json` (hanzi-writer-data format).

---

## O — Operations

- [x] **O1**: Scaffold — Vite + Svelte 5 + TS (strict), ESLint, Prettier, Vitest, svelte-check, `base: '/bihua/'`, `$lib` alias (`b8fe2a3`)
- [x] **O2**: Data sources resolved and credited (`fetch.ts`, About page)
- [x] **O3**: Pinyin module — syllable table, `parseQuery`, tone-mark conversion, tests first (`9d95976`)
- [x] **O4**: Data pipeline — fetch, parsers, merge, build report, spot checks for 了 行 发 說 睨 (`9d95976`)
- [x] **O5**: Dictionary loading and index, search with filters and ranking, router, settings, stroke loader and components (`51d0081`)
- [x] **O6**: Search page and character page UI, multi-character picker, fallbacks (`d8ac2eb`)
- [x] **O7**: PWA, About page, CI/CD to GitHub Pages (`d8ac2eb`)
- [x] **O8**: Long meanings wrap in results; all meanings listed on the character page (`2a58fb3`)
- [x] **O9**: Stroke strip moved directly under the animation (`8e9b7e3`)
- [ ] **O10**: Pipeline integration test — run `build.ts` on small fixture files and snapshot the output (planned in the v1 tech spec; never built; the parsers and merge have unit tests)
- [x] **O12**: Scroll position on navigation (Navigation items in R) — verify by: unit test of the pure "new entry vs returning entry" decision; browser check at phone width: scroll a results list, open a character (top), Back (list position restored), open a word from a scrolled character page (top), choose another character on the word page (no jump); plus the remaining O11 checks in headless Chrome at tablet (768 px) and desktop (1280 px) widths and in offline mode — done 2026-10-08: `src/lib/scroll.ts` (+ tests), `router.svelte.ts`; checked on a production build in headless Chrome
- [x] **O11**: Manual QA of this feature's Definition of Done — phone: daily use by the user since about 2026-10-03; tablet (768 px) and desktop (1280 px): no horizontal scrolling on search, character, word, English and About pages, layouts checked on screenshots; offline (server actually stopped): search, word search and a viewed character work, an unviewed character shows the offline message. Done 2026-10-08. The other features' own browser passes stay open in their canvases.

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: unit tests for `parseQuery` (all input forms above), tone-mark placement, search (polyphones, one-to-many counterparts, script and HSK filters, ranking ties) and the CC-CEDICT parser and merge (发, 干, 了, 说/說, 人).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: none beyond the project ones (most of them were defined by this feature).

---

## Change Log

| Date       | Section | Change                                                                                                         | Reason                                                                                                                                                                                                             |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-07 | All     | Migrated from `PRD.md` and `TECH-SPEC.md` (now in `docs/archive/character-lookup/`), verified against the code | Adopting REASONS canvases                                                                                                                                                                                          |
| 2026-10-07 | R, A, O | Navigation rules for scroll position; new O12                                                                  | User found on the phone that a newly opened page keeps the previous page's scroll position; the router has no scroll handling                                                                                      |
| 2026-10-08 | R, O    | Typing-scroll wording made precise; O11 and O12 done                                                           | Browser check: the only movement while typing is the browser's scroll anchoring (same on the old live site); offline checked with the server stopped, since emulated offline doesn't cover service-worker requests |
