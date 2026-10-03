<!-- Word page: word overview, character cards, and embedded character view. -->
<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary.js'
  import type { WordEntry } from '$lib/data/types.js'
  import { spokenTones } from '$lib/pinyin/sandhi.js'
  import { numberedToMarks } from '$lib/pinyin/tone-marks.js'
  import { characterHref, searchHref, wordHref } from '$lib/route.js'
  import { replaceWordChar, router } from '$lib/router.svelte.js'
  import { splitRegisterLabels } from '$lib/search/register.js'
  import { lookupWord, retryWords, words } from '$lib/words.svelte.js'

  import CharacterView from '../components/CharacterView.svelte'

  interface Props {
    dict: Dictionary
    word: string
    char?: string | null
  }

  let { dict, word, char }: Props = $props()

  let entry = $state<WordEntry | null | undefined>(undefined)
  let loadError = $state(false)

  function load(target: string) {
    entry = undefined
    loadError = false
    lookupWord(target)
      .then((res) => {
        if (target === word) {
          entry = res
          loadError = false
        }
      })
      .catch(() => {
        if (target === word) {
          entry = null
          loadError = true
        }
      })
  }

  $effect(() => {
    load(word)
  })

  function handleRetry() {
    retryWords()
    load(word)
  }

  $effect(() => {
    document.title = `${word} — Bihua`
    return () => {
      document.title = 'Bihua 笔画'
    }
  })

  const wordChars = $derived([...word])
  const isTraditionalWord = $derived(Boolean(entry && entry.traditional.includes(word)))

  const counterparts = $derived.by(() => {
    if (!entry) return []
    if (isTraditionalWord) {
      return [entry.word]
    }
    return entry.traditional
  })

  const firstReading = $derived(entry?.readings[0])

  const firstReadingSpoken = $derived.by(() => {
    if (!firstReading) return []
    return spokenTones(wordChars, firstReading.tones).tones
  })

  const selected = $derived.by(() => {
    if (char && wordChars.includes(char)) {
      return char
    }
    return wordChars[0] ?? ''
  })

  const firstIndexOfSelected = $derived(wordChars.indexOf(selected))

  const selectedReading = $derived.by(() => {
    if (
      !firstReading ||
      firstIndexOfSelected === -1 ||
      firstIndexOfSelected >= firstReading.syllables.length
    ) {
      return undefined
    }
    return {
      syllable: firstReading.syllables[firstIndexOfSelected],
      tone: firstReading.tones[firstIndexOfSelected],
    }
  })
</script>

<a class="back" href={searchHref(router.lastSearch.query, router.lastSearch.mode)}>← Search</a>

