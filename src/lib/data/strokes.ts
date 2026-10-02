// Loads stroke data from this site's own strokes/ folder (copied from hanzi-writer-data at build),
// so Hanzi Writer never fetches from its default CDN and the app works offline.

import type { CharDataLoaderFn, CharacterJson } from 'hanzi-writer'

export type StrokeData = CharacterJson

export type StrokeResult =
  { kind: 'ok'; data: StrokeData } | { kind: 'missing' } | { kind: 'offline' }

const cache = new Map<string, Promise<StrokeResult>>()

async function fetchStrokes(char: string): Promise<StrokeResult> {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}strokes/${encodeURIComponent(char)}.json`,
    )
    if (response.status === 404) return { kind: 'missing' }
    if (!response.ok) return { kind: 'offline' }
    try {
      return { kind: 'ok', data: (await response.json()) as StrokeData }
    } catch {
      // Some static hosts answer unknown paths with the HTML page instead of a 404.
      return { kind: 'missing' }
    }
  } catch {
    return { kind: 'offline' }
  }
}

export function loadStrokes(char: string): Promise<StrokeResult> {
  let result = cache.get(char)
  if (!result) {
    result = fetchStrokes(char)
    cache.set(char, result)
    // Don't remember network failures: the next attempt may be online.
    result.then((r) => r.kind === 'offline' && cache.delete(char))
  }
  return result
}

export const charDataLoader: CharDataLoaderFn = (char, onLoad, onError) => {
  loadStrokes(char).then((result) => (result.kind === 'ok' ? onLoad(result.data) : onError(result)))
}
