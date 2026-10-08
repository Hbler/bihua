# REASONS Canvas: Word Search

**Status**: shipped (2026-10-03)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

Search multi-character words, not only characters: several pinyin syllables (`diqiu`) or an English meaning ("earth") find words like 地球, 大地, 泥土. Words are what you look up while reading. This added words to Bihua's scope (approved 2026-10-03; `BRIEF.md` updated).

### User Stories

- As a reader, I want to type `diqiu` or `dì qiú` and find 地球, so that I can look up words, not just characters.
- I want English search to also list words ("earth" → 地球 "the earth"), because the natural answer is often a word.
- I want to paste a word I copied and open it directly.

### Definition of Done

- [x] Pinyin mode, no extra toggle: one syllable lists characters as before; several syllables (`diqiu`, `di4qiu2`, `dì qiú`, `di qiu`) list words.
- [x] Typed tones filter word matches, as for characters.
- [x] `xian` finds both the character 先 and the word 西安.
- [x] English mode: a "Words" group under the character results, same tiers as English character search, then word frequency.
- [x] Pasting several characters that form a known word opens its word page; otherwise the multi-character picker stays.
- [x] Words are available offline from the first install (precached).
- [x] Word loading never blocks the main thread; while loading, word sections say so; on failure, "Couldn't load words." with Retry, and character search keeps working.

### Edge Cases

| Scenario                                | Expected Behavior                                                       |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Multi-syllable input that is no word    | "No words found." (or the HSK variant when the filter is on)            |
| Input neither a syllable nor a word key | "Type one syllable at a time (e.g. shi or shi4), or paste a character." |
| HSK filter on                           | Applies to words too ("No HSK ≤ N words found.")                        |
| Proper nouns (西安)                     | Kept; pinyin lowercased; proper-noun glosses listed after common ones   |
| Word only reachable through "see …"     | Glosses resolved from the referenced entry (西安 → 西安市)              |

### Out of Scope

- Segmenting a pasted sentence into words.
- Traditional forms as separate rows: they are reached through counterparts.

## E — Entities

See [ARCHITECTURE.md › Domain Model](../../ARCHITECTURE.md#domain-model).

### WordRow (`public/data/words.json`, compact on disk)

The file is `{ version, built, words: WordRow[] }`. Each row is `[simplified, WordReadingRow[], rank]` with `WordReadingRow = [numbered pinyin, meanings, traditional forms?]`; rank `0` when unranked; rows in ranking order. Example: `['地球', [['di4 qiu2', ['the earth']]], 1254]`.

### WordEntry (decoded by `decodeWords`)

`{ word, script, readings: WordReading[], freqRank, traditional }`, with `WordReading { key, syllables, tones, pinyin, meanings, counterparts }`; `key` = toneless syllables joined (`diqiu`).

## A — Approach

### Data

- All CC-CEDICT multi-character entries; one row per word pair (Simplified row, Traditional forms as counterparts, 说话 ↔ 說話).
- Ranked by the **SUBTLEX-CH word list**; words missing from it go last, ordered by the average frequency of their characters. SUBTLEX-CH is credited on the About page.
- As built (2026-10-07): 92,383 rows, 40,631 ranked; 7.9 MiB raw / 3.5 MiB gzip. The user accepted the size for runtime speed; the limit is in `docs/SAFEGUARDS.md` (≤ 12 MB raw).
- Built by `scripts/data/build.ts` (via `words.ts`, `sources/subtlex.ts`) next to `dict.json`.

### Runtime

- Words load, decode and index in a **Web Worker** (`src/lib/data/words.worker.ts`), started when the browser is idle after the dictionary loads (≈ 520 ms on desktop, off the main thread). The client (`src/lib/words.svelte.ts`) sends requests and exposes a loading status.
- Pinyin words are indexed by their key (`diqiu`), so no segmentation is needed.
- The English word index stores single tokens only; tiers and phrases are checked at query time (a phrase index took 1.3 s and 1.5 M keys). Queries take under 1 ms.
- Ranking, filters and display rules are pure functions in `src/lib/search/words.ts`.

### Alternatives Considered

- A phrase index for English word search: rejected (1.3 s build, 1.5 M keys).
- Loading words on the main thread: rejected (blocks for ≈ 0.5 s).

## S — Structure

- `scripts/data/words.ts` (+ test), `scripts/data/sources/subtlex.ts` (+ test), `scripts/data/build.ts` → `public/data/words.json`
- `src/lib/data/words.ts` (+ test: `decodeWords`), `src/lib/data/words.worker.ts`, `src/lib/words.svelte.ts`
- `src/lib/search/words.ts` (+ test)
- `src/routes/SearchPage.svelte`, `src/components/WordList.svelte`
- `vite.config.ts` — precache includes `words.json` (raised precache limit)

### Interfaces

Worker requests: `searchWordsPinyin`, `searchWordsEnglish`, `lookupWord`, `wordsContainingChar` (the last one used by words-on-character-page).

---

## O — Operations

- [x] **O1**: Word data — CC-CEDICT multi-character parsing, SUBTLEX-CH merge, compact `words.json`, unit tests (`8487fa5`)
- [x] **O2**: Word search in a background worker: pinyin keys with tone filter, English word tiers, pasted-word lookup, Words groups in the UI (`14592bc`)
- [x] **O3**: Data spot-check: 地球, 说话/說話, 西安, 了解/瞭解, 头发/頭髮 (done during the migration, 2026-10-07: readings, meanings, counterparts and ranks as expected)
- [ ] **O4**: Browser pass: "earth" in English mode, `diqiu` and `xian` in pinyin mode, offline after first load, at phone and desktop widths (open; not covered by character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: unit tests for multi-character parsing, frequency merge, the pinyin word key (`diqiu`, `xian`, `lv`, tones) and English word ranking.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: the word worker must never block the main thread; `words.json` stays under the precache limit.

---

## Change Log

| Date       | Section | Change                                                                                                                                                                                                                                                  | Reason                    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-10-07 | All     | Migrated from `english-search/PLAN.md` phase 2 steps 1–2 (now in `docs/archive/english-search/`), verified against the code. Old plan's "except proper nouns" bullet and "7 MB / 3 MB" check superseded by its own as-built notes, which match the code | Adopting REASONS canvases |
