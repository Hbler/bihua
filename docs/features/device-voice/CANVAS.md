# REASONS Canvas: Device Voice

**Status**: planned, not scheduled — R and notes only; E/A/S/O are written and reviewed when it's scheduled
**Last synced with code**: — (no code yet)

---

## R — Requirements

A 🔊 button on the character and word pages that reads the character or word aloud with the device's own Chinese voice, so pronunciation (including tone sandhi in words) can be heard, not only read.

`BRIEF.md` lists audio as out of scope, so scheduling this changes the scope: update `BRIEF.md` first.

### Constraints known so far

- **On-device voices only**: use a `zh-CN` voice with `localService === true`. Some voices (Google's in Chrome) send the text to a server, which breaks "nothing leaves the browser" (`docs/SAFEGUARDS.md`). If no local voice exists, hide the button and explain why on the About page.
- A voice engine applies tone sandhi to whole words by itself.
- Polyphones: a lone character is read with the engine's default reading (行 → xíng). On the character page, speak an example word for non-default readings instead, or disable the button for those readings.
- Rate: tied to the existing animation speed setting, or its own 0.75× / 1× control.
- No audio files ship with the app. Recorded syllable clips (about 1,500 files, 10–15 MB) are a fallback only if device voices turn out too poor; their licensing must be cleared first.

### Candidate source for recorded clips: 汉语拼音网 syllable chart

Found 2026-10-07: http://yinjie.hanyupinyin.cn/ — a clickable pinyin syllable chart (pick a tone, tap a syllable to hear it). Checked on the site itself:

- **Files**: one MP3 per syllable and tone at `http://yinjie.hanyupinyin.cn/duyinjie/{syllable}{tone}.mp3`, with `ü` written as `v` (`ma1.mp3`, `lv4.mp3`). MP3, 192 kbps, 44.1 kHz stereo, about 0.7 s and 11–17 KB each.
- **Coverage**: tones 1–4 only. There is no neutral-tone file (`ma5.mp3` → 404), so 吗 ma, 了 le etc. would need another solution.
- **Size**: about 1,300 tonal syllables × ~14 KB ≈ 18 MB as served; re-encoded to mono 64 kbps it would be about a third of that.
- **HTTP only**: the site refuses HTTPS. Bihua is served over HTTPS, so browsers would block these files if linked directly (mixed content). Linking to them would also break offline use and tell a third-party server which syllables are looked up. If used, the clips must be downloaded once at build time and shipped with the app.
- **Licensing: unknown, not cleared.** The page only shows "© yinjie.hanyupinyin.cn" and a Chinese ICP registration number (蜀ICP备10040643号-30); there is no license or terms of use. Its player code looks copied from another site's pinyin chart (it carries another site's analytics ID and "subscriber" code), so it's unclear who recorded the clips. Do not ship them without written permission from the site owner, or find an openly licensed set instead.

## E — Entities

_To be written when scheduled._

## A — Approach

_To be written when scheduled._

## S — Structure

_To be written when scheduled._

---

## O — Operations

_Pending: derived once R/E/A/S are approved._

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: only on-device voices; no third-party audio requests.

---

## Change Log

| Date       | Section | Change                                                                                                                              | Reason                    |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-10-07 | R       | Migrated from `english-search/PLAN.md` phase 3 (now in `docs/archive/english-search/`), including the recorded-clip candidate notes | Adopting REASONS canvases |
