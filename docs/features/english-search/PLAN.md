# English search

Search by English meaning ("earth") and get every character with that meaning, ranked, so near-synonyms (地 dì, 土 tǔ) can be compared side by side.

`BRIEF.md` lists English-meaning search under "Possible later", so phase 1 extends v1 without changing its scope. Phase 2 (words) does change the scope: the app becomes a word dictionary as well as a character one. It needs a decision before it is built.

## Phase 1: characters

### Decisions

- **Explicit mode toggle**, `拼 / EN`, next to the search bar. Auto-detection doesn't work because many English words are also valid pinyin: `he`, `an`, `men`, `ma`, `long`, `fan`, `can`, `bin`, `pin`, `die`. The mode is stored in `Settings` (`searchMode: 'pinyin' | 'english'`, default `'pinyin'`).
- Pasting a character still goes to its page in either mode.
- **Deep links keep the mode**: `#/en/<q>` next to the existing `#/search/<q>`.
- **No new data.** The English index is built in the app from the `meanings` already in `dict.json`. It is built lazily the first time English mode is used, so startup stays within the 200 ms budget.
- **Filters apply unchanged** (script, HSK, handwriting list).
- Results reuse `ResultList`, but each row shows **the gloss that matched** instead of `meanings[0]`. For example, 尘 shows "earth" rather than "dust", so you can see why it's in the list.

### Matching (`src/lib/search/english.ts`)

Glosses are normalized before indexing:

1. Split each CC-CEDICT gloss on `;` ("(bound form) soil; earth" → "soil", "earth").
2. Lowercase, then strip parenthetical labels such as `(literary)`, `(bound form)`, `(fig.)`, and leading `to ` / `a ` / `the `.
3. Skip glosses that are cross-references or labels: `variant of …`, `see …`, `surname …`, `CL:…`.

Ranking tiers (the first tier that matches wins), then frequency within a tier, as in pinyin search:

| Tier | Rule                                     | "earth" example        |
| ---- | ---------------------------------------- | ---------------------- |
| 1    | Normalized gloss equals the query        | 地, 土, 尘, 壤         |
| 2    | Gloss starts with the query as a word    | "earth embankment" 埝  |
| 3    | Query appears as a whole word in a gloss | "red earth used for …" |

- Multi-word queries match as phrases ("to eat" → "eat", "bank up" → 培).
- Within the same tier, frequency decides (as in pinyin search); the position of the matching gloss within the reading is only the last tiebreak. Glosses are matched in normalized form but displayed as written, labels included.
- No stemming in v1. Open question: add a plural fallback (`earths` → `earth`)?
- The index is a `Map<token, Posting[]>` where each posting holds `{ entry, readingIndex, glossIndex, tier info }`. The per-tier ordering is precomputed like `bySyllable`.

### UI

- Segmented toggle `拼 | EN` in `SearchBar`. The placeholder follows the mode: "Pinyin (shi, shi4, shì) or a character" / "English meaning (earth, to eat)".
- In English mode, the result count is shown and results are grouped by tier: **Exact** first, then **Related**. Showing "earth" next to 地 and 土 is what answers "are these the same?".
- Empty state: "No character has that meaning. Try a simpler word."

### Checks

- Unit tests for normalization (parentheticals, `to `, `;` split, skipped glosses), tier ranking, phrase queries, and filters. Use a fixture with 地, 土, 尘/塵, 埝 and one `variant of` entry.
- Route tests for `#/en/<q>`.
- Measure the time to build the index on the real `dict.json`.
- Browser pass: earth, water, eat, to eat, big, he (both modes), at phone and desktop widths.

## Phase 2: words (approved 2026-10-03)

Characters alone answer the 地/土 question, but the natural answer to "earth" is often a word: 地球 "the earth", 大地 "mother earth", 泥土 "soil". Words are what you look up while reading. This adds words to the app's scope (`BRIEF.md` updated).

### Data (`public/data/words.json`)

- All CC-CEDICT multi-character entries except proper nouns (capitalised pinyin): about 92k words, 6.5 MB raw / 2.9 MB gzip.
- Ranked by a **word frequency list (SUBTLEX-CH word list)**. Words missing from it go last, ordered by the average frequency of their characters. Confirm the list's URL and terms and record them on the About page.
- Same reading model as characters: per-word pinyin, glosses and Traditional/Simplified counterpart from the same CC-CEDICT entry (说话 ↔ 說話).
- Built by `scripts/data/build.ts` next to `dict.json`. New `WordEntry` type in `src/lib/data/types.ts`.
- **Precached** by the service worker with the app shell and `dict.json`, so word search works offline from the first install.

### Search

- **English mode**: a "Words" group under the character results, using the same tiers as phase 1, then word frequency.
- **Pinyin mode, no extra toggle**: one syllable lists characters as today. Several syllables (`diqiu`, `di4qiu2`, `dì qiú`, `di qiu`) list words, replacing the current `multi-syllable` hint.
  - Words are indexed by their toneless pinyin with spaces removed (地球 → `diqiu`), so no segmentation is needed and `xian` finds both 先 and 西安.
  - Typed tones filter the matches, as for characters.
- Pasting several characters that form a known word opens its word page; otherwise the current multi-character picker stays.

### Word page (`#/w/<word>/<char>`)

- **Top frame**: the word, its pinyin, the Traditional/Simplified counterpart, its meanings, and one selectable card per character (character, pinyin in this word, short meaning).
- **Bottom frame**: the selected character's content, the same as its character page (animation, stroke strip, info, composition). One character at a time. The first character is selected by default.
- Selecting a character updates the URL (`#/w/地球/球`) with `replaceState`, so a deep link or Obsidian link opens on that character. A link to the character's own page stays available.
- The character page body is extracted into a shared component used by both pages.

### Words on the character page

- A "Words with 地" section: the top words containing the character, by frequency (around 12, with "show more"), each linking to its word page.
- Built from a `byChar` word index computed lazily from `words.json`.

### Checks

- Unit tests: CC-CEDICT multi-character parsing, word frequency merge, the pinyin word key (`diqiu`, `xian`, `lv`, tones), English word ranking, word route parsing.
- Data spot-check: 地球, 说话/說話, 西安, 了解, 头发/頭髮.
- `words.json` size within 7 MB raw / 3 MB gzip; precache size checked in the build output.
- Browser pass: "earth" in English mode, `diqiu` and `xian` in pinyin mode, the word page character switching, deep link with a selected character, words on 地's page, offline after first load, at phone and desktop widths.
