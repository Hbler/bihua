<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary'
  import { recordView } from '$lib/recent.svelte'
  import { searchHref } from '$lib/route'
  import { router } from '$lib/router.svelte'

  import CharacterView from '../components/CharacterView.svelte'

  let { dict, char }: { dict: Dictionary; char: string } = $props()

  $effect(() => {
    document.title = `${char} — Bihua`
    return () => {
      document.title = 'Bihua 笔画'
    }
  })

  $effect(() => {
    const entry = dict.byChar.get(char)
    // Component forms (⺈) have an entry but no readings: not recorded, per the canvas
    if (entry && entry.readings.length > 0) {
      recordView({ kind: 'char', text: char, pinyin: entry.readings[0].pinyin })
    }
  })
</script>

<a class="back" href={searchHref(router.lastSearch.query, router.lastSearch.mode)}>← Search</a>

<CharacterView {dict} {char} />

<style>
  .back {
    display: inline-block;
    margin-bottom: 12px;
    color: var(--muted);
    text-decoration: none;
  }
</style>
