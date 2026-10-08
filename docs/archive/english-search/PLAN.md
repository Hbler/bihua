> **Archived 2026-10-07**, superseded by [english-search](../../features/english-search/CANVAS.md), [word-search](../../features/word-search/CANVAS.md), [word-page](../../features/word-page/CANVAS.md), [spoken-pinyin](../../features/spoken-pinyin/CANVAS.md), [words-on-character-page](../../features/words-on-character-page/CANVAS.md) and [device-voice](../../features/device-voice/CANVAS.md). Kept for history only; the canvases are the source of truth.

# English search

Search by English meaning ("earth") and get every character with that meaning, ranked, so near-synonyms (地 dì, 土 tǔ) can be compared side by side.

`BRIEF.md` lists English-meaning search under "Possible later", so phase 1 extends v1 without changing its scope. Phase 2 (words) changes the scope: the app becomes a word dictionary as well as a character one. It was approved on 2026-10-03.

**Status (2026-10-03)**

- [x] Phase 1: characters (`8de944a`)
- [x] Phase 2 step 1: word data (`8487fa5`)
- [x] Phase 2 step 2: word search (`14592bc`)
- [x] Phase 2 step 3: word page and spoken pinyin (`90e303b`)
- [x] Phase 2 step 4: words on the character view
- [ ] Browser pass on phone and desktop (see the Checks sections)
- [ ] Phase 3: device voice (not scheduled)

## Phase 1: characters

Additions made during review: register labels (literary, courteous, …) are shown as tags in results and on the character page, and glosses with a register label rank after unlabelled ones within a tier (`src/lib/search/register.ts`).

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

As built: 92,383 rows, 40,631 with a SUBTLEX-CH rank, 3,361 proper nouns kept, **7.9 MB raw / 3.5 MB gzip**. The user accepted the larger size for the sake of runtime speed. Compact row format: `[simplified form, [[numbered pinyin, meanings, traditional forms?]], rank or 0]` (`WordRow` in `src/lib/data/types.ts`), decoded in the app by `decodeWords`. One row per word pair: Traditional forms are reached through the counterparts, never stored as separate rows.

- All CC-CEDICT multi-character entries except proper nouns (capitalised pinyin): about 92k words, 6.5 MB raw / 2.9 MB gzip.
- Ranked by a **word frequency list (SUBTLEX-CH word list)**. Words missing from it go last, ordered by the average frequency of their characters. Confirm the list's URL and terms and record them on the About page.
- Same reading model as characters: per-word pinyin, glosses and Traditional/Simplified counterpart from the same CC-CEDICT entry (说话 ↔ 說話).
- Built by `scripts/data/build.ts` next to `dict.json`. New `WordEntry` type in `src/lib/data/types.ts`.
- **Precached** by the service worker with the app shell and `dict.json`, so word search works offline from the first install.

### Search

As built: words load, decode and index in a Web Worker (`src/lib/data/words.worker.ts`) started when the browser is idle after the dictionary loads (about 520 ms on desktop, off the main thread). The English word index stores single tokens only. Tiers and phrases are checked at query time, because a phrase index for 92k words took 1.3 s and 1.5M keys. Queries take under 1 ms.

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

### Spoken pinyin (tone sandhi hint)

As built, one difference from the rules below: CC-CEDICT writes 一个 as `yi1 ge5`, so 一 also becomes yí before a neutral-tone 个/個 (个 is a 4th tone underneath).

Dictionary pinyin is the citation form. Some tones change in speech, so pages show the spoken form under the written one when they differ. Text only, no audio.

- Pure module `src/lib/pinyin/sandhi.ts` with colocated tests: `spokenTones(syllables, tones): Tone[]`. It applies these rules:
  - **Third tone before a third tone** becomes second: 你好 nǐ hǎo → ní hǎo. For chains of three or more (展览馆, 我也很好), apply the rule right to left as an approximation, and mark the result as approximate so the UI can say "usually".
  - **一 yī**: yí before a 4th tone (一个 yí ge, 一样 yíyàng); yì before tones 1–3 (一天 yìtiān); unchanged at the end of a word, in ordinals (第一) and as a number in a sequence. Without the context, it is unchanged when 一 is the word's last character.
  - **不 bù**: bú before a 4th tone (不是 bú shì, 不要 bú yào).
  - Neutral tones are already marked in CC-CEDICT and need no rule.
