<!-- Inline speaker button for character readings and words. -->
<script lang="ts">
  import { onMount } from 'svelte'

  import type { PlayPlan } from '$lib/audio/plan.js'
  import { initSpeaker, play, speaker, stop } from '$lib/audio/speaker.svelte.js'

  interface Props {
    id: string
    label: string
    getPlan: (hasVoice: boolean) => PlayPlan | null
  }

  let { id, label, getPlan }: Props = $props()

  const plan = $derived(speaker.ready ? getPlan(speaker.hasVoice) : null)

  function handleClick() {
    if (speaker.playingId === id) {
      stop()
    } else {
      play(id, getPlan)
    }
  }

  onMount(() => {
    void initSpeaker()
  })
</script>

{#if plan !== null}
  <button
    type="button"
    class="speak"
    aria-label={label}
    title={label}
    aria-pressed={speaker.playingId === id}
    onclick={handleClick}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  </button>
{/if}

<style>
  button.speak {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    align-self: center;
    min-width: 44px;
    min-height: 44px;
    padding: 11px;
    margin: -11px 0;
    border: none;
    background: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: 4px;
    line-height: 1;
  }

  button.speak:hover {
    color: var(--fg);
  }

  button.speak[aria-pressed='true'],
  button.speak[aria-pressed='true']:hover {
    background: none;
    border: none;
    color: var(--accent);
  }

  button.speak:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  svg {
    width: 1.1em;
    height: 1.1em;
    vertical-align: middle;
  }
</style>
