<script lang="ts">
  import { wordHref } from '$lib/route'
  import { splitRegisterLabels } from '$lib/search/register'
  import { settings } from '$lib/settings.svelte'
  import { retryWords, words } from '$lib/words.svelte'
  import { getWordDisplay, type WordHit } from '$lib/search/words'

  interface Props {
    hits: WordHit[]
    title?: string
    loading?: boolean
  }

  let { hits, title, loading = false }: Props = $props()

  let visibleCount = $state(20)
  let prevHits = $state<WordHit[] | null>(null)

  $effect(() => {
    if (hits !== prevHits) {
      prevHits = hits
      visibleCount = 20
    }
  })

  const visibleHits = $derived(hits.slice(0, visibleCount))
  const hasMore = $derived(visibleCount < hits.length)

  function showMore(): void {
    visibleCount += 20
  }
</script>

{#if title}
  <h2 class="tier-title">{title}</h2>
{/if}

{#if words.status === 'loading' || loading}
  <p class="status">Loading words…</p>
{:else if words.status === 'error'}
  <div class="status-error">
    <p>Couldn't load words.</p>
    <button type="button" class="retry-btn" onclick={retryWords}>Retry</button>
  </div>
{:else if hits.length > 0}
  <ul class="result-list">
    {#each visibleHits as hit (`${hit.entry.word}-${hit.readingIndex}`)}
      {@const { entry, readingIndex, matchedGloss } = hit}
      {@const reading = entry.readings[readingIndex]}
      {@const { display, counterpart } = getWordDisplay(entry, settings.script)}
      {@const rawMeaning = matchedGloss || (reading.meanings.length > 0 ? reading.meanings[0] : '')}
      {@const parsed = rawMeaning ? splitRegisterLabels(rawMeaning) : null}
      <li>
        <a href={wordHref(display)} class="result-link">
          <span
            class="word"
            lang={settings.script === 'T' && entry.traditional.length > 0 ? 'zh-Hant' : 'zh-Hans'}
          >
            {display}
          </span>
          <span class="info">
            <span class="pinyin">{reading.pinyin}</span>
            <span class="meaning">
              {#if parsed && parsed.text}
                {parsed.text}
              {:else}
                —
              {/if}
            </span>
            <span class="meta">
              {#if parsed && parsed.labels.length > 0}
                {#each parsed.labels as label (label)}
                  <span class="register-tag">{label}</span>
                {/each}
              {/if}
              {#if counterpart}
                <span class="counterparts" lang={settings.script === 'T' ? 'zh-Hans' : 'zh-Hant'}>
                  {counterpart}
                </span>
              {/if}
            </span>
          </span>
        </a>
      </li>
    {/each}
  </ul>

  {#if hasMore}
    <div class="show-more-wrap">
      <button type="button" class="show-more-btn" onclick={showMore}> Show more </button>
    </div>
  {/if}
{/if}

<style>
  .tier-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--muted);
    margin: 0 0 12px;
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

  .retry-btn,
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

  .retry-btn:hover,
  .show-more-btn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .show-more-wrap {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .result-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  li {
    min-width: 0;
    border-bottom: 1px solid var(--border);
  }

  li:last-child {
    border-bottom: none;
  }

  .result-link {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 0;
    color: inherit;
    text-decoration: none;
    min-height: 44px;
    transition: background-color 0.2s;
  }

  .result-link:hover {
    background-color: var(--accent-soft);
  }

  .result-link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .word {
    flex: 0 0 auto;
    font-size: 28px;
    line-height: 44px;
    min-width: 80px;
    text-align: center;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .pinyin {
    font-size: 14px;
    color: var(--muted);
    font-weight: 500;
  }

  .meaning {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 14px;
    color: var(--fg);
  }

  .meta {
    font-size: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .register-tag {
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 1px 5px;
    border-radius: 3px;
    flex: 0 0 auto;
    background: transparent;
  }

  .counterparts {
    color: var(--muted);
  }

  @media (min-width: 640px) {
    .result-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    li {
      border-bottom: none;
      border-right: 1px solid var(--border);
    }

    li:nth-child(3n) {
      border-right: none;
    }

    .result-link {
      padding: 16px;
      min-height: auto;
      flex-direction: column;
      gap: 8px;
    }

    .word {
      font-size: 32px;
      min-width: auto;
      line-height: 1;
      text-align: left;
    }
  }
</style>
