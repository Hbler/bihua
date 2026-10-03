<!-- Character composition and decomposition parts display -->
<script lang="ts">
  import type { CharEntry, EtymologyType } from '$lib/data/types'
  import type { Dictionary } from '$lib/data/dictionary'
  import { characterHref } from '$lib/route'

  let { entry, dict }: { entry: CharEntry; dict: Dictionary } = $props()

  const ETYMOLOGY_LABELS: Record<EtymologyType, string> = {
    pictophonetic: 'Sound + meaning',
    ideographic: 'Combined meaning',
    pictographic: 'Picture',
  }

  const parts = $derived.by(() => {
    const list = [...entry.components]
    if (entry.radical && entry.radical !== entry.char && !list.includes(entry.radical)) {
      list.push(entry.radical)
    }
    return list
  })

  const partLang = $derived(entry.script === 'T' ? 'zh-Hant' : 'zh-Hans')
</script>

{#if parts.length > 0 || entry.etymology}
  <section class="composition">
    <h2>Composition</h2>

    {#if entry.etymology}
      <p class="etymology">
        {ETYMOLOGY_LABELS[entry.etymology.type]}{entry.etymology.hint
          ? ` — ${entry.etymology.hint}`
          : ''}
      </p>
    {/if}

    {#if parts.length > 0}
      <div class="grid">
        {#each parts as part (part)}
          {@const partEntry = dict.byChar.get(part)}
          {@const reading = partEntry?.readings[0]}
          <a href={characterHref(part)} class="card">
            <span class="part" lang={partLang}>{part}</span>
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
            {#if part === entry.radical || part === entry.etymology?.semantic || part === entry.etymology?.phonetic}
              <div class="tags">
                {#if part === entry.radical}
                  <span class="tag">radical</span>
                {/if}
                {#if part === entry.etymology?.semantic}
                  <span class="tag">meaning</span>
                {/if}
                {#if part === entry.etymology?.phonetic}
                  <span class="tag">sound</span>
                {/if}
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}

    {#if entry.hasUnknownComponent}
      <p class="note">Part of this character is unidentified.</p>
    {/if}
  </section>
{/if}

<style>
  h2 {
    margin: 32px 0 12px;
    font-size: 1rem;
    color: var(--muted);
  }

  .etymology {
    margin: 0 0 12px;
    font-size: 0.95rem;
    color: var(--muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

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
    font-size: 0.875rem;
    color: var(--fg);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
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

  .note {
    margin: 12px 0 0;
    font-size: 0.9rem;
    color: var(--muted);
  }
</style>
