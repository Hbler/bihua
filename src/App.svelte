<script lang="ts">
  import { dictionary, initDictionary } from '$lib/dictionary.svelte'
  import { router } from '$lib/router.svelte'

  import AboutPage from './routes/AboutPage.svelte'
  import CharacterPage from './routes/CharacterPage.svelte'
  import SearchPage from './routes/SearchPage.svelte'

  initDictionary()
</script>

<header>
  <a class="home" href="#/"><span lang="zh-Hans">笔画</span> Bihua</a>
  <a href="#/about">About</a>
</header>

<main>
  {#if dictionary.current.status === 'loading'}
    <p class="status">Loading dictionary…</p>
  {:else if dictionary.current.status === 'error'}
    <div class="status">
      <p>Couldn't load the dictionary ({dictionary.current.message}).</p>
      <button type="button" onclick={initDictionary}>Retry</button>
    </div>
  {:else if router.route.name === 'character'}
    <CharacterPage dict={dictionary.current.dict} char={router.route.char} />
  {:else if router.route.name === 'about'}
    <AboutPage />
  {:else if router.route.name === 'search' || router.route.name === 'english-search'}
    <SearchPage dict={dictionary.current.dict} query={router.route.query} />
  {/if}
</main>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 960px;
    margin: 0 auto;
    padding: 12px 16px;
  }

  header a {
    color: var(--muted);
    text-decoration: none;
  }

  .home {
    font-weight: 600;
    color: var(--fg) !important;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 16px 48px;
  }

  .status {
    padding: 48px 0;
    text-align: center;
    color: var(--muted);
  }
</style>
