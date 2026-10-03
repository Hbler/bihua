<script lang="ts">
  import type { SearchMode } from '$lib/settings.svelte'

  interface Props {
    value: string
    oninput: (value: string) => void
    mode?: SearchMode
    onModeChange?: (mode: SearchMode) => void
  }

  let { value, oninput, mode = 'pinyin', onModeChange }: Props = $props()

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement
    oninput(target.value)
  }

  function handleClear(): void {
    oninput('')
  }
</script>

<div class="search-bar">
  <div class="input-wrapper">
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="text"
      {value}
      oninput={handleInput}
      inputmode="text"
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
      placeholder={mode === 'english'
        ? 'English meaning (earth, to eat)'
        : 'Pinyin (shi, shi4, shì) or a character'}
      aria-label={mode === 'english'
        ? 'Search for a character by English meaning'
        : 'Search for a character by pinyin or paste one'}
      autofocus
    />
    {#if value}
      <button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear search">
        ×
      </button>
    {/if}
  </div>

  <div class="mode-toggle" role="group" aria-label="Search mode">
    <button
      type="button"
      class="mode-btn"
      class:active={mode === 'pinyin'}
      aria-pressed={mode === 'pinyin'}
      onclick={() => onModeChange?.('pinyin')}
    >
      拼
    </button>
    <button
      type="button"
      class="mode-btn"
      class:active={mode === 'english'}
      aria-pressed={mode === 'english'}
      onclick={() => onModeChange?.('english')}
    >
      EN
    </button>
  </div>
</div>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    padding-right: 40px;
    font-size: 18px;
    line-height: 1.5;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    min-height: 44px;
    box-sizing: border-box;
  }

  input::placeholder {
    color: var(--muted);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .clear-btn {
    position: absolute;
    right: 4px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.2s;
  }

  .clear-btn:hover {
    color: var(--fg);
  }

  .clear-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .mode-toggle {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    overflow: hidden;
    flex: 0 0 auto;
    height: 48px;
  }

  .mode-btn {
    padding: 0 12px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .mode-btn:hover {
    color: var(--fg);
  }

  .mode-btn.active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  .mode-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
</style>
