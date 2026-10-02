<!-- Faint 田字格 guide lines, drawn in a 1024 × 1024 box. -->
<g class="grid">
  <rect x="4" y="4" width="1016" height="1016" />
  <line x1="512" y1="4" x2="512" y2="1020" />
  <line x1="4" y1="512" x2="1020" y2="512" />
  <line x1="4" y1="4" x2="1020" y2="1020" />
  <line x1="1020" y1="4" x2="4" y2="1020" />
</g>

<style>
  .grid {
    fill: none;
    stroke: var(--grid);
    stroke-width: 6;
  }

  line {
    stroke-dasharray: 24 18;
  }
</style>
