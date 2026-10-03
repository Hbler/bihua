<!-- Readings, meanings, counterparts and metadata for one character. -->
<script lang="ts">
  import type { CharEntry } from '$lib/data/types'
  import { characterHref } from '$lib/route'

  let { entry }: { entry: CharEntry } = $props()

  const MAX_MEANINGS = 6
  const BAND_NAMES = { 1: 'elementary', 2: 'intermediate', 3: 'advanced' } as const

  // Counterparts are the other script, so they get the other script's font.
  const counterpartLang = $derived(entry.script === 'T' ? 'zh-Hans' : 'zh-Hant')
</script>

<dl class="meta">
  {#if entry.hsk}
    <div>
      <dt>HSK 3.0</dt>
      <dd>{entry.hsk === 7 ? '7–9' : entry.hsk}</dd>
    </div>
  {/if}
  {#if entry.hskWriteBand}
    <div>
      <dt>Handwriting</dt>
      <dd>{BAND_NAMES[entry.hskWriteBand]}</dd>
    </div>
  {/if}
  {#if entry.strokeCount}
    <div>
      <dt>Strokes</dt>
      <dd>{entry.strokeCount}</dd>
    </div>
  {/if}
  {#if entry.radical}
    <div>
      <dt>Radical</dt>
      <dd lang="zh-Hans">{entry.radical}</dd>
    </div>
  {/if}
  <div>
    <dt>Script</dt>
    <dd>{{ S: 'Simplified', T: 'Traditional', ST: 'Same in both' }[entry.script]}</dd>
  </div>
</dl>

{#if entry.readings.length > 0}
  <ul class="readings">
    {#each entry.readings as reading (`${reading.syllable}${reading.tone}`)}
      <li>
        <p class="pinyin">
          {reading.pinyin}
          {#each reading.counterparts as counterpart (counterpart)}
            <a class="counterpart" lang={counterpartLang} href={characterHref(counterpart)}
              >{counterpart}</a
            >
          {/each}
        </p>
        {#if reading.meanings.length}
          <ul class="meanings">
            {#each reading.meanings.slice(0, MAX_MEANINGS) as meaning (meaning)}
              <li>{meaning}</li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 0 0 16px;
  }

  .meta div {
    display: flex;
    gap: 6px;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  .readings {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .readings > li + li {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }

  p {
    margin: 0;
  }

  .pinyin {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .counterpart {
    font-size: 1.1rem;
    font-weight: 400;
    text-decoration: none;
  }

  .meanings {
    margin: 4px 0 0;
    padding-left: 1.1em;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .meanings li + li {
    margin-top: 2px;
  }
</style>
