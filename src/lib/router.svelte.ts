// Reactive current route, driven by the URL hash.

import {
  englishSearchHref,
  modeForRoute,
  parseHash,
  type Route,
  type SearchMode,
  wordHref,
} from './route.js'
import { settings } from './settings.svelte.js'

export const router = $state({
  route: parseHash(location.hash),
  /** Last search worth returning to from a character page. */
  lastSearch: {
    query: '',
    mode: 'pinyin' as SearchMode,
  },
})

function setRoute(route: Route): void {
  router.route = route
  // A pasted single character redirects to its page, so returning to it would bounce forward.
  if (route.name === 'search' || route.name === 'english-search') {
    const isSingleChar = [...route.query.trim()].length === 1 && /\p{Script=Han}/u.test(route.query)
    if (!isSingleChar) {
      const mode = modeForRoute(route, settings.searchMode)
      router.lastSearch = { query: route.query, mode }
    }
  }
}

setRoute(router.route)

window.addEventListener('hashchange', () => setRoute(parseHash(location.hash)))

/** Updates the English search URL while typing without adding a history entry per keystroke. */
export function replaceEnglishSearch(query: string): void {
  history.replaceState(null, '', englishSearchHref(query))
  setRoute({ name: 'english-search', query })
}

/** Updates the search URL while typing without adding a history entry per keystroke. */
export function replaceSearch(query: string, mode: SearchMode = 'pinyin'): void {
  if (mode === 'english') {
    replaceEnglishSearch(query)
    return
  }
  const explicit = query.trim() !== ''
  history.replaceState(null, '', explicit ? `#/search/${encodeURIComponent(query)}` : '#/')
  setRoute({ name: 'search', query, explicit })
}

/** Updates the word route with the selected character without adding a history entry. */
export function replaceWordChar(word: string, char: string): void {
  history.replaceState(null, '', wordHref(word, char))
  setRoute({ name: 'word', word, char })
}
