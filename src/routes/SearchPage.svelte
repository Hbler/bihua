<script lang="ts">
  import { parseQuery, parseWordQuery } from '$lib/pinyin/parse'
  import { searchSyllable } from '$lib/search/search'
  import { searchEnglish, getOrBuildEnglishIndex } from '$lib/search/english'
  import { filterWordHits, type WordHit } from '$lib/search/words'
  import { characterHref, modeForRoute, wordHref } from '$lib/route'
  import { replaceSearch, router } from '$lib/router.svelte'
  import { settings, type SearchMode } from '$lib/settings.svelte'
  import { lookupWord, searchWordsEnglish, searchWordsPinyin } from '$lib/words.svelte'
  import type { Dictionary } from '$lib/data/dictionary'

  import SearchBar from '../components/SearchBar.svelte'
  import Filters from '../components/Filters.svelte'
  import ResultList from '../components/ResultList.svelte'
  import WordList from '../components/WordList.svelte'

  interface Props {
    dict: Dictionary
    query: string
  }

  let { dict, query }: Props = $props()

  const currentMode = $derived(modeForRoute(router.route, settings.searchMode))

  // Follows the URL (e.g. Back button) but can be overwritten while typing.
  let input = $derived(query)
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  // Handle input changes with debounce
  function handleInput(value: string): void {
    input = value
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      replaceSearch(input, currentMode)
    }, 100)
  }

  function handleModeChange(mode: SearchMode): void {
    settings.searchMode = mode
    replaceSearch(input, mode)
  }

  // Parse the current query for character detection (applies in both modes)
  const parsed = $derived(parseQuery(query))
  const parsedWord = $derived(parseWordQuery(query))

  // Check if multiple characters form a known word; if so, navigate to WordPage
  let checkingWord = $state(false)
  $effect(() => {
    if (parsed.kind === 'chars') {
      const hanString = [...query].filter((c) => /\p{Script=Han}/u.test(c)).join('')
      if (hanString.length > 1) {
        checkingWord = true
        let cancelled = false
        lookupWord(hanString)
          .then((entry) => {
            if (cancelled) return
            if (entry) {
              location.replace(wordHref(hanString))
            } else {
              checkingWord = false
            }
          })
          .catch(() => {
            if (!cancelled) checkingWord = false
          })
        return () => {
          cancelled = true
        }
      }
    } else {
      checkingWord = false
    }
  })

  // Get search results for pinyin queries
  const pinyinResults = $derived(
    currentMode === 'pinyin' && parsed.kind === 'pinyin'
      ? searchSyllable(dict, parsed.syllable, parsed.tone, settings)
      : [],
  )

  // English index and results (built lazily when in english mode)
  const englishIndex = $derived(
    currentMode === 'english' ? getOrBuildEnglishIndex(dict) : undefined,
  )

  const englishResults = $derived(
    currentMode === 'english' && englishIndex && query.trim()
      ? searchEnglish(englishIndex, query, settings)
      : [],
  )

  const exactEnglishResults = $derived(englishResults.filter((r) => r.tier === 1))
  const relatedEnglishResults = $derived(englishResults.filter((r) => r.tier === 2 || r.tier === 3))

  // Word search state (worker queries)
  let rawWordHits = $state<WordHit[]>([])
  let wordsLoading = $state(false)
  let latestWordReqId = 0

  $effect(() => {
    const mode = currentMode
    const q = query.trim()
    const wordQuery = parsedWord

    if (!q) {
      rawWordHits = []
      wordsLoading = false
      return
    }

    if (mode === 'english') {
      const reqId = ++latestWordReqId
      wordsLoading = true
      searchWordsEnglish(q)
        .then((hits) => {
          if (reqId === latestWordReqId) {
            rawWordHits = hits
            wordsLoading = false
          }
        })
        .catch(() => {
          if (reqId === latestWordReqId) {
            wordsLoading = false
          }
        })
    } else if (mode === 'pinyin') {
      if (wordQuery !== null) {
        const reqId = ++latestWordReqId
        wordsLoading = true
        searchWordsPinyin(q)
          .then((hits) => {
            if (reqId === latestWordReqId) {
              rawWordHits = hits
              wordsLoading = false
            }
          })
          .catch(() => {
            if (reqId === latestWordReqId) {
              wordsLoading = false
            }
          })
      } else {
        rawWordHits = []
        wordsLoading = false
      }
    } else {
      rawWordHits = []
      wordsLoading = false
    }
  })

  const wordHits = $derived(filterWordHits(rawWordHits, dict, settings))

  // Navigate to character page if a single character is entered
  $effect(() => {
    if (parsed.kind === 'char') {
      // Replace the search entry so Back doesn't land on a URL that redirects forward again.
      location.replace(characterHref(parsed.char))
    }
  })

  // Format HSK level for display
  function formatHskLevel(level: number): string {
    return level === 7 ? '7–9' : String(level)
  }
</script>

<SearchBar value={input} oninput={handleInput} mode={currentMode} onModeChange={handleModeChange} />

<Filters />

