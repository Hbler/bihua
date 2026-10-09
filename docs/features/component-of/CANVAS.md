# REASONS Canvas: Component Of

**Status**: shipped (2026-10-08)
**Last synced with code**: 2026-10-08

---

## R — Requirements

On a character's page, list the characters that use it as a direct part. It is the mirror of the Composition section: Composition shows what the current character is made of; "Component of" shows what is made with it. It helps learn families of characters that share a part (木 → 林, 森, 机, 样…).

### User Stories

- As a learner on 木's page, I want to see the common characters built with 木, so that I recognise them as a family and remember them by their shared part.
- On 讠's page, I want to see 说, 话, 认…, and know whether 讠 gives the meaning or the sound in each.

### Definition of Done

- [x] A **"Component of"** section in the character view (character page, and the selected character on the word page), placed after Composition and before "Words with X".
- [x] It lists every character whose Composition contains the current character as a direct part: if 霸 = 雨 + 革 + 月, then 霸 is listed on 革's page but not on the pages of 革's own parts.
- [x] Each entry looks like a Composition card: the character, its pinyin, its short meaning, and tags when they apply: `meaning` or `sound` when the current character is that character's meaning or sound part, `radical` when it is that character's radical. Each card links to that character's page.
- [x] Ordered by frequency, like search results; 12 at a time with "Show more", like the word list.
- [x] The heading shows the count: "Component of 147 characters" (讠 in Simplified mode).
- [x] The list follows the script setting, using the same rule as "Words with X": on a Traditional-only character's page, Traditional characters; otherwise the current setting (Simplified: S + ST, Traditional: T + ST, Both: all).
- [x] The section is hidden when nothing matches.

### Edge Cases

| Scenario                                                      | Expected Behavior                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Very common part (口 487, 氵 471, 艹 435, 木 400 characters)  | 12 most frequent first; Show more for the rest                                                        |
| 言 in Simplified mode                                         | Only the 19 Simplified/shared characters (Simplified forms use 讠); Both shows all 162                |
| Part used twice in one character (森 = 木 木 木)              | That character listed once                                                                            |
| Current character is only the radical of X, not a direct part | X is not listed (strict mirror of Composition; the radical card in Composition is a hint, not a part) |
| Character that is in no other character's composition         | Section hidden                                                                                        |
| Word page, selected character                                 | Same section for the selected character                                                               |

### Out of Scope

- Indirect containment (parts of parts).
- Listing characters by shared radical.
- Highlighting the part's strokes inside each listed character.

## E — Entities

No new data. The relation is the reverse of `CharEntry.components` (see [character-composition](../character-composition/CANVAS.md)).

- **Component-of index**: `Map<part, CharEntry[]>`, each list sorted by the search ranking (`compareHits` order: frequency, then stroke count, then code point), no duplicates.
- Tags per listed character X, for current part P: `meaning` if `X.etymology.semantic === P`; `sound` if `X.etymology.phonetic === P`; `radical` if `X.radical === P`.

Data as of 2026-10-07: 1,811 characters are a part of at least one other; median list 4; 308 lists longer than 12; 30 longer than 100.

## A — Approach

- Build the index lazily from the loaded dictionary on the first character page that needs it, in a pure function (`src/lib/search/component-of.ts`), cached per dictionary like the English index. It is a single pass over ~14.5 k entries, so it stays on the main thread; measure it, and move it into a worker only if it costs more than ~50 ms on desktop.
- Script filtering reuses `matchesScriptFilter` and the "Words with X" rule (`wordScriptForChar`).
- The card UI reuses the Composition card look; extract a shared card component only if it avoids real duplication.
- Paging reuses the word list's "Show more" behaviour (12 per page).

### Alternatives Considered

- Including indirect containment: rejected (user decision); lists would grow without adding much.
- Including characters that only share the radical: rejected; that's radical lookup, a different feature, and lists would be far larger (口 radical).
- Precomputing the index into `dict.json`: rejected; it duplicates data already there and `dict.json` is near its size limit (758 of 800 KB gzip).

## S — Structure

- **Adds**: `src/lib/search/component-of.ts` (+ test) — `buildComponentOfIndex(dict)`, `getOrBuildComponentOfIndex`, `componentOf(index, part, script)`, `componentTags`; `src/components/ComponentOfSection.svelte` (+ test); `src/components/CharCard.svelte` (the card extracted from Composition, shared by both sections)
- **Changes**: `src/components/CharacterView.svelte` — section between Composition and "Words with X"
- **Depends on**: character-composition data (`components`, `etymology`, `radical`), the search ranking, the script rule from words-on-character-page

---

## O — Operations

- [x] **O1**: `src/lib/search/component-of.ts`: build the index from the dictionary (reverse of `components`, de-duplicated, ranking order), `componentOf(index, part, script)` with the Words-with-X script rule, and tag computation — verify by: unit tests on a fixture (木/林/森/机, 言/說/讠/说, a radical-only case, a repeated part), plus the build time measured on the real `dict.json` — done 2026-10-08: index builds in 5.7 ms on the real dictionary (stays on the main thread); 讠 147 (S), 言 19 (S) / 162 (ST)
- [x] **O2**: `ComponentOfSection.svelte` in `CharacterView` between Composition and "Words with X": Composition-style cards with pinyin, short meaning and tags, count in the heading, 12 per page with Show more, hidden when empty — verify by: browser check on 木, 讠, 言 (Simplified and Both), 革 and a character with no list, at phone and desktop widths; Word page shows it for the selected character — done 2026-10-08: checked in headless Chrome on a production build (木 331 with first 12 样本机相果条权格术根极林, Show more, 讠 147 with meaning/radical tags, 革 23, 言 19/162, hidden for 的, word page 木头/木, 360 and 1280 px)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: index, ordering, de-duplication, tags and script filtering are unit-tested on a fixture (木/林/森/机, 言/說/讠/说, a radical-only case).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: no change to `dict.json`; the index is built lazily, never at startup.

---

## Change Log

| Date       | Section    | Change                                                                                                                         | Reason                                                             |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 2026-10-07 | R          | Draft created from user request                                                                                                | Feature request                                                    |
| 2026-10-07 | R, E, A, S | Named "Component of"; direct parts only (mirror of Composition); cards like Composition with tags; script rule as Words with X | User answers to the draft's open questions                         |
| 2026-10-08 | S          | Shipped; Composition's card extracted into a shared `CharCard`                                                                 | Avoids duplicating ~60 lines of card markup and CSS (allowed by A) |
