// Reactive current route, driven by the URL hash.

import { tick } from 'svelte'

import {
  englishSearchHref,
  modeForRoute,
  parseHash,
  type Route,
  type SearchMode,
  wordHref,
} from './route.js'
import { decideScroll, entryIdFrom } from './scroll.js'
import { settings } from './settings.svelte.js'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

let idCounter = 0
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `scroll-${++idCounter}`
}

// Plain Map on purpose: scroll positions are bookkeeping, never rendered.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const saved = new Map<string, number>()
let currentId = ''

if (entryIdFrom(history.state) === undefined) {
  history.replaceState({ ...((history.state as object) || {}), scrollId: newId() }, '')
}
currentId = entryIdFrom(history.state) ?? ''

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

function restoreScroll(y: number): void {
  window.scrollTo(0, y)
  const isTooShort = () => {
    if (window.scrollY >= y - 1) return false
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
    )
    const maxScroll = Math.max(0, scrollHeight - window.innerHeight)
    return maxScroll < y - 1
  }

  if (!isTooShort()) return

  const start = performance.now()
  const targetId = currentId
  function retry(): void {
    if (currentId !== targetId) return
    window.scrollTo(0, y)
    if (!isTooShort()) return
    if (performance.now() - start < 1000) {
      requestAnimationFrame(retry)
    }
  }
  requestAnimationFrame(retry)
}

window.addEventListener('hashchange', async () => {
  saved.set(currentId, window.scrollY)
  let id = entryIdFrom(history.state)
  const decision = decideScroll(id, saved)
  if (id === undefined) {
    id = newId()
    history.replaceState({ ...((history.state as object) || {}), scrollId: id }, '')
  }
  currentId = id
  setRoute(parseHash(location.hash))

  await tick()
  requestAnimationFrame(() => {
    if (decision.kind === 'top') {
      window.scrollTo(0, 0)
    } else if (decision.kind === 'restore') {
      restoreScroll(decision.y)
    }
  })
})

/** Updates the English search URL while typing without adding a history entry per keystroke. */
export function replaceEnglishSearch(query: string): void {
  history.replaceState(history.state, '', englishSearchHref(query))
  setRoute({ name: 'english-search', query })
}

/** Updates the search URL while typing without adding a history entry per keystroke. */
export function replaceSearch(query: string, mode: SearchMode = 'pinyin'): void {
  if (mode === 'english') {
    replaceEnglishSearch(query)
    return
  }
  const explicit = query.trim() !== ''
  history.replaceState(history.state, '', explicit ? `#/search/${encodeURIComponent(query)}` : '#/')
  setRoute({ name: 'search', query, explicit })
}

/** Updates the word route with the selected character without adding a history entry. */
export function replaceWordChar(word: string, char: string): void {
  history.replaceState(history.state, '', wordHref(word, char))
  setRoute({ name: 'word', word, char })
}
