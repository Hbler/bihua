<script lang="ts">
  import { characterHref } from '$lib/route'
  import type { Hit } from '$lib/data/dictionary'

  interface Props {
    hits: Hit[]
  }

  let { hits }: Props = $props()
</script>

<ul class="result-list">
  {#each hits as { entry, reading } (`${entry.char}-${reading.syllable}${reading.tone}`)}
    <li>
      <a href={characterHref(entry.char)} class="result-link">
        <span class="character" lang={entry.script === 'T' ? 'zh-Hant' : 'zh-Hans'}>
          {entry.char}
        </span>
        <span class="info">
          <span class="pinyin">{reading.pinyin}</span>
          <span class="meaning">
            {#if reading.meanings.length > 0}
              {reading.meanings[0]}
            {:else}
              —
            {/if}
          </span>
          <span class="meta">
            {#if entry.hsk}
              <span class="hsk-tag">
                HSK {entry.hsk === 7 ? '7–9' : entry.hsk}
              </span>
            {/if}
            {#if reading.counterparts.length > 0}
              <span class="counterparts" lang={entry.script === 'T' ? 'zh-Hans' : 'zh-Hant'}>
                {reading.counterparts.join('')}
              </span>
            {/if}
          </span>
        </span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .result-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  li {
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

  .character {
    flex: 0 0 auto;
    font-size: 32px;
    line-height: 44px;
    min-width: 44px;
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
    font-size: 14px;
    color: var(--fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .hsk-tag {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 2px 6px;
    border-radius: 3px;
    flex: 0 0 auto;
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

    .character {
      font-size: 40px;
      min-width: auto;
      line-height: 1;
    }
  }
</style>
