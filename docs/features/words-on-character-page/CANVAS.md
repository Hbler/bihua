# REASONS Canvas: Words on the Character Page

**Status**: shipped (2026-10-03)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

On a character's page, list the most common words containing it, each linking to its word page, so a character is learned together with the words it's used in.

### User Stories

- As a learner on 地's page, I want to see 地球, 地方, 土地…, so that I learn where the character is actually used.

### Definition of Done

- [x] A "Words with 地" section in the character view, listing words that contain the character by frequency, 12 at a time with "Show more".
- [x] The character is highlighted inside each word; each word links to its word page.
- [x] It also appears for the selected character on the word page, leaving out that page's own word.
- [x] Traditional-only characters list Traditional forms, choosing the form that contains the character (裡 → 這裡, not 這裏).
- [x] While words load the section says "Loading words…"; on failure, "Couldn't load words." with Retry.

### Edge Cases

| Scenario                        | Expected Behavior                               |
| ------------------------------- | ----------------------------------------------- |
| Character used in no word       | The section is hidden                           |
| Word page for 地球, selected 地 | 地球 itself is not listed under "Words with 地" |

### Out of Scope

- Characters that contain this character as a part: a separate feature ([component-of](../component-of/CANVAS.md), draft).

## E — Entities

`WordEntry` / `WordHit` from [word-search](../word-search/CANVAS.md). A by-character word index: `char → word hits in ranking order, no duplicates`.

## A — Approach

- The by-character index is built in the word worker on its first use (≈ 50 ms), not at startup (`containing` request).
- Ranking is the word ranking; the display script follows `wordScriptForChar(entry.script, settings.script)`.
- The section lives in `CharacterView`, so the character page and word page share it; the word page passes `excludeWord`.

## S — Structure

- `src/lib/data/words.worker.ts` — `containing` request; `src/lib/search/words.ts` — index, script choice (+ tests)
- `src/lib/words.svelte.ts` — `wordsContainingChar`
- `src/components/CharacterView.svelte` (`excludeWord`), `src/components/WordList.svelte` (`pageSize`, `highlight`, `script`, Show more)

---

## O — Operations

- [x] **O1**: By-character word index in the worker, "Words with X" section with highlight, 12 per page and Show more, Traditional forms, word-page exclusion (`fa5a995`)
- [ ] **O2**: Browser pass: words on 地's page, on a Traditional-only character, and on the word page, at phone and desktop widths (open; not covered by character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: the by-character index is built lazily in the worker.

---

## Change Log

| Date       | Section | Change                                                                                                                   | Reason                    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 2026-10-07 | All     | Migrated from `english-search/PLAN.md` phase 2 step 4 (now in `docs/archive/english-search/`), verified against the code | Adopting REASONS canvases |