- **Word page**: under the word's pinyin, "spoken: ní hǎo" when the spoken form differs. The character cards in the top frame show the spoken tone for that position (好 in 你好 stays hǎo, 你 shows ní, with the citation form nǐ next to it).
- **Character page**: for 一 and 不, a short note on the tone changes ("yí before a 4th tone, yì before tones 1–3"). For any 3rd-tone reading, one line: "Before another 3rd tone, said as 2nd tone (你好 ní hǎo)". The note links to an example word page.
- Tests: 你好, 很好, 展览馆, 一个, 一天, 一样, 第一, 不是, 不对, 不好, words without sandhi (地球), and words with a neutral tone (东西 dōngxi).

### Words on the character page

As built: the section is part of `CharacterView`, so it also appears for the selected character on the word page, which leaves out its own word. The character index is built in the worker on its first use (about 50 ms). Traditional-only characters list Traditional forms, picking the form that contains the character (裡 → 這裡, not 這裏).

- A "Words with 地" section: the top words containing the character, by frequency (around 12, with "show more"), each linking to its word page.
- Built from a `byChar` word index computed lazily from `words.json`.

### Checks

- Unit tests: CC-CEDICT multi-character parsing, word frequency merge, the pinyin word key (`diqiu`, `xian`, `lv`, tones), English word ranking, word route parsing.
- Data spot-check: 地球, 说话/說話, 西安, 了解, 头发/頭髮.
- `words.json` size within 7 MB raw / 3 MB gzip; precache size checked in the build output.
- Browser pass: "earth" in English mode, `diqiu` and `xian` in pinyin mode, the word page character switching, deep link with a selected character, words on 地's page, offline after first load, at phone and desktop widths.

## Phase 3: device voice (later, not scheduled)

A 🔊 button on the character and word pages that reads the character or word aloud with the device's own Chinese voice (Web Speech API, `speechSynthesis`). A voice engine applies tone sandhi to whole words by itself. `BRIEF.md` lists audio as out of scope, so this changes the scope when it is scheduled.

- **On-device voices only**: use a `zh-CN` voice with `localService === true`. Some voices (Google's in Chrome) send the text to a server, which breaks the "nothing leaves the browser" rule. If no local voice exists, hide the button and explain why on the About page.
- Polyphones: a lone character is read with the engine's default reading (行 → xíng). On the character page, speak an example word for non-default readings instead, or disable the button for those readings.
- Rate setting tied to the existing animation speed setting, or its own 0.75× / 1× control.
- No audio files ship with the app. Recorded syllable clips (about 1,500 files, 10–15 MB) are the fallback only if device voices turn out too poor; their licensing would need checking first.

### Candidate source for recorded clips: 汉语拼音网 syllable chart

Found 2026-10-07: http://yinjie.hanyupinyin.cn/ — a clickable pinyin syllable chart (pick a tone, tap a syllable to hear it). Checked on the site itself:

- **Files**: one MP3 per syllable and tone at `http://yinjie.hanyupinyin.cn/duyinjie/{syllable}{tone}.mp3`, with `ü` written as `v` (`ma1.mp3`, `lv4.mp3`). MP3, 192 kbps, 44.1 kHz stereo, about 0.7 s and 11–17 KB each.
- **Coverage**: tones 1–4 only. There is no neutral-tone file (`ma5.mp3` → 404), so 吗 ma, 了 le etc. would need another solution.
- **Size**: about 1,300 tonal syllables × ~14 KB ≈ 18 MB as served; re-encoded to mono 64 kbps it would be about a third of that.
- **HTTP only**: the site refuses HTTPS. Bihua is served over HTTPS, so browsers would block these files if linked directly (mixed content). Linking to them would also break offline use and tell a third-party server which syllables are looked up. If used, the clips must be downloaded once at build time and shipped with the app.
- **Licensing: unknown, not cleared.** The page only shows "© yinjie.hanyupinyin.cn" and a Chinese ICP registration number (蜀ICP备10040643号-30); there is no license or terms of use. Its player code looks copied from another site's pinyin chart (it carries another site's analytics ID and "subscriber" code), so it's unclear who recorded the clips. Do not ship them without written permission from the site owner, or find an openly licensed set instead.
