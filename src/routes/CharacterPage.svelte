<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary'
  import { loadStrokes, type StrokeResult } from '$lib/data/strokes'
  import { searchHref } from '$lib/route'
  import { router } from '$lib/router.svelte'

  import CharacterInfo from '../components/CharacterInfo.svelte'
  import CompositionSection from '../components/CompositionSection.svelte'
  import StrokeAnimation from '../components/StrokeAnimation.svelte'
  import StrokeSteps from '../components/StrokeSteps.svelte'

  let { dict, char }: { dict: Dictionary; char: string } = $props()

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

  $effect(() => {
    document.title = `${char} — Bihua`
    return () => {
      document.title = 'Bihua 笔画'
    }
  })
</script>

<a class="back" href={searchHref(router.lastSearch.query, router.lastSearch.mode)}>← Search</a>

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
        <StrokeAnimation {char} />
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
        <CharacterInfo {entry} />
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
    </section>
  </div>

  {#if strokes !== 'loading'}
    {#if strokes.kind === 'ok'}
      <h2>Stroke by stroke</h2>
      <StrokeSteps data={strokes.data} />
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
  .back {
    display: inline-block;
    margin-bottom: 12px;
    color: var(--muted);
    text-decoration: none;
  }

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
</style>
