// Reactive current route, driven by the URL hash.

import { parseHash, searchHref } from './route.js'

export const router = $state({ route: parseHash(location.hash) })

window.addEventListener('hashchange', () => {
  router.route = parseHash(location.hash)
})

/** Updates the search URL while typing without adding a history entry per keystroke. */
export function replaceSearch(query: string): void {
  history.replaceState(null, '', searchHref(query))
  router.route = { name: 'search', query }
}
