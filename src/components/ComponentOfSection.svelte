<!-- Characters containing this character as a direct component -->
<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary'
  import type { CharEntry } from '$lib/data/types'
  import { componentOf, getOrBuildComponentOfIndex } from '$lib/search/component-of'
  import { settings } from '$lib/settings.svelte'

  import CharCard from './CharCard.svelte'

  interface Props {
    char: string
    entry: CharEntry | undefined
    dict: Dictionary
    pageSize?: number
  }

  let { char, entry, dict, pageSize = 12 }: Props = $props()

  const hits = $derived(
    componentOf(getOrBuildComponentOfIndex(dict), entry ?? char, settings.script),
  )

  let extraCount = $state(0)
  let prevChar = $state<string | null>(null)

  $effect(() => {
    if (char !== prevChar) {
      prevChar = char
      extraCount = 0
    }
  })

  const visibleCount = $derived(pageSize + extraCount)
  const visibleHits = $derived(hits.slice(0, visibleCount))
  const hasMore = $derived(visibleCount < hits.length)

  function showMore(): void {
    extraCount += pageSize
  }
</script>

{#if hits.length > 0}
  <section class="component-of">
    <h2>Component of {hits.length} {hits.length === 1 ? 'character' : 'characters'}</h2>

    <div class="grid">
      {#each visibleHits as hit (hit.entry.char)}
        <CharCard
          char={hit.entry.char}
          entry={hit.entry}
          tags={hit.tags}
          lang={hit.entry.script === 'T' ? 'zh-Hant' : 'zh-Hans'}
        />
      {/each}
    </div>

    {#if hasMore}
      <div class="show-more-wrap">
        <button type="button" class="show-more-btn" onclick={showMore}> Show more </button>
      </div>
    {/if}
  </section>
{/if}

<style>
  h2 {
    margin: 32px 0 12px;
    font-size: 1rem;
    color: var(--muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .show-more-wrap {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .show-more-btn {
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

  .show-more-btn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
