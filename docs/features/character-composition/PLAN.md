# Character composition

Show what a character is made of on its page, with every part linking to that part's own page.

## Decisions

- Show **leaf components** of the decomposition (霸 = 雨 + 革 + 月), in order, without repeats (森 → 木) and without the character itself.
- Show the **etymology**: type ("Sound + meaning", "Combined meaning", "Picture"), the hint text, and which part carries the meaning or the sound.
- Always show the **radical**, tagged, even when it isn't a listed component.
- Stroke highlighting per component (Make Me a Hanzi `matches`) is a later feature.

## Data (Make Me a Hanzi `dictionary.txt`)

- `decomposition` is an Ideographic Description Sequence: `⿱雨⿰革月`. Operators are U+2FF0–U+2FFF; `？` marks an unknown part.
- 9,490 of 9,574 drawable characters have a decomposition; all 1,811 distinct components exist in `dict.json` with stroke data (114 have no readings: component forms like ⺈, 乚).
- `etymology` = `{ type, hint?, semantic?, phonetic? }`.

New `CharEntry` fields: `components: string[]`, `hasUnknownComponent: boolean`, `etymology: Etymology | null` (see `src/lib/data/types.ts`).

## UI

A **Composition** section on the character page:

- One card per component (and the radical if not among them): the part, its pinyin and short meaning, tags `radical` / `meaning` / `sound`, linking to `#/<part>`.
- A line with the etymology type and hint.
- "Part of this character is unidentified" when `hasUnknownComponent`.
- Component-only characters (no dictionary entry) show "Component form — no dictionary entry" instead of the generic message.

## Checks

Unit tests for decomposition parsing and merge; headless browser pass on 说, 霸, 森, 发, 說, 了 and a click-through, at phone and desktop widths.