{#if words.status === 'error' || loadError}
  <div class="status">
    <p>Couldn't load words.</p>
    <button type="button" onclick={handleRetry}>Retry</button>
  </div>
{:else if entry === undefined || words.status === 'loading'}
  <p class="status">Loading words…</p>
{:else if entry === null}
  <section class="not-found">
    <p class="big">{word}</p>
    <p>Word not found.</p>
    <a href={searchHref(router.lastSearch.query, router.lastSearch.mode)}>Back to search</a>
  </section>
{:else}
  <div class="word-page">
    <header class="top-frame">
      <div class="word-header">
        <h1 class="word-title" lang={isTraditionalWord ? 'zh-Hant' : 'zh-Hans'}>
          {word}
        </h1>
        {#if counterparts.length > 0}
          <div class="counterparts" lang={isTraditionalWord ? 'zh-Hans' : 'zh-Hant'}>
            {#each counterparts as cp, i (cp)}
              {#if i > 0},
              {/if}
              <a class="counterpart-link" href={wordHref(cp)}>{cp}</a>
            {/each}
          </div>
        {/if}
      </div>

      <div class="readings">
        {#each entry.readings as reading, readingIndex (reading.pinyin + readingIndex)}
          {@const sandhi = spokenTones(wordChars, reading.tones)}
          {@const hasSandhi = sandhi.tones.some((t, i) => t !== reading.tones[i])}
          {@const spokenPinyin = sandhi.tones
            .map((t, i) => numberedToMarks(reading.syllables[i], t))
            .join(' ')}
          <section class="reading-block">
            <p class="reading-pinyin">{reading.pinyin}</p>
            {#if hasSandhi}
              <p class="spoken-line">
                {sandhi.approximate ? 'usually spoken: ' : 'spoken: '}{spokenPinyin}
              </p>
            {/if}
            <ul class="meanings-list">
              {#each reading.meanings as meaning (meaning)}
                {@const parsed = splitRegisterLabels(meaning)}
                <li>
                  {#if parsed.labels.length > 0}
                    <span class="register-tags">
                      {#each parsed.labels as label (label)}
                        <span class="register-tag">{label}</span>
                      {/each}
                    </span>
                  {/if}
                  <span class="meaning-text">{parsed.text || meaning}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>

      <div class="cards" role="group" aria-label="Characters in {word}">
        {#each wordChars as c, i (i)}
          {@const isPressed = c === selected && firstIndexOfSelected === i}
          {@const citationTone = firstReading?.tones[i] ?? 1}
          {@const spokenTone = firstReadingSpoken[i] ?? citationTone}
          {@const syllable = firstReading?.syllables[i] ?? ''}
          {@const spokenPinyin = syllable ? numberedToMarks(syllable, spokenTone) : ''}
          {@const citationPinyin = syllable ? numberedToMarks(syllable, citationTone) : ''}
          {@const charEntry = dict.byChar.get(c)}
          {@const matchedReading =
            charEntry?.readings.find((r) => r.syllable === syllable && r.tone === citationTone) ??
            charEntry?.readings[0]}
          {@const rawMeaning = matchedReading?.meanings[0] ?? ''}
          {@const parsedMeaning = rawMeaning
            ? splitRegisterLabels(rawMeaning).text || rawMeaning
            : ''}
          <button
            type="button"
            class="char-card"
            aria-pressed={isPressed}
            onclick={() => replaceWordChar(word, c)}
          >
            <span class="card-char" lang={isTraditionalWord ? 'zh-Hant' : 'zh-Hans'}>{c}</span>
            <span class="card-pinyin">
              <span class="spoken-pinyin-mark">{spokenPinyin}</span>
              {#if spokenTone !== citationTone}
                <span class="citation-pinyin-mark">{citationPinyin}</span>
              {/if}
            </span>
            {#if parsedMeaning}
              <span class="card-meaning">{parsedMeaning}</span>
            {/if}
          </button>
        {/each}
      </div>
    </header>

    <section class="bottom-frame">
      <div class="bottom-frame-header">
        <a class="open-char-link" href={characterHref(selected)}>
          Open {selected}'s page →
        </a>
      </div>
      {#key selected}
        <CharacterView {dict} char={selected} reading={selectedReading} />
      {/key}
    </section>
  </div>
{/if}

<style>
  .back {
    display: inline-block;
    margin-bottom: 16px;
    color: var(--muted);
    text-decoration: none;
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

  .word-page {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .top-frame {
    display: flex;
    flex-direction: column;
    gap: 20px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 28px;
  }

  .word-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }

  .word-title {
    font-size: 3rem;
    font-weight: 600;
    line-height: 1.1;
    margin: 0;
  }

  .counterparts {
    font-size: 1.5rem;
    color: var(--muted);
  }

  .counterpart-link {
    color: var(--muted);
    text-decoration: none;
  }

  .counterpart-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .readings {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .reading-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .reading-pinyin {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--accent);
  }

  .spoken-line {
    margin: 0;
    font-size: 0.95rem;
    color: var(--muted);
    font-style: italic;
  }

  .meanings-list {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meanings-list li {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .meaning-text {
    color: var(--fg);
  }

  .register-tags {
    display: inline-flex;
    gap: 4px;
    vertical-align: baseline;
  }

  .register-tag {
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
    padding: 1px 5px;
    border-radius: 3px;
    background: transparent;
    line-height: 1.2;
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }

  .char-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    text-align: center;
    padding: 10px 14px;
    min-width: 90px;
    max-width: 140px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s;
    height: auto;
    min-height: 44px;
  }

  .char-card:hover {
    border-color: var(--accent);
  }

  .char-card[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .card-char {
    font-size: 2rem;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .char-card[aria-pressed='true'] .card-char {
    color: var(--accent);
  }

  .card-pinyin {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .spoken-pinyin-mark {
    color: var(--fg);
  }

  .char-card[aria-pressed='true'] .spoken-pinyin-mark {
    color: var(--accent);
  }

  .citation-pinyin-mark {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted);
  }

  .card-meaning {
    font-size: 0.75rem;
    line-height: 1.3;
    color: var(--muted);
    margin-top: 6px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bottom-frame {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .bottom-frame-header {
    display: flex;
    justify-content: flex-end;
  }

  .open-char-link {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .open-char-link:hover {
    text-decoration: underline;
  }
</style>
