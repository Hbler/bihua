# REASONS Canvas: Word Page

**Status**: shipped (2026-10-03)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

A page for a multi-character word: its pinyin, meanings and counterpart, with the stroke order of one character at a time, so a word met while reading can be studied and written character by character.

### User Stories

- As a reader, I want to open 地球 and see its meaning and both characters, then each character's stroke order, so that I can learn to write the word.
- I want to link to a word from Obsidian with a chosen character already selected.

### Definition of Done

- [x] Route `#/w/<word>` and `#/w/<word>/<char>` (the selected character); the first character is selected by default.
- [x] Top frame: the word, its pinyin (and spoken form, see [spoken-pinyin](../spoken-pinyin/CANVAS.md)), the Simplified/Traditional counterpart as a link, its meanings, and one selectable card per character (character, its pinyin in this word, short meaning).
- [x] Bottom frame: the selected character's full content, the same as its character page (animation, stroke strip, info, composition, words).
- [x] Selecting a card updates the URL with `replaceState`, so a deep link opens on that character; "Open X's page →" links to the character's own page.
- [x] An unknown word shows "Word not found."; a failed word load shows "Couldn't load words." with Retry.

### Edge Cases

| Scenario                              | Expected Behavior                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| A character appears twice in the word | The URL stores the character, not its position, so the first card with it is highlighted |
| Opened by its Traditional form (說話) | Shown as a Traditional word; the counterpart links to 说话                               |
| Selected character not in the word    | Falls back to the first character                                                        |

### Out of Scope

- Example sentences and audio (`BRIEF.md`).

## E — Entities

`WordEntry` from [word-search](../word-search/CANVAS.md); `CharEntry` for the selected character. Route: `{ name: 'word'; word: string; char: string | null }` (`src/lib/route.ts`).

## A — Approach

- The character page body was extracted into a shared `CharacterView` component, used by both the character page and the word page.
- The word comes from the word worker (`lookupWord`), so the page waits for words to load on a cold start.
- The character's pinyin in each card comes from the word's reading at that position (好 in 你好 is hǎo).

## S — Structure

- `src/routes/WordPage.svelte`
- `src/components/CharacterView.svelte` (shared with `src/routes/CharacterPage.svelte`)
- `src/lib/route.ts` — `word` route, `wordHref` (+ route tests); `src/lib/router.svelte.ts` — `replaceWordChar`

---

## O — Operations

- [x] **O1**: Shared `CharacterView`; word page with character cards, counterpart link and selected-character content; `#/w/<word>/<char>` with `replaceState` (`90e303b`)
- [ ] **O2**: Browser pass: character switching, deep link with a selected character, phone and desktop widths (open; not covered by character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: word route parsing is unit-tested.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: `#/w/<word>/<char>` links are stable (Obsidian).

---

## Change Log

| Date       | Section | Change                                                                                                                   | Reason                    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 2026-10-07 | All     | Migrated from `english-search/PLAN.md` phase 2 step 3 (now in `docs/archive/english-search/`), verified against the code | Adopting REASONS canvases |
