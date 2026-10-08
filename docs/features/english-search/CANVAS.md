# REASONS Canvas: English Search (characters)

**Status**: shipped (2026-10-03)
**Last synced with code**: 2026-10-07 (commit 4becfc9)

---

## R — Requirements

Search by English meaning ("earth") and get every character with that meaning, ranked, so near-synonyms (地 dì, 土 tǔ) can be compared side by side. This extended v1 without changing its scope (`BRIEF.md` listed English search under "Possible later").

### User Stories

- As a learner, I want to type "earth" and see 地, 土, 尘, 壤 together, so that I can tell near-synonyms apart.
- I want to see which sense matched and whether it's literary or courteous, so that I pick the everyday character.

### Definition of Done

- [x] A `拼 | EN` toggle next to the search bar; the mode is remembered (`Settings.searchMode`, default pinyin).
- [x] The placeholder follows the mode: "Pinyin (shi, shi4, shì) or a character" / "English meaning (earth, to eat)".
- [x] Pasting a character opens its page in either mode.
- [x] Deep links keep the mode: `#/en/<query>`.
- [x] Results reuse the result list but show **the gloss that matched**, not `meanings[0]` (尘 shows "earth", not "dust").
- [x] Results show a count and are grouped **Exact** first, then **Related**.
- [x] Register labels (literary, archaic, courteous, …) show as tags in results and on the character page.
- [x] Script, HSK and handwriting filters apply unchanged.
- [x] Nothing found: "No character or word has that meaning. Try a simpler word."

### Edge Cases

| Scenario                                     | Expected Behavior                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Query that is also pinyin (`he`, `an`, `ma`) | The mode toggle decides; no auto-detection                                   |
| Multi-word query ("to eat", "bank up")       | Matched as a phrase ("to eat" → "eat"; "bank up" → 培)                       |
| Glosses that are cross-references or labels  | `variant of …`, `see …`, `surname …`, `CL:…` are never matched               |
| Same tier, several characters                | Frequency decides; position of the gloss in the reading is the last tiebreak |
| Plural query (`earths`)                      | No match for the plural form (no stemming; open question below)              |

### Out of Scope

- Words: added by [word-search](../word-search/CANVAS.md) (the "Words" group under character results).
- Stemming / plural fallback (open question).

## E — Entities

No new data: the index is built from `Reading.meanings` already in `dict.json` (see [ARCHITECTURE.md › Domain Model](../../ARCHITECTURE.md#domain-model)).

- **English index**: `Map<token, Posting[]>`, each posting `{ entry, readingIndex, glossIndex, tier info }`, per-tier ordering precomputed like `bySyllable`.
- **Register label**: one of literary, archaic, classical, old, dialect, Cantonese, Taiwan, colloquial, slang, formal, courteous, polite, honorific, humble, derogatory, vulgar, euphemism, fig. (`src/lib/search/register.ts`).

## A — Approach

### Normalization (`src/lib/search/english.ts`)

1. Split each CC-CEDICT gloss on `;`.
2. Skip cross-references and labels: `variant of …` (and `old variant of …`), `see …`, `surname …`, `CL:…`.
3. Lowercase; strip parentheticals such as `(literary)`, `(bound form)`, `(fig.)`; strip a leading `to `, `a `, `the `.

### Ranking

First matching tier wins, then frequency within the tier, then gloss position:

| Tier | Rule                                     | "earth" example        |
| ---- | ---------------------------------------- | ---------------------- |
| 1    | Normalized gloss equals the query        | 地, 土, 尘, 壤         |
| 2    | Gloss starts with the query as a word    | "earth embankment" 埝  |
| 3    | Query appears as a whole word in a gloss | "red earth used for …" |

Within a tier, glosses with a register label rank after unlabelled ones. Glosses are matched normalized but displayed as written.

### Performance

The index is built lazily on the first English search (`getOrBuildEnglishIndex`, cached per dictionary), ≈ 130 ms on desktop, so startup stays within the dictionary budget.

### Open question

- Plural fallback (`earths` → `earth`)? Not implemented.

### Alternatives Considered

- Auto-detecting English vs pinyin: rejected; many English words are valid pinyin (`he`, `an`, `men`, `ma`, `long`, `fan`, `can`, `bin`, `pin`, `die`).

## S — Structure

- `src/lib/search/english.ts` (+ test), `src/lib/search/register.ts` (+ test)
- `src/lib/settings.svelte.ts` — `searchMode`
- `src/lib/route.ts` — `english-search` route, `#/en/<q>` (+ route test)
- `src/components/SearchBar.svelte` — mode toggle and placeholders
- `src/routes/SearchPage.svelte` — English results, Exact/Related groups, empty state; `ResultList` shows the matched gloss and register tags; `CharacterInfo` shows register tags

---

## O — Operations

- [x] **O1**: Normalization, index and tier ranking with unit tests (fixture: 地, 土, 尘/塵, 埝, a `variant of` entry) (`8de944a`)
- [x] **O2**: Register labels as tags, ranked after unlabelled glosses within a tier (`8de944a`)
- [x] **O3**: Mode toggle, `searchMode` setting, `#/en/<q>` route with tests, grouped results UI (`8de944a`)
- [x] **O4**: Index build time measured on the real `dict.json` (≈ 130 ms desktop)
- [ ] **O5**: Browser pass: earth, water, eat, to eat, big, he (both modes), at phone and desktop widths (part of character-lookup O11)

---

## N — Norms

Follows [docs/CONVENTIONS.md](../../CONVENTIONS.md). Feature-specific: normalization, tiers, phrase queries and filters are unit-tested.

## S — Safeguards

Bound by [docs/SAFEGUARDS.md](../../SAFEGUARDS.md). Feature-specific: the English index is never built at startup.

---

## Change Log

| Date       | Section | Change                                                                                                                                                                                             | Reason                    |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-10-07 | All     | Migrated from `english-search/PLAN.md` phase 1 (now in `docs/archive/english-search/`), verified against the code; empty-state text updated to the code's "No character or word has that meaning…" | Adopting REASONS canvases |
