<!-- Readings, meanings, counterparts and metadata for one character. -->
<script lang="ts">
  import { planReading } from '$lib/audio/plan'
  import { getClips } from '$lib/audio/speaker.svelte'
  import type { CharEntry, Tone } from '$lib/data/types'
  import { sandhiNotes } from '$lib/pinyin/sandhi'
  import { characterHref, wordHref } from '$lib/route'
  import { splitRegisterLabels } from '$lib/search/register'

  import SpeakButton from './SpeakButton.svelte'

  interface Props {
    entry: CharEntry
    reading?: { syllable: string; tone: Tone }
  }

  let { entry, reading: selectedReading }: Props = $props()

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
    {#each entry.readings as reading, i (`${reading.syllable}${reading.tone}`)}
      {@const isSelected =
        selectedReading &&
        selectedReading.syllable === reading.syllable &&
        selectedReading.tone === reading.tone}
      {@const notes = sandhiNotes(entry.char, reading.tone)}
      <li class:selected-reading={isSelected}>
        <p class="pinyin" class:selected={isSelected}>
          {reading.pinyin}
          <SpeakButton
            id={`${entry.char}-${i}`}
            label={`Listen to ${reading.pinyin}`}
            getPlan={(v) => planReading(entry, i, v, getClips())}
          />
          {#if isSelected}
            <span class="in-word-tag">in this word</span>
          {/if}
          {#each reading.counterparts as counterpart (counterpart)}
            <a class="counterpart" lang={counterpartLang} href={characterHref(counterpart)}
              >{counterpart}</a
            >
          {/each}
        </p>
        {#if notes.length > 0}
          {#each notes as note (note.text)}
            <p class="sandhi-note">
              {note.text}
              {#if note.examples.length > 0}
                <span class="sandhi-examples">
                  (e.g.
                  {#each note.examples as example, i (example.word)}
                    {#if i > 0},
                    {/if}
                    <a class="example-link" href={wordHref(example.word)}
                      >{example.word} <span class="spoken">{example.spoken}</span></a
                    >
                  {/each})
                </span>
              {/if}
            </p>
          {/each}
        {/if}
        {#if reading.meanings.length}
          <ul class="meanings">
            {#each reading.meanings.slice(0, MAX_MEANINGS) as meaning (meaning)}
              {@const parsed = splitRegisterLabels(meaning)}
              <li>
                {#if parsed.labels.length > 0}
                  <span class="register-tags">
                    {#each parsed.labels as label (label)}
                      <span class="register-tag">{label}</span>
                    {/each}
                  </span>
                {/if}
                <span>{parsed.text}</span>
              </li>
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

  .pinyin.selected {
    color: var(--accent);
  }

  .in-word-tag {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    padding: 2px 6px;
    border-radius: 4px;
    align-self: center;
  }

  .counterpart {
    font-size: 1.1rem;
    font-weight: 400;
    text-decoration: none;
  }

  .sandhi-note {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--muted);
    line-height: 1.4;
  }

  .example-link {
    color: var(--accent);
    text-decoration: none;
  }

  .example-link:hover {
    text-decoration: underline;
  }

  .example-link .spoken {
    font-weight: 500;
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

  .register-tags {
    display: inline-flex;
    gap: 4px;
    margin-right: 6px;
    vertical-align: baseline;
  }

  .register-tag {
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
    line-height: 1.2;
    background: transparent;
    display: inline-block;
  }
</style>
