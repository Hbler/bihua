# Product Requirements: Character Lookup (v1)

## Overview

Search a Chinese character by pinyin or by pasting it, choose it from a list of candidates sharing that pronunciation, and view its stroke order in a form that is easy to copy by hand on paper. This is the whole of v1.

## User Stories

### As a beginner Mandarin learner writing characters on paper

- I want to type `shi` and see all characters read that way, most common first
- So that I can find the one I'm studying without knowing how to type it

- I want to add a tone (`shi4` or `shì`) to narrow the list
- So that I don't scroll past characters with other tones

- I want a stroke-by-stroke diagram I can glance at while writing
- So that I can copy each stroke in the right order and direction

- I want to replay the animation slower
- So that I can see the direction of each stroke

### As a reader of a Chinese web novel

- I want to paste a character I copied from Pleco and open its page directly
- So that I can practice rare characters like 睨 that aren't in HSK lists

- I want each character to have a link I can put in my Obsidian notes
- So that my glossary entries open straight to the stroke order

### As a learner who may meet Traditional text

- I want to switch between Simplified, Traditional or both
- So that I see the forms I need, and the matching form of each character

### As a learner following HSK

- I want to optionally limit results to an HSK 3.0 level, or to that level's handwriting list
- So that I focus on characters I'm expected to know or write

## Acceptance Criteria

Search

- [ ] `shi`, `shi4`, `shì`, `SHI` all return results for the syllable shi; the toned forms show only tone 4.
- [ ] `lv`, `lu:`, `lü`, `lü4` return ü syllables; `lue`/`nue` are treated as `lüe`/`nüe`.
- [ ] Results are ordered by character frequency; characters without frequency data come last.
- [ ] Each result shows character, pinyin with tone mark, short meaning, HSK tag (if any) and counterpart form (if different).
- [ ] A polyphone (了, 行) appears under each of its readings, showing the meaning of that reading.
- [ ] Pasting or typing a single Han character (Simplified or Traditional) opens its character page.
- [ ] Input that is neither a valid syllable nor a Han character shows a "no syllable '<input>'" message.
- [ ] The current search is reflected in the URL (`#/search/shi4`) and survives a reload.

Filters

- [ ] Script toggle Simplified / Traditional / Both, default Simplified, remembered between visits.
- [ ] HSK filter is off by default; when on, a level 1–6 or 7–9 can be chosen and results are limited to that level and below.
- [ ] "Handwriting list only" option limits to the HSK 3.0 handwriting characters for the selected level and below.

Character page

- [ ] Opening `#/睨` (also URL-encoded) shows the character page directly.
- [ ] Large animation with Replay and speed options (0.5×, 1×, 2×).
- [ ] Stroke strip: one frame per stroke on a faint 田字格 grid, earlier strokes dark, current stroke in the accent color.
- [ ] Shows all readings with meanings, radical, stroke count and HSK level.
- [ ] Counterpart forms are links (说 ↔ 說); for one-to-many cases each counterpart is shown next to its reading.
- [ ] Traditional-only characters show "Stroke order follows the PRC standard".
- [ ] Characters without stroke data show dictionary info and a "No stroke data for this character" message.
- [ ] An unknown character (not in the dictionary) shows a clear "not found" page with a link back to search.

Platform

- [ ] Usable at phone (360 px), tablet and desktop widths without horizontal scrolling.
- [ ] Installable as a PWA; after the first visit, search and dictionary info work offline, and stroke order works offline for characters viewed before.
- [ ] No requests to third-party origins at runtime.
- [ ] About page credits all data sources and their licenses.

## Business Rules

1. Search key is the toneless syllable; ü is stored as `v`. Tone 5 is the neutral tone.
2. Ranking: frequency rank ascending; then stroke count ascending; then code point.
3. A Traditional character's frequency rank and HSK level come from its best (lowest-valued) Simplified counterpart.
4. Script membership: identical in both scripts → shown in every mode; Simplified-only → Simplified/Both; Traditional-only → Traditional/Both.
5. HSK filter is cumulative ("level ≤ N").
6. Counterparts come only from CC-CEDICT entries, per reading.
7. The app stores only display preferences, never what was searched or viewed.

## Edge Cases

| Scenario                                         | Expected Behavior                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Polyphone 了                                     | Listed under `le` and `liao`, each with its own meaning            |
| One-to-many 发                                   | Reading fā → counterpart 發; reading fà → 髮                       |
| Same form in both scripts (人)                   | No counterpart shown; visible in all script modes                  |
| `lue`, `nue` typed                               | Treated as lüe / nüe                                               |
| `ü` typed with tone mark (`lǜ`)                  | Parsed as syllable `lv`, tone 4                                    |
| Neutral tone (`ma5`, `ma0`, `ma`)                | `ma5`/`ma0` → tone 5 only; `ma` → all tones                        |
| Several syllables typed (`nihao`)                | v1: "Type one syllable or paste a character" hint                  |
| Several characters pasted (`你好`)               | Show a small picker of those characters, each linking to its page  |
| Character with no stroke data                    | Info shown, strokes section replaced by message                    |
| Character not in dictionary but with stroke data | Page shows strokes with "No dictionary entry"                      |
| Offline, stroke file never viewed                | "Stroke order is available offline after viewing it once online"   |
| HSK filter on, syllable has no HSK chars         | "No HSK ≤ N characters for 'shi'. Turn off the filter to see all." |
| localStorage unavailable                         | Defaults used, app works normally                                  |

## Out of Scope

- Accounts, sync, progress or history tracking
- Flashcards, spaced repetition
- On-screen handwriting input or practice
- Audio, example sentences
- English-meaning search, multi-syllable word search
- Taiwan MOE stroke order, TOCFL levels
- Printable practice sheets

## Dependencies

- CC-CEDICT, Make Me a Hanzi dictionary, `hanzi-writer` / `hanzi-writer-data`, Jun Da frequency list, HSK 3.0 character and handwriting lists
- GitHub repository with Pages enabled

## Success Metrics

- The user reaches for Bihua instead of MDBG/strokeorder.com when writing.
- Any character from the Nine Star Hegemon glossary can be found by pinyin within one screen of results (most cases) and has stroke data.
- Search results appear in under 100 ms after typing; a character page renders in under 300 ms when its strokes are cached.
