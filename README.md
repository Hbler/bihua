# Bihua (笔画)

Look up a Chinese character by pinyin and see its stroke order, as a reference while writing by hand.

## Overview

Bihua is a small, personal web app for practicing Chinese handwriting **on paper**. You type a pinyin syllable (`shi`, `shi4`, `shì`) or paste a character, pick the character you want from a frequency-sorted list, and get a page with a stroke animation and a stroke-by-stroke diagram to copy from.

It combines MDBG-style search with the character page layout of strokeorder.com. It supports Simplified and Traditional characters, tags characters with their HSK 3.0 level (with an optional filter), and gives every character a stable URL so it can be linked from notes, e.g. `…/bihua/#/睨`.

There are no accounts, no tracking and no backend. The app is a static site built from open data, installable as a PWA and usable offline.

## Tech Stack

- **Language**: TypeScript (strict)
- **Framework**: Svelte 5, built with Vite
- **Database**: none — static JSON generated at build time
- **Key Dependencies**: `hanzi-writer` (stroke rendering), `hanzi-writer-data` (stroke paths), `vite-plugin-pwa` (offline/installable)
- **Data**: CC-CEDICT, Make Me a Hanzi, Jun Da character frequency, HSK 3.0 (GF0025-2021) lists
- **Testing**: Vitest
- **Hosting**: GitHub Pages via GitHub Actions

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev        # dev server
npm run build      # production build into dist/
npm run preview    # serve the production build
```

### Rebuilding the dictionary data

The generated dictionary (`public/data/dict.json`) is committed. Rebuild it only when updating a data source:

```bash
npm run data:fetch   # download raw sources into data/raw/ (gitignored)
npm run data:build   # generate public/data/dict.json
```

Stroke files are copied from the `hanzi-writer-data` package during `npm run build`; they are not committed.

### Running Tests

```bash
npm test           # Vitest, single run
npm run test:watch
npm run check      # svelte-check + TypeScript
npm run lint
```

## Project Structure

```
bihua/
├── BRIEF.md                 # original project brief (scope source of truth)
├── CLAUDE.md                # instructions for AI assistants
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   └── features/character-lookup/   # PRD + tech spec for v1
├── scripts/data/            # data pipeline (Node + TS, run with tsx)
│   ├── fetch.ts             # downloads raw sources
│   ├── build.ts             # merges sources into dict.json
│   └── sources/             # one parser per source (cedict, mmah, frequency, hsk)
├── data/raw/                # downloaded sources (gitignored)
├── public/
│   └── data/dict.json       # generated character dictionary (committed)
├── src/
│   ├── main.ts
│   ├── App.svelte           # router outlet
│   ├── routes/              # SearchPage, CharacterPage, AboutPage
│   ├── components/          # SearchBar, ResultList, Filters, StrokeAnimation, StrokeSteps, …
│   └── lib/
│       ├── pinyin/          # input parsing, tone marks ↔ numbers
│       ├── search/          # lookup + ranking + filters
│       ├── data/            # types, dictionary loading, stroke loader
│       ├── settings.svelte.ts  # script / HSK filter preferences
│       └── router.svelte.ts    # hash router
└── .github/workflows/deploy.yml
```

## Architecture

```
 build time                                   runtime (browser, offline-capable)
 ─────────                                    ─────────────────────────────────
 CC-CEDICT ─┐                                 dict.json ──► in-memory index ──► SearchPage
 MMAH dict ─┼─► scripts/data/build.ts ─► dict.json                │
 Jun Da ────┤                                                     ▼
 HSK 3.0 ───┘                                 strokes/{char}.json ──► CharacterPage
 hanzi-writer-data ─────────► dist/strokes/   (fetched on demand,     (Hanzi Writer)
                                               cached by service worker)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details and design decisions.

## Contributing

Personal project. Work on `main`; CI runs lint, type check, tests and build on every push, and deploys `main` to GitHub Pages.

## License

Code: MIT.

Data keeps its own licenses and is credited on the in-app About page:

- CC-CEDICT — CC BY-SA 4.0
- Make Me a Hanzi / hanzi-writer-data — Arphic Public License (graphics), LGPL (dictionary data)
- Jun Da character frequency list — see source terms
- HSK 3.0 lists — published standard GF0025-2021
