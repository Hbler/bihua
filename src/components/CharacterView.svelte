<!-- Character view: stroke animation, info, composition, stroke strip. -->
<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary.js'
  import { loadStrokes, type StrokeResult } from '$lib/data/strokes.js'
  import type { Tone } from '$lib/data/types.js'
  import {
    filterWordHits,
    isWordExcluded,
    wordScriptForChar,
    type WordHit,
  } from '$lib/search/words.js'
  import { settings } from '$lib/settings.svelte.js'
  import { retryWords, wordsContainingChar } from '$lib/words.svelte.js'

  import CharacterInfo from './CharacterInfo.svelte'
  import CompositionSection from './CompositionSection.svelte'
  import StrokeAnimation from './StrokeAnimation.svelte'
  import StrokeSteps from './StrokeSteps.svelte'
  import WordList from './WordList.svelte'

  interface Props {
    dict: Dictionary
    char: string
    reading?: { syllable: string; tone: Tone }
    excludeWord?: string
  }

  let { dict, char, reading, excludeWord }: Props = $props()

  const entry = $derived(dict.byChar.get(char))
  const lang = $derived(entry?.script === 'T' ? 'zh-Hant' : 'zh-Hans')
  const isComponent = $derived.by(() => {
    if (!entry || entry.readings.length === 0) {
      return [...dict.byChar.values()].some((e) => e.components.includes(char))
    }
    return false
  })

  let strokes = $state<StrokeResult | 'loading'>('loading')

  $effect(() => {
    const current = char
    strokes = 'loading'
    loadStrokes(current).then((result) => {
      if (current === char) strokes = result
    })
  })

  let rawWordHits = $state<WordHit[]>([])
  let wordStatus = $state<'loading' | 'ready' | 'error'>('loading')

  function loadWords(target: string): void {
    wordStatus = 'loading'
    wordsContainingChar(target)
      .then((hits) => {
        if (target === char) {
          rawWordHits = hits
          wordStatus = 'ready'
        }
      })
      .catch(() => {
        if (target === char) {
          rawWordHits = []
          wordStatus = 'error'
        }
      })
  }

  $effect(() => {
    loadWords(char)
  })

  function handleRetryWords(): void {
    retryWords()
    loadWords(char)
  }

  const rawFilteredHits = $derived(
    excludeWord
      ? rawWordHits.filter((hit) => !isWordExcluded(hit.entry, excludeWord))
      : rawWordHits,
  )
  const wordHits = $derived(filterWordHits(rawFilteredHits, dict, settings))
  const wordScript = $derived(wordScriptForChar(entry?.script, settings.script))
</script>

{#if !entry && !isComponent && strokes !== 'loading' && strokes.kind === 'missing'}
  <section class="not-found">
    <p class="big" {lang}>{char}</p>
    <p>This character isn't in the dictionary.</p>
    <a href="#/">Back to search</a>
  </section>
{:else}
  <div class="layout">
    <section class="strokes">
      {#if strokes === 'loading'}
        <div class="placeholder"></div>
      {:else if strokes.kind === 'ok'}
        {#key char}
          <StrokeAnimation {char} />
        {/key}
      {:else}
        <p class="big" {lang}>{char}</p>
      {/if}
    </section>

    <section class="info">
      <h1 {lang}>{char}</h1>
      {#if entry?.script === 'T'}
        <p class="note">Stroke order follows the PRC standard; Taiwan's may differ.</p>
      {/if}
      {#if entry}
        <CharacterInfo {entry} {reading} />
        {#if entry.readings.length === 0}
          <p class="note">
            {isComponent
              ? 'Component form — no dictionary entry.'
              : 'No dictionary entry for this character.'}
          </p>
        {/if}
        <CompositionSection {entry} {dict} />
      {:else}
        <p class="note">
          {isComponent
            ? 'Component form — no dictionary entry.'
            : 'No dictionary entry for this character.'}
        </p>
      {/if}

      {#if wordStatus === 'loading'}
        <section class="words">
          <h2>Words with {char}</h2>
          <p class="status">Loading words…</p>
        </section>
      {:else if wordStatus === 'error'}
        <section class="words">
          <h2>Words with {char}</h2>
          <div class="status-error">
            <p>Couldn't load words.</p>
            <button type="button" class="retry-btn" onclick={handleRetryWords}>Retry</button>
          </div>
        </section>
      {:else if wordHits.length > 0}
        <section class="words">
          <h2>Words with {char}</h2>
          <WordList hits={wordHits} pageSize={12} highlight={char} script={wordScript} />
        </section>
      {/if}
    </section>
  </div>

  {#if strokes !== 'loading'}
    {#if strokes.kind === 'ok'}
      <h2>Stroke by stroke</h2>
      {#key char}
        <StrokeSteps data={strokes.data} />
      {/key}
    {:else if strokes.kind === 'missing'}
      <p class="message">No stroke data for this character.</p>
    {:else}
      <p class="message">
        Couldn't load the stroke order. It is available offline after viewing a character once
        online.
      </p>
    {/if}
  {/if}
{/if}

<style>
  .layout {
    display: grid;
    gap: 24px;
  }

  .info {
    min-width: 0;
  }

  @media (min-width: 640px) {
    .layout {
      grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
      align-items: start;
    }
  }

  .strokes {
    display: flex;
    justify-content: center;
  }

  .placeholder {
    width: 100%;
    max-width: 320px;
    aspect-ratio: 1;
    border-radius: 8px;
    background: var(--surface);
  }

  h1 {
    margin: 0 0 8px;
    font-size: 3rem;
    font-weight: 400;
    line-height: 1.1;
  }

  h2 {
    margin: 32px 0 12px;
    font-size: 1rem;
    color: var(--muted);
  }

  .big {
    margin: 0;
    font-size: 8rem;
    line-height: 1;
  }

  .note,
  .message {
    color: var(--muted);
    font-size: 0.9rem;
  }

  .message {
    margin-top: 24px;
  }

  .not-found {
    padding: 32px 0;
    text-align: center;
  }

  .status {
    padding: 24px 0;
    text-align: center;
    color: var(--muted);
  }

  .status-error {
    padding: 24px 0;
    text-align: center;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .retry-btn {
    min-height: 44px;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  .retry-btn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
