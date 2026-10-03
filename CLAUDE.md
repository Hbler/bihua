# AI Assistant Instructions

## Project Overview

Bihua is a personal, static web app: search a Chinese character by pinyin (or paste it), pick it from a frequency-sorted list, and see its stroke order (animation + stroke-by-stroke strip) to copy by hand on paper. Simplified and Traditional, HSK 3.0 tags with an optional filter, deep link per character.

`BRIEF.md` is the scope source of truth. If a request conflicts with its "Out of scope" list (accounts, tracking, flashcards/SRS, on-screen writing, audio, example sentences, Taiwan stroke order), point that out before building it.

The user is a beginner Mandarin learner (Simplified, pinyin) who also reads a xianxia novel, so rare characters (睥, 睨) matter as much as HSK ones.

## Tech Stack & Conventions

### Language: TypeScript

- `strict: true`; no `any` — use `unknown` and narrow.
- Plain functions and types; no classes unless wrapping a stateful library.
- Pure logic (pinyin, search, data build) lives in `.ts` files with no DOM or Svelte imports, so it is unit-testable.

### Framework: Svelte 5

- Use runes: `$state`, `$derived`, `$effect`, `$props`. Do not use legacy `export let`, `$:` or Svelte stores.
- Shared reactive state lives in `*.svelte.ts` modules (`settings.svelte.ts`, `router.svelte.ts`).
- Keep `$effect` for real side effects only (Hanzi Writer mounting, localStorage writes). Derive everything else with `$derived`.
- Components are small and presentational; logic goes in `src/lib/`.

### Hanzi Writer

- Always load stroke data through the custom `charDataLoader` in `src/lib/data/strokes.ts` (fetches `${import.meta.env.BASE_URL}strokes/{char}.json`). Never let Hanzi Writer fetch from its default CDN — the app must work offline.
- The stroke-step strip renders SVG paths from the loaded data directly; it does not create one Hanzi Writer instance per frame.

## Code Style

- Files: Svelte components `PascalCase.svelte`; TS modules `kebab-case.ts`; tests next to the code as `*.test.ts`.
- Names: `camelCase` for variables/functions, `PascalCase` for types and components, `SCREAMING_SNAKE_CASE` for module-level constants.
- Imports: external packages, then `$lib/...` aliases, then relative; one blank line between groups. Prettier + ESLint enforce formatting.
- See `docs/CONVENTIONS.md` for details.

## Common Operations

### Adding a UI feature

1. Put any non-trivial logic in `src/lib/<area>/` with a colocated test.
2. Add or extend a component in `src/components/`.
3. Wire it into the relevant page in `src/routes/`.
4. Run `npm run check && npm test`.

### Changing the dictionary data

1. Edit the relevant parser in `scripts/data/sources/` or the merge in `scripts/data/build.ts`.
2. If `CharEntry` changes, update `src/lib/data/types.ts` (shared by the build script and the app).
3. `npm run data:build`, then check the diff of `public/data/dict.json` for a few known characters (了, 行, 发, 說, 睨), and `public/data/words.json` for a few words (地球, 说话, 西安, 头发).
4. Commit the regenerated `dict.json` and `words.json` together with the code change.

### Running tests

- `npm test` — Vitest. Pinyin parsing and search ranking must stay fully covered by tests.
- `npm run check` — svelte-check / TS.

### Database operations

None. All data is static JSON.

## Important Files

- `BRIEF.md`: scope and decisions.
- `src/lib/data/types.ts`: `CharEntry` and related types — the contract between the data build and the app.
- `src/lib/pinyin/parse.ts`: user input → `{ syllable, tone }` or a character.
- `src/lib/search/search.ts`: lookup, filtering, ranking.
- `src/lib/data/strokes.ts`: offline stroke loader for Hanzi Writer.
- `scripts/data/build.ts`: generates `public/data/dict.json` and `public/data/words.json`.
- `src/lib/data/words.worker.ts`, `src/lib/search/words.ts`: word loading and search (Web Worker + pure logic).
- `docs/features/english-search/PLAN.md`: English search, words, word page, tone sandhi.
- `vite.config.ts`: `base: '/bihua/'`, PWA config, stroke file copy.

## Things to Avoid

- Naive Simplified↔Traditional conversion (char-by-char maps). Counterparts come only from CC-CEDICT entries, per reading (发 fā → 發, 发 fà → 髮).
- Hiding non-HSK characters by default. The HSK filter is off unless the user turns it on.
- Precaching all stroke files in the service worker (thousands of files). They are cached on demand.
- Analytics, telemetry, external fonts/CDNs at runtime, or anything that sends data out.
- Adding a backend, accounts or progress tracking.
- Path-based routing — GitHub Pages needs hash routes.

## Terminology

| Term             | Meaning                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Syllable         | Toneless pinyin key, ASCII, ü written as `v` (`shi`, `lv`, `lve`)       |
| Tone             | 1–4, 5 = neutral tone                                                   |
| Reading          | One pronunciation of a character with its meanings and counterparts     |
| Polyphone        | Character with more than one reading (了 le / liǎo)                     |
| Counterpart      | The other-script form(s) of a character for a given reading (说 ↔ 說)   |
| Script           | `S` Simplified-only, `T` Traditional-only, `ST` identical in both       |
| Stroke strip     | Row of frames building the character one stroke at a time               |
| HSK level        | HSK 3.0 level 1–6, or 7 meaning the 7–9 band                            |
| Handwriting list | HSK 3.0 subset of characters a learner is expected to write by hand     |
| 田字格           | Square practice grid divided into four, drawn faintly behind characters |
