// Hash router: #/ (search), #/search/<query>, #/about, #/<char>.
// Hash routes work on GitHub Pages and keep character URLs pasteable into notes.

import type { SearchMode } from './settings.svelte.js'

export type { SearchMode }

export type Route =
  | { name: 'search'; query: string; explicit: boolean }
  | { name: 'english-search'; query: string }
  | { name: 'character'; char: string }
  | { name: 'about' }

export function parseHash(hash: string): Route {
  let path = hash.replace(/^#\/?/, '')
  try {
    path = decodeURIComponent(path)
  } catch {
    // Malformed escapes: use the raw text.
  }
  if (path === 'about') return { name: 'about' }
  if (path === 'en') return { name: 'english-search', query: '' }
  if (path.startsWith('en/')) return { name: 'english-search', query: path.slice('en/'.length) }
  if (path.startsWith('search/'))
    return { name: 'search', query: path.slice('search/'.length), explicit: true }
  if ([...path].length === 1 && /\p{Script=Han}/u.test(path))
    return { name: 'character', char: path }
  return { name: 'search', query: path, explicit: false }
}

export function englishSearchHref(query: string): string {
  return query ? `#/en/${encodeURIComponent(query)}` : '#/en'
}

export function modeForRoute(route: Route, remembered: SearchMode): SearchMode {
  if (route.name === 'english-search') return 'english'
  if (route.name === 'search' && route.explicit) return 'pinyin'
  return remembered
}

export function searchHref(query: string, mode: SearchMode = 'pinyin'): string {
  if (mode === 'english') return englishSearchHref(query)
  return query.trim() ? `#/search/${encodeURIComponent(query)}` : '#/'
}

export function characterHref(char: string): string {
  return `#/${encodeURIComponent(char)}`
}
