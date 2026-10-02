<!-- Animated stroke order (Hanzi Writer) with replay and speed controls. -->
<script lang="ts">
  import HanziWriter from 'hanzi-writer'

  import { charDataLoader } from '$lib/data/strokes'
  import { settings, type AnimationSpeed } from '$lib/settings.svelte'

  import PracticeGrid from './PracticeGrid.svelte'

  let { char }: { char: string } = $props()

  const SPEEDS: AnimationSpeed[] = [0.5, 1, 2]

  let container: HTMLDivElement
  let size = $state(0)
  let writer: HanziWriter | null = null

  function cssColor(name: string): string {
    return getComputedStyle(container).getPropertyValue(name).trim()
  }

  function replay(): void {
    writer?.animateCharacter()
  }

  /** Attachment: mounts a Hanzi Writer in the node; re-runs when char, size or speed change. */
  function mountWriter(node: HTMLDivElement) {
    if (!size) return
    writer = HanziWriter.create(node, char, {
      width: size,
      height: size,
      padding: size * 0.06,
      charDataLoader,
      showOutline: true,
      showCharacter: false,
      strokeAnimationSpeed: settings.animationSpeed,
      delayBetweenStrokes: 300 / settings.animationSpeed,
      strokeColor: cssColor('--fg'),
      outlineColor: cssColor('--outline'),
      radicalColor: null,
    })
    writer.animateCharacter()
    return () => {
      writer?.pauseAnimation()
      writer = null
      node.replaceChildren()
    }
  }

  $effect(() => {
    const observer = new ResizeObserver(([entry]) => {
      // Re-create only on real size changes, rounded to avoid loops on sub-pixel jitter.
      const next = Math.round(entry.contentRect.width)
      if (Math.abs(next - size) > 4) size = next
    })
    observer.observe(container)
    return () => observer.disconnect()
  })
</script>

<div class="animation">
  <div class="stage" bind:this={container}>
    <svg class="grid" viewBox="0 0 1024 1024" aria-hidden="true"><PracticeGrid /></svg>
    <div class="writer" {@attach mountWriter}></div>
  </div>
  <div class="controls">
    <button type="button" onclick={replay}>Replay</button>
    <div class="speeds" role="group" aria-label="Animation speed">
      {#each SPEEDS as speed (speed)}
        <button
          type="button"
          aria-pressed={settings.animationSpeed === speed}
          onclick={() => (settings.animationSpeed = speed)}>{speed}×</button
        >
      {/each}
    </div>
  </div>
</div>

<style>
  .animation {
    width: 100%;
    max-width: 320px;
  }

  .stage {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    background: var(--surface);
  }

  .stage :global(svg) {
    position: absolute;
    inset: 0;
  }

  .grid,
  .writer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
  }

  .speeds {
    display: flex;
    gap: 4px;
  }
</style>
