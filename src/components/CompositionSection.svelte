<!-- Character composition and decomposition parts display -->
<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary'
  import type { CharEntry, EtymologyType } from '$lib/data/types'

  import CharCard from './CharCard.svelte'

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

  function getPartTags(part: string): ('radical' | 'meaning' | 'sound')[] {
    const tags: ('radical' | 'meaning' | 'sound')[] = []
    if (part === entry.radical) {
      tags.push('radical')
    }
    if (part === entry.etymology?.semantic) {
      tags.push('meaning')
    }
    if (part === entry.etymology?.phonetic) {
      tags.push('sound')
    }
    return tags
  }
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
          <CharCard char={part} entry={partEntry} tags={getPartTags(part)} lang={partLang} />
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

  .note {
    margin: 12px 0 0;
    font-size: 0.9rem;
    color: var(--muted);
  }
</style>
