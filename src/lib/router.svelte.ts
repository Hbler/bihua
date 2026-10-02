// Reactive current route, driven by the URL hash.

import { parseHash, searchHref, type Route } from './route.js'

export const router = $state({
  route: parseHash(location.hash),
  /** Last search worth returning to from a character page ('' = none). */
  lastSearch: '',
})

function setRoute(route: Route): void {
  router.route = route
  // A pasted single character redirects to its page, so returning to it would bounce forward.
  if (route.name === 'search') {
    const isSingleChar = [...route.query.trim()].length === 1 && /\p{Script=Han}/u.test(route.query)
    if (!isSingleChar) router.lastSearch = route.query
  }
}

setRoute(router.route)

window.addEventListener('hashchange', () => setRoute(parseHash(location.hash)))

/** Updates the search URL while typing without adding a history entry per keystroke. */
export function replaceSearch(query: string): void {
  history.replaceState(null, '', searchHref(query))
  setRoute({ name: 'search', query })
}
