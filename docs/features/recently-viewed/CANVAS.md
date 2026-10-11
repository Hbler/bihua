# REASONS Canvas: Recently Viewed

**Status**: shipped (2026-10-11)
**Last synced with code**: 2026-10-11

---

## R — Requirements

On the search page, when the search box is empty, show the characters and words the user opened most recently, so getting back to something looked up a few minutes ago is one tap instead of a new search. A convenience list kept on the device only — not progress tracking (no counts, stats, streaks or badges; see `docs/SAFEGUARDS.md`).

### User Stories

- As a reader, I look up 睨 while reading, then 地球, then want 睨 again: I want to tap it from a list instead of searching again.
- As a learner writing on paper, I want the few characters I'm practising today one tap away.

### Definition of Done

- [x] Opening a character page (`#/<char>`) or a word page (`#/w/<word>`) adds it to the list. Re-opening an item moves it to the top; it is never listed twice.
- [x] The list keeps the 20 most recent items, newest first.
- [x] On the search page with an empty search box (pinyin and English mode), a **"Recently viewed"** section is shown above the existing intro text: one tappable chip per item with the character or word and its main pinyin, linking to its page.
- [x] A **"Clear"** button empties the list (one tap; the section then disappears).
- [x] Hidden when the list is empty, and never shown while a search is typed.
- [x] Stored in `localStorage` only; nothing else is recorded (no searches, no counts, no timestamps shown).

### Edge Cases

| Scenario                                                            | Expected Behavior                               |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| Choosing another character on a word page                           | Not added (only the word itself, once)          |
| Unknown character or word ("No dictionary entry", "Word not found") | Not added                                       |
| Same character in both scripts (说 and 說)                          | Two separate items, as opened                   |
| `localStorage` unavailable or full                                  | The list simply doesn't persist; nothing breaks |
| Corrupt or old stored data                                          | Ignored item by item; invalid entries dropped   |
| Pasting a character from search (redirects to its page)             | Added, like any opened page                     |

### Out of Scope

- Search-query history.
- Visit counts, "most viewed", dates or any statistics (Safeguards).
- Sync between devices.
- A setting to turn the list off (reconsider if wanted).

## E — Entities

- **RecentItem**: `{ kind: 'char' | 'word'; text: string; pinyin: string }` — the form as opened (Simplified or Traditional) and the pinyin shown on its chip (character: main reading; word: first reading), stored when the item is recorded.
- **Recent list**: `RecentItem[]`, newest first, at most 20, unique by `kind` + `text`. `localStorage` key `bihua:recent`.

## A — Approach

- Pure functions (`src/lib/recent.ts`): `addRecent(list, item, max = 20)` → new list with the item moved or inserted at the front and trimmed; `sanitizeRecent(value: unknown)` → a valid list from stored data (drops invalid entries and duplicates, caps at 20).
- State (`src/lib/recent.svelte.ts`): `recent` as `$state`, loaded with `sanitizeRecent` at startup, saved on change (try/catch like settings); `recordView(item)` and `clearRecent()`.
- Recording: when a character page or word page has found its entry, it calls `recordView` once per opened page (not on word-page character switching, which uses `replaceState`).
- Display: each chip shows the stored `text` and `pinyin`, so the search page doesn't wait for the word data to load.

### Alternatives Considered

- Recording in the router on every route change: rejected; it can't tell found from not-found pages, and word-page character switches would need special-casing.
- Showing timestamps ("2 h ago"): rejected; closer to tracking than needed.

## S — Structure

- **Adds**: `src/lib/recent.ts` (+ test), `src/lib/recent.svelte.ts`, `src/components/RecentList.svelte`
- **Changes**: `src/routes/SearchPage.svelte` (section in the empty state, both modes), `src/routes/CharacterPage.svelte` and `src/routes/WordPage.svelte` (call `recordView` when the entry is found)
- **Depends on**: dictionary and word lookups for chip pinyin

---

## O — Operations

- [x] **O1**: `src/lib/recent.ts` (`addRecent`, `sanitizeRecent`) with tests, and `src/lib/recent.svelte.ts` (state loaded from and saved to `bihua:recent`, `recordView`, `clearRecent`) — verify by: unit tests (insert at front, move to top, cap at 20, kind+text uniqueness, invalid and duplicate stored data dropped, non-array input → empty list)
- [x] **O2**: Recording on character pages (entry found) and word pages (word found), `RecentList.svelte` in the search page's empty state (both modes) with chips and Clear — verify by: browser check on a production build: open 睨, 地球, 說, 睨 again → list is 睨, 說, 地球 with pinyin; word-page character switch adds nothing; unknown character adds nothing; list hidden while typing; Clear empties it; survives a reload; 21 items keep 20; phone and desktop widths

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: `addRecent` and `sanitizeRecent` are unit-tested (move to top, cap, duplicates, invalid data).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md) — the "recently viewed" list is the one allowed piece of usage data: on the device only, clearable, no counts or statistics.

---

## Change Log

| Date       | Section    | Change                                 | Reason                                                                                             |
| ---------- | ---------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-10-11 | R, E, A, S | Draft created                          | User request; Safeguards narrowed to allow it (same day)                                           |
| 2026-10-11 | E, A       | Items store their pinyin when recorded | Word data loads in the background; reading it on the search page would make word chips appear late |
| 2026-10-11 | O          | O1, O2 done; synced with code          | Component forms (⺈, entry without readings) are not recorded, as the edge-case table says         |
