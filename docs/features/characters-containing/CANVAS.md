# REASONS Canvas: Characters Containing a Part

**Status**: draft — requested 2026-10-07, R only; E/A/S/O to be written and reviewed before any code
**Last synced with code**: — (no code yet)

---

## R — Requirements

On a character's page (and the character view inside the word page), list the characters that use this character as part of their composition, placed **before** the "Words with X" list, with the same "Show more" behaviour as the word list. Only shown where it applies, i.e. when at least one character contains it.

### User Stories

- As a learner, I want to see which characters are built from 木 (林, 森, 树, 机…), so that I can recognise and remember related characters by a shared part.

### Definition of Done (draft)

- [ ] A "Characters with 木" section before "Words with 木", one entry per character containing it, each linking to that character's page
- [ ] Ordered like search results (most frequent first), the same page size and "Show more" as the word list
- [ ] Hidden when no character contains this one
- [ ] Respects the script setting like other lists (to be decided in A)

### Open questions for review

- What counts as "contains": only direct leaf components (as shown in Composition today), or also parts nested deeper in the decomposition?
- Which characters to list for a Traditional-only page, and whether component forms without a dictionary entry (⺈) are listed.
- What each entry shows: just the character, or pinyin and short meaning like the word list.

## E — Entities

_To be written._ Starting point: the reverse of `CharEntry.components` (see [character-composition](../character-composition/CANVAS.md)).

## A — Approach

_To be written._

## S — Structure

_To be written._

---

## O — Operations

_Pending: derived once R/E/A/S are approved._

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md).

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md).

---

## Change Log

| Date       | Section | Change                          | Reason          |
| ---------- | ------- | ------------------------------- | --------------- |
| 2026-10-07 | R       | Draft created from user request | Feature request |
