# REASONS Canvas: Spoken Pinyin (tone sandhi hints)

**Status**: shipped (2026-10-03)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

Dictionary pinyin is the citation form, but some tones change in speech. Pages show the spoken form next to the written one when they differ, so a beginner says 你好 as ní hǎo. Text only, no audio.

### User Stories

- As a beginner, I want to see that 你好 is said ní hǎo, so that I don't learn the citation tones as the spoken ones.
- I want the 一 and 不 tone changes explained on their pages.

### Definition of Done

- [x] Word page: under the pinyin, "spoken: ní hǎo" when it differs; "usually spoken: …" when the result is approximate (three or more third tones in a row).
- [x] Word page cards show the spoken tone for that position, with the citation form next to it (你 → ní, citation nǐ).
- [x] Character page for 一 and 不: a note on their tone changes with example words linking to word pages.
- [x] Character page for any third-tone reading: "Before another 3rd tone it is said as a 2nd tone", with an example word (你好 ní hǎo) linking to its page.

### Edge Cases

| Scenario                      | Expected Behavior                                                             |
| ----------------------------- | ----------------------------------------------------------------------------- |
| 一个 (CC-CEDICT `yi1 ge5`)    | yí ge: 一 becomes yí before a neutral-tone 个, which is a 4th tone underneath |
| 第一, 一 at the end of a word | Unchanged                                                                     |
| Neutral tones (东西 dōngxi)   | Already marked in CC-CEDICT; they break a third-tone run                      |
| No sandhi (地球)              | No "spoken" line                                                              |

### Out of Scope

- Audio (see [device-voice](../device-voice/CANVAS.md)).
- Sentence-level sandhi across word boundaries.

## E — Entities

`spokenTones(chars, tones): { tones: Tone[]; approximate: boolean }` in `src/lib/pinyin/sandhi.ts`.

## A — Approach

Rules, applied to one word's tones (`src/lib/pinyin/sandhi.ts`):

1. **一 yī**: yí before a 4th tone (一个, 一样); yì before tones 1–3 (一天); unchanged after 第, before a numeral, or as the word's last syllable. 一 before a neutral-tone 个/個 counts as before a 4th tone.
2. **不 bù**: bú before a 4th tone (不是, 不要); otherwise unchanged.
3. **Third-tone runs** (consecutive 3rd tones; a neutral tone breaks the run): a run of 2 → the first becomes 2nd tone (你好 ní hǎo); a run of 3 or more → all but the last become 2nd tone, and the result is marked approximate (展览馆 zhán lán guǎn, shown as "usually spoken").

## S — Structure

- `src/lib/pinyin/sandhi.ts` (+ test)
- `src/routes/WordPage.svelte` — spoken line and per-card spoken tones
- `src/components/CharacterInfo.svelte` — notes for 一, 不 and third-tone readings (note texts and examples come from `sandhi.ts`)

---

## O — Operations

- [x] **O1**: `spokenTones` with tests (你好, 很好, 展览馆, 一个, 一天, 一样, 第一, 不是, 不对, 不好, 地球, 东西) (`90e303b`)
- [x] **O2**: Spoken line and per-card spoken tones on the word page; tone-change notes on character pages (`90e303b`)
- [ ] **O3**: Browser pass on 你好, 一个, 展览馆 and the 一/不 character pages (part of character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md).

---

## Change Log

| Date       | Section | Change                                                                                                                                                                                                                                 | Reason                                                                                                |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-10-07 | All     | Migrated from `english-search/PLAN.md` phase 2 step 3 (now in `docs/archive/english-search/`), verified against the code. Rule 3 describes the code ("all but the last"); the old plan said "right to left" — see the migration review | Adopting REASONS canvases                                                                             |
| 2026-10-07 | A       | Decision: keep the code's rule for 3+ third tones (all but the last become 2nd tone, shown as "usually spoken")                                                                                                                        | User decision during the migration review; it matches the common pronunciation (展览馆 zhán lán guǎn) |
