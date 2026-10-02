<!-- One frame per stroke: earlier strokes solid, the current stroke highlighted, later ones faint. -->
<script lang="ts">
  import type { StrokeData } from '$lib/data/strokes'

  import PracticeGrid from './PracticeGrid.svelte'

  let { data }: { data: StrokeData } = $props()

  const steps = $derived(data.strokes.map((_path, index) => index))
</script>

<ol class="steps">
  {#each steps as step (step)}
    <li>
      <svg
        viewBox="0 0 1024 1024"
        role="img"
        aria-label="Stroke {step + 1} of {data.strokes.length}"
      >
        <PracticeGrid />
        <g transform="translate(0, 900) scale(1, -1)">
          {#each data.strokes as path, index (index)}
            <path
              d={path}
              class:done={index < step}
              class:current={index === step}
              class:todo={index > step}
            />
          {/each}
        </g>
      </svg>
      <span class="number">{step + 1}</span>
    </li>
  {/each}
</ol>

<style>
  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    position: relative;
    border-radius: 6px;
    background: var(--surface);
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .done {
    fill: var(--fg);
  }

  .current {
    fill: var(--accent);
  }

  .todo {
    fill: var(--outline);
  }

  .number {
    position: absolute;
    top: 3px;
    left: 5px;
    font-size: 0.7rem;
    color: var(--muted);
  }
</style>
