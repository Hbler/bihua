// Hash router: #/ (search), #/search/<query>, #/about, #/<char>.
// Hash routes work on GitHub Pages and keep character URLs pasteable into notes.

import type { SearchMode } from './settings.svelte.js'

export type { SearchMode }

export type Route =
  | { name: 'search'; query: string; explicit: boolean }
  | { name: 'english-search'; query: string }
  | { name: 'character'; char: string }
  | { name: 'word'; word: string; char: string | null }
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
  if (path === 'w') return { name: 'word', word: '', char: null }
  if (path.startsWith('w/')) {
    const rest = path.slice('w/'.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx === -1) {
      return { name: 'word', word: rest, char: null }
    }
    const word = rest.slice(0, slashIdx)
    const char = rest.slice(slashIdx + 1) || null
    return { name: 'word', word, char }
  }
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

export function wordHref(word: string, char?: string | null): string {
  const encWord = encodeURIComponent(word)
  if (char) {
    return `#/w/${encWord}/${encodeURIComponent(char)}`
  }
  return `#/w/${encWord}`
}
