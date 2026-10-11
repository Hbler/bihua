<!-- Recently viewed characters and words shown on empty search -->
<script lang="ts">
  import { clearRecent, recent } from '$lib/recent.svelte'
  import { characterHref, wordHref } from '$lib/route'
</script>

{#if recent.items.length > 0}
  <section class="recent">
    <div class="header">
      <h2>Recently viewed</h2>
      <button type="button" class="clear-btn" onclick={clearRecent}>Clear</button>
    </div>
    <div class="chips">
      {#each recent.items as item (item.kind + ':' + item.text)}
        <a
          href={item.kind === 'char' ? characterHref(item.text) : wordHref(item.text)}
          class="chip"
        >
          <span class="chip-text" lang="zh-Hans">{item.text}</span>
          {#if item.pinyin}
            <span class="chip-pinyin">{item.pinyin}</span>
          {/if}
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .recent {
    margin-bottom: 32px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--muted);
  }

  .clear-btn {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--muted);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      color 0.2s,
      background-color 0.2s;
  }

  .clear-btn:hover {
    border-color: var(--accent);
    color: var(--fg);
    background: var(--accent-soft);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--fg);
    text-decoration: none;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .chip:hover {
    background-color: var(--accent-soft);
    border-color: var(--accent);
  }

  .chip-text {
    font-size: 1.25rem;
    line-height: 1.2;
    color: var(--fg);
  }

  .chip-pinyin {
    font-size: 0.75rem;
    line-height: 1.2;
    color: var(--muted);
  }
</style>
