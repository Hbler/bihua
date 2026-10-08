# REASONS Canvas: Character Composition

**Status**: shipped (2026-10-02)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

Show what a character is made of on its page, with every part linking to that part's own page, plus its etymology. It helps remember a character by its parts while writing it.

### User Stories

- As a learner, I want to see that 霸 is 雨 + 革 + 月, and open each part, so that I can remember the character by its pieces.
- I want to know which part gives the meaning and which the sound, so that I can guess readings and meanings of new characters.

### Definition of Done

- [x] A **Composition** section on the character page with one card per **leaf component** of the decomposition, in order, without repeats (森 → 木) and without the character itself.
- [x] The **radical** always appears, tagged, even when it isn't a listed component.
- [x] Each card shows the part, its pinyin and short meaning, tags `radical` / `meaning` / `sound`, and links to `#/<part>`.
- [x] An etymology line: type ("Sound + meaning", "Combined meaning", "Picture") and hint.
- [x] "Part of this character is unidentified." when the decomposition has an unknown part.
- [x] Component-only characters (no dictionary entry) say "Component form — no dictionary entry."

### Edge Cases

| Scenario                                 | Expected Behavior                                        |
| ---------------------------------------- | -------------------------------------------------------- |
| Repeated part (森 = 木 木 木)            | One card for 木                                          |
| Unknown part (发 = ？ + 又)              | Known parts shown, plus the "unidentified" note          |
| Radical not among the leaf components    | Radical card added, tagged `radical`                     |
| Component form without readings (⺈, 乚) | Card without pinyin; its page says "Component form…"     |
| No components and no etymology           | No Composition section (either one alone still shows it) |

### Out of Scope

- Highlighting each component's strokes (Make Me a Hanzi `matches`): a possible later feature.

## E — Entities

New `CharEntry` fields (`src/lib/data/types.ts`):

| Field                 | Type                | Description                                                  |
| --------------------- | ------------------- | ------------------------------------------------------------ |
| `components`          | `string[]`          | Leaf components of the decomposition, no repeats or self     |
| `hasUnknownComponent` | `boolean`           | The decomposition contains `？`                              |
| `etymology`           | `Etymology \| null` | `{ type, hint?, semantic?, phonetic? }` from Make Me a Hanzi |

## A — Approach

- Source: Make Me a Hanzi `dictionary.txt`. `decomposition` is an Ideographic Description Sequence (`⿱雨⿰革月`); operators are U+2FF0–U+2FFF; `？` marks an unknown part. Parsed in `scripts/data/sources/mmah.ts`; `merge.ts` copies the fields onto each `CharEntry` (covered by `merge.test.ts`).
- Data as of 2026-10-07: 9,490 of 9,574 drawable characters have components; all 1,811 distinct components exist in `dict.json` with stroke data (114 have no readings); 449 characters have an unknown part; 9,033 have an etymology.
- Roles: a component equal to `etymology.semantic` is tagged `meaning`, to `etymology.phonetic` `sound`.

## S — Structure

- `scripts/data/sources/mmah.ts`, `scripts/data/merge.ts` — decomposition and etymology into `dict.json`
- `src/lib/data/types.ts` — new fields and `Etymology`
- `src/components/CompositionSection.svelte` (+ test), used by `CharacterView.svelte`
- `src/routes/AboutPage.svelte` — Make Me a Hanzi credit covers the decomposition data

---

## O — Operations

- [x] **O1**: Parse decomposition (leaf parts, no repeats or self, unknown flag) and etymology into `dict.json`, with unit tests (`d860aba`)
- [x] **O2**: Composition section with linked cards, role tags and etymology line; component-only message (`d860aba`)
- [ ] **O3**: Browser pass on 说, 霸, 森, 发, 說, 了 and a click-through, at phone and desktop widths (planned; not recorded as done — part of character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: decomposition parsing and merge are unit-tested; `CompositionSection` has a component test.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: `dict.json` grew with this feature (now 758 KiB gzip of the 800 KB limit).

---

## Change Log

| Date       | Section | Change                                                                                            | Reason                    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-10-07 | All     | Migrated from `PLAN.md` (now in `docs/archive/character-composition/`), verified against the code | Adopting REASONS canvases |
