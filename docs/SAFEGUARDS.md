# Safeguards

Non-negotiable boundaries. Every REASONS canvas links here as its second **S** section. Changing one requires an explicit decision recorded in the Change Log below.

## Invariants

- Simplified ↔ Traditional counterparts come only from CC-CEDICT entries, per reading (发 fā → 發, 发 fà → 髮). Never convert character by character.
- The full character set is searchable, not just HSK. The HSK filter is **off by default**; non-HSK characters are hidden only while the user has it on.
- Stroke order is the PRC standard for both scripts, and Traditional pages say so.
- Deep links stay stable, because Obsidian notes point at them: `#/<char>`, `#/w/<word>` and `#/w/<word>/<char>`, `#/search/<query>`, `#/en/<query>`. Hash routes only (GitHub Pages has no SPA fallback).
- Every Simplified character with an HSK level has stroke data. (Some rare Traditional variants inherit an HSK level and have none; they show the "no stroke data" message.)

## Performance Limits

| What                         | Limit                                            | Last measured (2026-10-07)                               |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `dict.json`                  | ≤ 6 MB raw / ≤ 800 KB gzip                       | 5.35 MiB / 758 KiB                                       |
| Dictionary parse + index     | ≤ 200 ms on a mid-range phone                    | not measured on a phone                                  |
| `words.json`                 | ≤ 12 MB raw (precache limit in `vite.config.ts`) | 7.9 MiB / 3.5 MiB gzip                                   |
| Words load, decode and index | In a Web Worker; never blocks the main thread    | ≈ 520 ms on desktop                                      |
| Search results               | ≤ 100 ms after input settles (100 ms debounce)   | lookup < 5 ms                                            |
| JS bundle, excluding data    | ≤ 100 KB gzip                                    | 44.0 KB                                                  |
| Syllable recordings          | ≤ 8 MB in total; whole precache ≤ 22 MB          | 7.30 MiB (1,688 clips); precache 1,707 entries, 20.8 MiB |
| Lighthouse (mobile)          | PWA installable; performance ≥ 90                | not measured                                             |

## Security & Privacy

- **Nothing leaves the browser.** No requests to third-party origins at runtime, including Hanzi Writer's default CDN loader and web fonts. The CSP in `index.html` is `default-src 'self'` (plus inline styles and `data:` images).
- **No tracking.** No analytics, no usage logging, no history of looked-up characters or words. Display preferences in `localStorage` are the only persisted state.
- Text from the URL or the search box is rendered as text, never with `{@html}`.
- **Speech stays on the device.** The 🔊 button only uses a Chinese voice with `localService === true`; voices that send text to a server (e.g. Google's online voices in Chrome) are never used. Recorded clips are the app's own files.
- **Offline**: after the first visit, search, dictionary info and word search work offline. Stroke order works offline for characters viewed once. Stroke files are cached on demand, never precached. Syllable recordings are precached, so pronunciation works offline from the first install.

## Scope Boundaries

Scope lives in [`BRIEF.md`](../BRIEF.md), which stays the source of truth: see its "Out of scope" list (accounts, sync, progress tracking, flashcards/SRS, on-screen writing, example sentences, Taiwan stroke order). A change of scope is decided in `BRIEF.md` first.

## Change Log

| Date       | Safeguard                            | Change                                                                                                  | Reason                                                                         |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 2026-10-07 | All                                  | Collected from `CLAUDE.md`, `BRIEF.md`, the v1 PRD/tech spec and Architecture                           | Migration to REASONS canvases                                                  |
| 2026-10-08 | Privacy, Offline, Performance, Scope | On-device voices only; syllable recordings precached with a size limit; audio removed from out-of-scope | Pronunciation feature approved by the user (device voice + audio-cmn fallback) |