<div class="page">
  {#if parsed.kind === 'char'}
    <p class="status">Loading character…</p>
  {:else if parsed.kind === 'chars'}
    {#if checkingWord}
      <p class="status">Loading…</p>
    {:else}
      <section class="picker">
        <h2>Pick a character</h2>
        <div class="character-grid">
          {#each parsed.chars as char (char)}
            <a href={characterHref(char)} class="char-link">
              <span lang="zh-Hans">{char}</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {:else if currentMode === 'english'}
    {#if !query.trim()}
      <section class="intro">
        <p>Search a character or word by English meaning:</p>
        <ul>
          <li><code>earth</code> — near-synonyms like 地 and 土, or words like 地球</li>
          <li><code>to eat</code> — verbs can include "to"</li>
          <li><code>bank up</code> — multi-word phrases</li>
        </ul>
        <p>Or paste a character: <span lang="zh-Hans">你</span></p>
      </section>
    {:else if englishResults.length === 0 && wordHits.length === 0 && !wordsLoading}
      <section class="results">
        <p class="no-results">
          {#if settings.hskFilter}
            No HSK ≤ {formatHskLevel(settings.hskLevel)} characters or words for "<code
              >{query.trim()}</code
            >". Turn off the HSK filter to see all.
          {:else}
            No character or word has that meaning. Try a simpler word.
          {/if}
        </p>
      </section>
    {:else}
      <section class="results">
        {#if englishResults.length > 0}
          <p class="result-count">
            {englishResults.length} character result{englishResults.length === 1 ? '' : 's'}
          </p>
          {#if exactEnglishResults.length > 0}
            <div class="tier-group">
              <ResultList hits={exactEnglishResults} title="Exact" />
            </div>
          {/if}
          {#if relatedEnglishResults.length > 0}
            <div class="tier-group">
              <ResultList hits={relatedEnglishResults} title="Related" />
            </div>
          {/if}
        {/if}

        {#if wordHits.length > 0 || wordsLoading}
          <div class="tier-group">
            <WordList hits={wordHits} title="Words" loading={wordsLoading} />
          </div>
        {/if}
      </section>
    {/if}
  {:else}
    {#if parsedWord !== null && parsed.kind !== 'pinyin'}
      <!-- Multi-syllable query shows Words group instead of hint -->
      <section class="results">
        {#if wordHits.length === 0 && !wordsLoading}
          <p class="no-results">
            {#if settings.hskFilter}
              No HSK ≤ {formatHskLevel(settings.hskLevel)} words found.
            {:else}
              No words found.
            {/if}
          </p>
        {:else}
          <WordList hits={wordHits} title="Words" loading={wordsLoading} />
        {/if}
      </section>
    {:else if parsed.kind === 'multi-syllable'}
      <section class="message">
        <p>
          Type one syllable at a time (e.g. <code>shi</code> or <code>shi4</code>), or paste a
          character.
        </p>
      </section>
    {:else if parsed.kind === 'invalid'}
      <section class="message">
        <p>No syllable "<code>{parsed.input}</code>".</p>
      </section>
    {:else if parsed.kind === 'empty'}
      <section class="intro">
        <p>Search a character by pinyin:</p>
        <ul>
          <li><code>shi</code> — all tones</li>
          <li><code>shi4</code> — tone 4 only</li>
          <li><code>shì</code> — tone mark also works</li>
          <li><code>lv</code> — ü as <code>v</code> or <code>u:</code></li>
        </ul>
        <p>Or paste a character: <span lang="zh-Hans">你</span></p>
      </section>
    {:else if parsed.kind === 'pinyin'}
      <section class="results">
        {#if pinyinResults.length === 0}
          <p class="no-results">
            {#if settings.hskFilter}
              No HSK ≤ {formatHskLevel(settings.hskLevel)} characters for "<code
                >{parsed.syllable}</code
              >". Turn off the HSK filter to see all.
            {:else}
              No characters found.
            {/if}
          </p>
        {:else}
          <p class="result-count">
            {pinyinResults.length} character result{pinyinResults.length === 1 ? '' : 's'}
          </p>
          <ResultList hits={pinyinResults} />
        {/if}

        {#if wordHits.length > 0 || wordsLoading}
          <div class="tier-group" style="margin-top: 24px;">
            <WordList hits={wordHits} title="Words" loading={wordsLoading} />
          </div>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  .page {
    margin-top: 24px;
  }

  .status,
  .no-results {
    text-align: center;
    color: var(--muted);
    padding: 24px 0;
  }

  .message,
  .intro {
    padding: 24px 0;
    color: var(--muted);
  }

  .intro ul {
    list-style: none;
    padding: 0;
    margin: 16px 0;
  }

  .intro li {
    margin: 8px 0;
  }

  code {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }

  .picker {
    margin-bottom: 32px;
  }

  .picker h2 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 500;
    color: var(--muted);
  }

  .character-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  }

  .char-link {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--accent);
    text-decoration: none;
    font-size: 32px;
    line-height: 1;
    min-height: 60px;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  .char-link:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .char-link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .result-count {
    margin: 0 0 16px;
    color: var(--muted);
    font-size: 14px;
  }

  .results {
    margin-top: 24px;
  }

  .tier-group {
    margin-bottom: 24px;
  }
</style>
