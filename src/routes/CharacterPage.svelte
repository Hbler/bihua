<script lang="ts">
  import type { Dictionary } from '$lib/data/dictionary'
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
