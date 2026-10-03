# Bihua (笔画) — project brief

## What it is

A personal, responsive web app for looking up a Chinese character and seeing its stroke order, used as a reference while writing the character **by hand on paper**. Search like MDBG, character page like strokeorder.com.

Personal use for now. No accounts, no tracking, no progress, no backend.

## Context

The user is a beginner Mandarin learner (paid course + Duolingo) who also reads a xianxia web novel (九星霸体诀) with notes kept in Obsidian. So lookups often hit characters outside any HSK list (e.g. 睥, 睨) — the app must handle the full character set, not just HSK.

## Core features (v1)

### Search

- Input accepts:
  - toneless pinyin: `shi`
  - tone numbers: `shi4`
  - tone marks: `shì`
  - ü as `v`, `u:` or `ü`: `lv`, `lü`
  - a pasted character (Simplified or Traditional) → jump straight to its page
- Results: every character with that reading, **sorted by frequency** (是 before 噬).
- Polyphonic characters appear under each reading (了 → le and liǎo; 行 → xíng and háng).
- Each result shows: character, pinyin, short meaning, HSK level tag (if any), and its Simplified/Traditional counterpart.
- Script toggle: **Simplified (default) / Traditional / Both**.
- HSK filter toggle: **off by default**. When on, filter by level; non-HSK characters are hidden only while it's on.
  - Extra filter option: "HSK handwriting list only" (characters you're expected to write at that level).

### Character page

- Large stroke animation with replay and speed control (Hanzi Writer).
- **Stroke-step strip**: one frame per stroke, the character building up, current stroke highlighted. This is the main thing used while writing on paper.
- Pinyin (all readings), meanings, radical, stroke count, HSK 3.0 level.
- Link to the counterpart form (说 ↔ 說).
- Composition: the parts the character is made of and its radical, each linking to its own page, with the etymology (meaning/sound roles, hint). See `docs/features/character-composition/PLAN.md`.
- Traditional pages show a small note: "Stroke order follows the PRC standard" (Taiwan MOE order differs for some characters, e.g. 必).
- Characters without stroke data: still show the character + dictionary info, with a "no stroke data" message instead of the animation/strip.

### Deep links

- Every character has a stable URL, e.g. `/#/睨`, so the user can link from Obsidian glossary notes.

### Platform

- Responsive: desktop, tablet, phone.
- Installable PWA, works fully offline.
- Static site; free hosting (GitHub Pages / Netlify / Cloudflare Pages).

### English and word search

- A `拼 / EN` toggle on the search bar: search characters and words by English meaning. Several pinyin syllables find words (`diqiu` → 地球).
- Word pages show the word's meaning and its characters, with one character's stroke order at a time. Each character page lists words containing it.
- Word and character pages show the spoken pinyin when tone sandhi changes it (你好 nǐ hǎo → ní hǎo). Text only, no audio.
- See `docs/features/english-search/PLAN.md`.

## Data sources

| Need                                 | Source                                                              | License note                                                           |
| ------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Stroke paths, radical, decomposition | Make Me a Hanzi / `hanzi-writer-data`                               | Arphic Public License (graphics) — fine for a free app; include notice |
| Stroke rendering/animation           | Hanzi Writer                                                        | MIT                                                                    |
| Readings, meanings, S↔T mapping      | CC-CEDICT                                                           | CC BY-SA 4.0 — attribute                                               |
| Frequency ranking                    | Jun Da character frequency list (or SUBTLEX-CH)                     | check terms                                                            |
| Word frequency                       | SUBTLEX-CH word list                                                | check terms                                                            |
| HSK levels                           | HSK 3.0 (GF0025-2021) character list + handwriting list, levels 1–9 | public standard                                                        |

A build step should preprocess these into compact static JSON (pinyin index, per-character entries), so the app ships no raw dictionaries.

## Key decisions already made

- **HSK 3.0**, not 2.0 (official per-level character list + handwriting list).
- **Simplified and Traditional**, Simplified default.
- **PRC stroke order** for both scripts (Hanzi Writer data). Taiwan MOE order is out of scope.
- S↔T mapping comes from CC-CEDICT entries (handles one-to-many: 发 → 發/髮, 干 → 乾/幹/干), never naive character conversion.
- Traditional characters inherit the HSK level of their Simplified counterpart.

## Out of scope (v1)

- Accounts, sync, progress tracking, spaced repetition, flashcards
- Handwriting input / on-screen writing practice
- Example sentences, audio (a device-voice button is planned for later: `docs/features/english-search/PLAN.md`, Phase 3)
- Taiwan stroke order, TOCFL tags
- Printable practice sheets (possible later)

## Possible later

- Printable 田字格 practice sheets for a character
- TOCFL tags for Traditional
