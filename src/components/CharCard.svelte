<!-- Character card used in composition and component-of sections -->
<script lang="ts">
  import type { CharEntry } from '$lib/data/types'
  import { characterHref } from '$lib/route'

  interface Props {
    char: string
    entry: CharEntry | undefined
    tags: ('radical' | 'meaning' | 'sound')[]
    lang: string
  }

  let { char, entry, tags, lang }: Props = $props()

  const reading = $derived(entry?.readings[0])
</script>

<a href={characterHref(char)} class="card">
  <span class="part" {lang}>{char}</span>
  <div class="info">
    {#if !reading}
      <span class="component">component</span>
    {:else}
      <span class="pinyin">{reading.pinyin}</span>
      {#if reading.meanings.length > 0}
        <span class="meaning">{reading.meanings[0]}</span>
      {/if}
    {/if}
  </div>
  {#if tags.length > 0}
    <div class="tags">
      {#each tags as tag (tag)}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}
</a>

<style>
  .card {
    min-width: 0;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
    transition: background-color 0.2s;
  }

  .card:hover {
    background-color: var(--accent-soft);
  }

  .card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .part {
    font-size: 2rem;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .info {
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pinyin {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--muted);
  }

  .meaning {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 0.875rem;
    color: var(--fg);
  }

  .component {
    font-size: 0.875rem;
    color: var(--muted);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .tag {
    font-size: 0.75rem;
    line-height: 1.2;
    padding: 2px 6px;
    border-radius: 9999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 500;
  }

  .card:hover .tag {
    background: var(--surface);
  }
</style>
