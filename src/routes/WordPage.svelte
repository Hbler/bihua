<script lang="ts">
  import type { WordEntry } from '$lib/data/types'
  import { characterHref, searchHref } from '$lib/route'
  import { router } from '$lib/router.svelte'
  import { splitRegisterLabels } from '$lib/search/register'
  import { settings } from '$lib/settings.svelte'
  import { lookupWord } from '$lib/words.svelte'

  interface Props {
    word: string
  }

  let { word }: Props = $props()

  let entry = $state<WordEntry | null | undefined>(undefined)
  let loading = $state(true)

  $effect(() => {
    const current = word
    loading = true
    lookupWord(current)
      .then((res) => {
        if (current === word) {
          entry = res
          loading = false
        }
      })
      .catch(() => {
        if (current === word) {
          entry = null
          loading = false
        }
      })
  })

  $effect(() => {
    document.title = `${word} — Bihua`
    return () => {
      document.title = 'Bihua 笔画'
    }
  })

  const isTraditionalMode = $derived(settings.script === 'T')
  const displayWord = $derived.by(() => {
    if (!entry) return word
    if (isTraditionalMode && entry.traditional.length > 0) {
      return entry.traditional[0]
    }
    return entry.word
  })

  const counterpart = $derived.by(() => {
    if (!entry) return null
    if (isTraditionalMode) {
      return entry.word !== displayWord ? entry.word : null
    }
    return entry.traditional.length > 0 ? entry.traditional.join(', ') : null
  })
</script>

<a class="back" href={searchHref(router.lastSearch.query, router.lastSearch.mode)}>← Search</a>

{#if loading}
  <p class="status">Loading word…</p>
{:else if !entry}
  <section class="not-found">
    <p class="big">{word}</p>
    <p>Word not found.</p>
    <a href="#/">Back to search</a>
  </section>
{:else}
  <article class="word-card">
    <header class="header">
      <h1 class="word-title" lang={isTraditionalMode ? 'zh-Hant' : 'zh-Hans'}>
        {displayWord}
      </h1>
      {#if counterpart}
        <span class="counterpart" lang={isTraditionalMode ? 'zh-Hans' : 'zh-Hant'}>
          {counterpart}
        </span>
      {/if}
    </header>

    <div class="readings">
      {#each entry.readings as reading (reading.pinyin)}
        <section class="reading-block">
          <p class="pinyin">{reading.pinyin}</p>
          <ul class="meanings-list">
            {#each reading.meanings as meaning (meaning)}
              {@const parsed = splitRegisterLabels(meaning)}
              <li>
                <span class="meaning-text">{parsed.text || meaning}</span>
                {#if parsed.labels.length > 0}
                  {#each parsed.labels as label (label)}
                    <span class="register-tag">{label}</span>
                  {/each}
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    <section class="characters-section">
      <h2>Characters</h2>
      <div class="char-grid">
        {#each [...entry.word] as char (char)}
          <a href={characterHref(char)} class="char-card">
            <span class="char-glyph" lang="zh-Hans">{char}</span>
            <span class="char-label">View character →</span>
          </a>
        {/each}
      </div>
    </section>
  </article>
{/if}

<style>
  .back {
    display: inline-block;
    color: var(--muted);
    text-decoration: none;
    margin-bottom: 24px;
    font-size: 14px;
  }

  .back:hover {
    color: var(--fg);
  }

  .status,
  .not-found {
    text-align: center;
    padding: 48px 0;
    color: var(--muted);
  }

  .big {
    font-size: 48px;
    margin-bottom: 16px;
    color: var(--fg);
  }

  .word-card {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }

  .word-title {
    font-size: 48px;
    margin: 0;
    line-height: 1;
    font-weight: 600;
  }

  .counterpart {
    font-size: 24px;
    color: var(--muted);
  }

  .readings {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .reading-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pinyin {
    font-size: 18px;
    font-weight: 600;
    color: var(--accent);
    margin: 0;
  }

  .meanings-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meanings-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
  }

  .meaning-text {
    color: var(--fg);
  }

  .register-tag {
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 3px;
    background: transparent;
  }

  .characters-section h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
    margin: 0 0 16px;
  }

  .char-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .char-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    text-decoration: none;
    min-width: 80px;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  .char-card:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .char-glyph {
    font-size: 32px;
    line-height: 1;
    color: var(--accent);
  }

  .char-label {
    font-size: 12px;
    color: var(--muted);
  }
</style>
