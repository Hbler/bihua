import type { CharEntry, Reading, Script } from '../data/types.js'
import { compareHits, type Dictionary } from '../data/dictionary.js'
import { matchesScriptFilter } from './search.js'
import { wordScriptForChar } from './words.js'

export type ComponentTag = 'meaning' | 'sound' | 'radical'

export type ComponentOfHit = {
  entry: CharEntry
  tags: ComponentTag[]
}

export type ComponentOfIndex = Map<string, CharEntry[]>

const dummyReading: Reading = {
  syllable: '',
  tone: 1,
  pinyin: '',
  meanings: [],
  counterparts: [],
}

/**
 * Compare two CharEntry objects using the search result ranking rules:
 * freqRank ascending (null last), strokeCount ascending (null last), char code point.
 * Reuses compareHits.
 */
export function compareCharEntries(a: CharEntry, b: CharEntry): number {
  return compareHits({ entry: a, reading: dummyReading }, { entry: b, reading: dummyReading })
}

/**
 * Build the Component-of index from a dictionary.
 * For every entry in dict, for each distinct part in entry.components
 * (no duplicates per entry, never the entry itself), push the entry under that part string key.
 * Sort each list with the same order as search results:
 * frequency rank ascending with null last, then stroke count, then code point.
 */
export function buildComponentOfIndex(dict: Dictionary): ComponentOfIndex {
  const index: ComponentOfIndex = new Map()

  for (const entry of dict.byChar.values()) {
    const seenParts = new Set<string>()
    for (const part of entry.components) {
      if (!part || part === entry.char || seenParts.has(part)) {
        continue
      }
      seenParts.add(part)
      let list = index.get(part)
      if (!list) {
        list = []
        index.set(part, list)
      }
      list.push(entry)
    }
  }

  for (const list of index.values()) {
    list.sort(compareCharEntries)
  }

  return index
}

const componentOfIndexCache = new WeakMap<Dictionary, ComponentOfIndex>()

/**
 * Get or lazily build and cache the Component-of index for a dictionary.
 * Cached per dictionary object using a WeakMap.
 */
export function getOrBuildComponentOfIndex(dict: Dictionary): ComponentOfIndex {
  let index = componentOfIndexCache.get(dict)
  if (!index) {
    index = buildComponentOfIndex(dict)
    componentOfIndexCache.set(dict, index)
  }
  return index
}

/**
 * Return tags for a container entry and a part string, in this order:
 * - 'meaning' if container.etymology?.semantic === part
 * - 'sound' if container.etymology?.phonetic === part
 * - 'radical' if container.radical === part
 */
export function componentTags(container: CharEntry, part: string): ComponentTag[] {
  const tags: ComponentTag[] = []
  if (container.etymology?.semantic === part) {
    tags.push('meaning')
  }
  if (container.etymology?.phonetic === part) {
    tags.push('sound')
  }
  if (container.radical === part) {
    tags.push('radical')
  }
  return tags
}

/**
 * Find characters containing a given part character as a direct component.
 *
 * 1. Extract the part character (if it's an entry, use entry.char).
 * 2. Compute script filter: use wordScriptForChar(part's script when entry given, settingScript).
 * 3. Get the list of containers from the index (or [] if not found).
 * 4. Keep only containers matching matchesScriptFilter(container.script, script).
 * 5. Map each container to { entry: container, tags: componentTags(container, partChar) }.
 */
export function componentOf(
  index: ComponentOfIndex,
  part: CharEntry | string,
  settingScript: 'S' | 'T' | 'ST',
): ComponentOfHit[] {
  const partChar = typeof part === 'string' ? part : part.char
  const partScript: Script | undefined = typeof part === 'string' ? undefined : part.script
  const scriptFilter = wordScriptForChar(partScript, settingScript)

  const containers = index.get(partChar) ?? []
  const hits: ComponentOfHit[] = []

  for (const container of containers) {
    if (matchesScriptFilter(container.script, scriptFilter)) {
      hits.push({
        entry: container,
        tags: componentTags(container, partChar),
      })
    }
  }

  return hits
}
