<script lang="ts">
  import type { HskLevel } from '$lib/data/types'
  import { settings } from '$lib/settings.svelte'

  function handleScriptChange(script: 'S' | 'T' | 'ST'): void {
    settings.script = script
  }

  function handleHskFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement
    settings.hskFilter = target.checked
  }

  function handleLevelChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    const level = parseInt(target.value, 10)
    if (level >= 1 && level <= 7) {
      settings.hskLevel = level as HskLevel
    }
  }

  function handleHandwritingChange(event: Event): void {
    const target = event.target as HTMLInputElement
    settings.handwritingOnly = target.checked
  }
</script>

<div class="filters">
  <div class="script-buttons">
    <button
      type="button"
      aria-pressed={settings.script === 'S'}
      onclick={() => handleScriptChange('S')}
    >
      <span lang="zh-Hans">简</span> Simplified
    </button>
    <button
      type="button"
      aria-pressed={settings.script === 'T'}
      onclick={() => handleScriptChange('T')}
    >
      <span lang="zh-Hant">繁</span> Traditional
    </button>
    <button
      type="button"
      aria-pressed={settings.script === 'ST'}
      onclick={() => handleScriptChange('ST')}
    >
      Both
    </button>
  </div>

  <div class="hsk-section">
    <label>
      <input type="checkbox" checked={settings.hskFilter} onchange={handleHskFilterChange} />
      HSK filter
    </label>

    {#if settings.hskFilter}
      <div class="hsk-controls">
        <select value={String(settings.hskLevel)} onchange={handleLevelChange}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7–9</option>
        </select>

        <label class="handwriting-label">
          <input
            type="checkbox"
            checked={settings.handwritingOnly}
            onchange={handleHandwritingChange}
          />
          <span
            title="HSK 3.0 characters you're expected to write by hand, up to this level's band"
          >
            Handwriting list only
          </span>
        </label>
      </div>
    {/if}
  </div>
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }

  .script-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .script-buttons button {
    flex: 1;
    min-width: 100px;
  }

  .hsk-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hsk-section label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }

  .hsk-section input[type='checkbox'] {
    cursor: pointer;
  }

  .hsk-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 24px;
  }

  select {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    font: inherit;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .handwriting-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .handwriting-label span {
    font-size: 14px;
  }

  @media (min-width: 480px) {
    .filters {
      flex-direction: row;
      align-items: center;
      gap: 24px;
    }

    .script-buttons {
      flex: 0 0 auto;
    }

    .hsk-section {
      flex: 1;
      gap: 16px;
    }

    .hsk-controls {
      flex-direction: row;
      gap: 16px;
      align-items: center;
      padding-left: 0;
    }

    select {
      min-width: 100px;
    }
  }
</style>
