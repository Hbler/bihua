# REASONS Canvas: Pronunciation (device voice + recorded syllables)

**Status**: in progress (O1 done 2026-10-08)
**Last synced with code**: — (no code yet)

---

## R — Requirements

A speaker button on character and word pages that says the character or word aloud. The device's own Chinese voice is used first; recorded syllable clips, shipped with the app, are the fallback, so pronunciation also works on devices without a usable voice and fully offline. Scope approved by the user on 2026-10-08 (`BRIEF.md` updated).

### User Stories

- As a beginner, I want to hear 你好 said as ní hǎo, so that I learn the spoken tones, not just read them.
- As a learner on a polyphone's page (行 xíng / háng), I want to hear each reading separately, so that I know which sound goes with which meaning.
- As a phone user, I want pronunciation to work offline, like the rest of the app.

### Definition of Done

- [ ] Character page: a 🔊 button right after each reading's pinyin heading (行 → `xíng 🔊` above its meanings, `háng 🔊` above its meanings), so each button says exactly the reading it sits next to. The character's main (first) reading uses the device voice when available; other readings always play the recorded clip for that syllable and tone, because the voice can't be told which reading to use.
- [ ] Word page: a 🔊 button next to the word's pinyin. It uses the device voice for the whole word (the voice applies tone sandhi itself). Without a voice, it plays the clips one after another using the **spoken** tones from spoken-pinyin (你好 → ní hǎo).
- [ ] Device voice: a Mandarin voice with `localService === true` (prefer `zh-CN`, then `zh-TW`; never Cantonese `zh-HK`/`yue`). Online voices are never used.
- [ ] Recorded fallback: 1,688 tone-1–4 syllable clips (covering 1,288 of the dictionary's 1,289 tone-1–4 syllables; only `yo1` 哟 has none) from audio-cmn (Chen Wang, CC BY-SA), shipped with the app and precached, so they work offline from the first install.
- [ ] A button is shown only when it can play something: it is hidden for a reading that needs a clip that doesn't exist (neutral tones, e.g. 吗 ma) and, without a voice, for a word containing such a syllable.
- [ ] The button is a **flat speaker icon**, not an emoji: a small outline SVG (24-unit viewBox, round 2-unit strokes) drawn in `currentColor`, coloured `--muted`, and `--accent` while its sound is playing; about the height of the pinyin text, with a touch target of at least 44 px; `aria-label` "Listen to xíng".
- [ ] One sound at a time: pressing a button stops what's playing; leaving the page stops it.
- [ ] About page credits the recordings: "Syllable recordings by Chen Wang, CC BY-SA (audio-cmn)", with a link.
- [ ] The user confirms on their phone that the device voice works (or that the fallback is used).

### Edge Cases

| Scenario                                        | Expected Behavior                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| No local Mandarin voice (or only online voices) | Clips everywhere                                                               |
| Voices load late (Chrome fills the list async)  | Decide on the first press, after waiting briefly for `voiceschanged`           |
| Voice fails while speaking (`error` event)      | Fall back to clips for that press                                              |
| Neutral-tone reading (了 le, 吗 ma)             | Main reading: voice if available, else hidden; other reading: hidden (no clip) |
| Word with a neutral-tone syllable (东西 dōngxi) | Voice if available; otherwise hidden                                           |
| ü syllables (绿 lǜ)                             | Clip `lv4`, same key as the dictionary                                         |
| Traditional character or word                   | Same behaviour; the voice reads the characters as written                      |
| Offline                                         | Voice (on-device) and clips both work                                          |

### Out of Scope

- Recorded whole-word audio (audio-cmn also has ~8,000 HSK word recordings by Yue Tan, CC BY-SA — possible later).
- A speed control; playback at normal speed.
- Example sentences.

## E — Entities

- **SyllableKey**: `{syllable}{tone}` with ü as `v` — the same keys as `Reading.syllable` + `Reading.tone` (`shuo1`, `lv4`). Only tones 1–4 have clips.
- **Clip set**: `public/audio/syllables/{key}.mp3` (renamed from audio-cmn `cmn-{key}.mp3`), plus `public/audio/syllables.json` listing the available keys, so the app knows without a request whether a clip exists.
- **PlayPlan**: what one press plays — `{ kind: 'voice'; text: string }` or `{ kind: 'clips'; keys: SyllableKey[] }`, or nothing.

## A — Approach

### Choosing what to play (pure, `src/lib/audio/plan.ts`)

- `pickVoice(voices)`: the first voice with `localService` and a Mandarin language (`zh-CN`, `zh_CN`, `cmn-*`, then `zh-TW`), excluding `zh-HK` and `yue`; else `null`.
- `planReading(entry, readingIndex, hasVoice, clips)`: main reading with a voice → voice(`entry.char`); otherwise → clip of that reading if it exists; else nothing.
- `planWord(word, reading, spokenTones, hasVoice, clips)`: voice(`word`) if a voice exists; otherwise clips of each syllable with its spoken tone, or nothing if any clip is missing.

### Playing (`src/lib/audio/speaker.svelte.ts`)

- Voice: `SpeechSynthesisUtterance` with the picked voice, its `lang`, rate 1. On `error`, play the clips plan instead.
- Clips: one `Audio` element, playing the keys in sequence; a new press cancels the current one.
- Stop on route change.

### Shipping the recordings

- `scripts/data/fetch-audio.ts` downloads the 24 kbps syllable set from audio-cmn at the pinned commit `ff9ed3d0c631195bd2c06f39450f3264c7124040`, renames `cmn-{key}.mp3` → `{key}.mp3` (interjection files like `cmn-_hm1.mp3` → `hm1.mp3`; ü after j/q/x/y written with `u`, as in the dictionary — the set has one file named `jv4`, renamed `ju4`), skips tone-5 files (only 19 exist, incomplete), writes `syllables.json`, and adds `public/audio/syllables/LICENSE.txt` naming Chen Wang, CC BY-SA and the source. The files are committed (≈ 7.5 MiB), like `dict.json`, so builds don't depend on GitHub.
- Precache: add the clips and `syllables.json` to the service worker precache (whole precache ≈ 21 MB, limit in `docs/SAFEGUARDS.md`).
- CSP stays `default-src 'self'`; audio files are same-origin.

### Alternatives Considered

- **汉语拼音网 recordings** (yinjie.hanyupinyin.cn): rejected 2026-10-08. No license (only "©"), unclear origin, HTTP only, no neutral tones. Shipping them in a public repo would be redistributing them without permission. Notes from 2026-10-07 are in this canvas's history (`git log`).
- **Clips only, no device voice**: rejected; the voice reads whole words naturally and applies sandhi itself.
- **Caching clips on first play** (like strokes): rejected by the user; precaching makes pronunciation work offline from day one.
- **Using the voice for every reading**: rejected for non-main readings; the voice picks its own reading of a lone character.

### Decisions from review (2026-10-08)

1. Secondary readings use their recording even when a voice exists (a voice reads a lone polyphone with its own default reading, e.g. 行 → xíng). Applies to all 1,230 polyphones: 1,341 of 1,382 secondary readings have a recording; the 41 neutral-tone ones (吧 ba, 么 ma, 过 guo…) get no button.
2. No "recordings only" setting for now; reconsider after the user has heard the phone's voice.

## S — Structure

- **Adds**: `scripts/data/fetch-audio.ts` (+ `npm run data:audio`); `public/audio/syllables/*.mp3`, `syllables.json`, `LICENSE.txt`; `src/lib/audio/plan.ts` (+ test); `src/lib/audio/speaker.svelte.ts`; `src/components/SpeakButton.svelte` (with the inline speaker SVG)
- **Changes**: `src/components/CharacterInfo.svelte` (button per reading); `src/routes/WordPage.svelte` (button by the word's pinyin); `src/routes/AboutPage.svelte` (credit); `vite.config.ts` (precache audio); `docs/SAFEGUARDS.md` (measured sizes)
- **Depends on**: spoken-pinyin (`spokenTones`) for the word fallback

---

## O — Operations

- [x] **O1**: `scripts/data/fetch-audio.ts` + `npm run data:audio`: download the 24 kbps syllable set at the pinned commit, rename (`cmn-` prefix, `_` interjections, `jv4` → `ju4`), skip tone 5, write `syllables.json` and `LICENSE.txt`; commit the files — verify by: 1,688 files, `ju4.mp3` and `lv4.mp3` present, no tone-5 files, total ≤ 8 MB; unit test of the rename rule — done 2026-10-08: 1,688 clips, 7.30 MiB; covers 1,288 of 1,289 dictionary syllables (only yo1 missing)
- [ ] **O2**: `src/lib/audio/plan.ts`: `pickVoice`, `planReading`, `planWord` — verify by: unit tests (voice lists with online-only, Cantonese, zh-CN and zh-TW voices; main vs secondary readings of 行; neutral readings of 的 and 吧 with and without a voice; 你好 clips with spoken tones; a word with a neutral syllable; `lv4`)
- [ ] **O3**: `speaker.svelte.ts` + `SpeakButton.svelte`; buttons after each reading's pinyin (CharacterInfo) and by the word's pinyin (WordPage); stop on navigation; About credit — verify by: unit-free browser check in headless Chrome (no voice there, so clips): 行 xíng/háng play `xing2`/`hang2`, 你好 plays `ni2`+`hao3`, 了's buttons, 的 without a voice has none, a second press stops the first, no external requests
- [ ] **O4**: Precache the clips and `syllables.json`; measure the precache and update `docs/SAFEGUARDS.md` — verify by: build output within limits; offline (server stopped) 行's buttons still play
- [ ] **O5**: User check on the phone: device voice used for main readings and words (or fallback works) — verify by: the user's report

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: voice choice and play plans are pure and unit-tested (fake voice lists, polyphones, neutral tones, ü, sandhi words); playback is checked in the browser.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: only on-device voices; no third-party audio requests; recordings ≤ 8 MB; credit kept with the files and on the About page.

---

## Change Log

| Date       | Section    | Change                                                                                                                              | Reason                                                                          |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 2026-10-07 | R          | Migrated from `english-search/PLAN.md` phase 3 (now in `docs/archive/english-search/`), including the recorded-clip candidate notes | Adopting REASONS canvases                                                       |
| 2026-10-08 | R, E, A, S | Scheduled: device voice first, audio-cmn recordings (CC BY-SA) precached as fallback; 汉语拼音网 rejected (no license)              | User decision; licensing check                                                  |
| 2026-10-08 | R          | Button placement made exact: right after each reading's pinyin heading                                                              | User review                                                                     |
| 2026-10-08 | R          | Flat inline SVG speaker icon instead of the 🔊 emoji                                                                                | User: fit the app's flat UI; emoji render as 3D pictures that differ per device |
