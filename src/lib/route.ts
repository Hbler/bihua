// Hash router: #/ (search), #/search/<query>, #/about, #/<char>.
// Hash routes work on GitHub Pages and keep character URLs pasteable into notes.

export type Route =
  { name: 'search'; query: string } | { name: 'character'; char: string } | { name: 'about' }

export function parseHash(hash: string): Route {
  let path = hash.replace(/^#\/?/, '')
  try {
    path = decodeURIComponent(path)
  } catch {
    // Malformed escapes: use the raw text.
  }
  if (path === 'about') return { name: 'about' }
  if (path.startsWith('search/')) return { name: 'search', query: path.slice('search/'.length) }
  if ([...path].length === 1 && /\p{Script=Han}/u.test(path))
    return { name: 'character', char: path }
  return { name: 'search', query: path }
}

export function searchHref(query: string): string {
  return query ? `#/search/${encodeURIComponent(query)}` : '#/'
}

export function characterHref(char: string): string {
  return `#/${encodeURIComponent(char)}`
}
