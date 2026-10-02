# Code Conventions

## Naming

### Files

- Svelte components: `PascalCase.svelte` (`StrokeSteps.svelte`).
- TypeScript modules: `kebab-case.ts` (`tone-marks.ts`).
- Modules with runes: `kebab-case.svelte.ts` (`settings.svelte.ts`).
- Tests: same name with `.test.ts`, next to the module (`parse.test.ts`).
- Data pipeline sources: one file per dataset, named after it (`cedict.ts`, `mmah.ts`, `frequency.ts`, `hsk.ts`).

### Variables

- `camelCase`. Booleans read as questions: `hasStrokes`, `isTraditional`, `showHskOnly`.
- Chinese characters in code are fine in tests and fixtures; use the `char` name for a single character string.

### Functions

- `camelCase`, verb first: `parseQuery`, `loadDictionary`, `toToneMarks`.
- Pure functions return values; they don't mutate inputs.

### Components/Classes

- Components: `PascalCase`, named for what they show (`ResultList`, `CharacterInfo`), not how.
- Types: `PascalCase`, no `I` prefix (`CharEntry`, `Reading`, `ParsedQuery`).
- Constants: `SCREAMING_SNAKE_CASE` (`SYLLABLES`, `DEFAULT_SETTINGS`).

## Structure

### Directory Organization

- `src/routes/` — one component per route; composes components, no business logic.
- `src/components/` — reusable UI pieces; receive data through `$props`.
- `src/lib/<area>/` — pure TypeScript by domain (`pinyin`, `search`, `data`); no Svelte or DOM imports except `lib/data/strokes.ts` (uses `fetch`).
- `src/lib/*.svelte.ts` — shared reactive state.
- `scripts/data/` — Node-only code; may import `src/lib/data/types.ts` and the pure `src/lib/pinyin/` module, nothing else from `src/`.

### File Structure

Svelte component order:

```svelte
<script lang="ts">
  // 1. imports
  // 2. $props
  // 3. $state
  // 4. $derived
  // 5. functions
  // 6. $effect
</script>

<!-- markup -->

<style>
  /* scoped styles; use CSS custom properties from src/styles/tokens.css */
</style>
```

## Patterns

### Shared state in `.svelte.ts`

```ts
// settings.svelte.ts
export const settings = $state<Settings>(loadSettings())

$effect.root(() => {
  $effect(() => saveSettings($state.snapshot(settings)))
})
```

Components import `settings` and read/write fields directly.

### Parse, don't validate

User input goes through `parseQuery()` once and becomes a tagged union:

```ts
type ParsedQuery =
  | { kind: 'char'; char: string }
  | { kind: 'pinyin'; syllable: string; tone?: Tone }
  | { kind: 'invalid'; input: string }
  | { kind: 'empty' }
```

Everything downstream switches on `kind`.

### Library wrappers own their lifecycle

Components that wrap Hanzi Writer create the instance in an `$effect`, return a cleanup that removes it, and recreate it when the character changes.

### Styling

- Mobile first; plain CSS with custom properties for colors and spacing; light and dark themes via `prefers-color-scheme`.
- Han characters use a CJK font stack (`"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`; TC variants on Traditional pages via `lang="zh-Hant"`). Set `lang` on elements containing Chinese.
- Touch targets ≥ 44 px.

## Anti-Patterns

### Don't: put logic in components

Ranking, parsing or filtering inside a `.svelte` file can't be unit-tested. Move it to `src/lib/` and call it.

### Don't: use legacy Svelte syntax

No `export let`, `$:`, or `writable()` stores. Use runes.

### Don't: convert scripts character by character

Use the per-reading `counterparts` from the dictionary.

### Don't: fetch from third-party origins at runtime

Including Hanzi Writer's default CDN loader and web fonts. The app must work offline and send nothing out.

### Don't: add tracking

No analytics, no usage logging, no history of looked-up characters. Preferences in `localStorage` are the only persisted state.
