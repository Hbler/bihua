<script lang="ts">
  interface Props {
    value: string
    oninput: (value: string) => void
  }

  let { value, oninput }: Props = $props()

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement
    oninput(target.value)
  }

  function handleClear(): void {
    oninput('')
  }
</script>

<div class="search-bar">
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="text"
    {value}
    oninput={handleInput}
    inputmode="text"
    autocapitalize="off"
    autocomplete="off"
    spellcheck="false"
    placeholder="Pinyin (shi, shi4, shì) or a character"
    aria-label="Search for a character by pinyin or paste one"
    autofocus
  />
  {#if value}
    <button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear search">
      ×
    </button>
  {/if}
</div>

<style>
  .search-bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  input {
    flex: 1;
    padding: 12px 16px;
    font-size: 18px;
    line-height: 1.5;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--fg);
    min-height: 44px;
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
    right: 8px;
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
</style>
