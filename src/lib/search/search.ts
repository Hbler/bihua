import type { HskLevel, HskBand, Tone, Script } from '../data/types.js'
import type { Hit, Dictionary } from '../data/dictionary.js'

export type SearchFilters = {
  script: 'S' | 'T' | 'ST'
  hskFilter: boolean
  hskLevel: HskLevel
  handwritingOnly: boolean
}

export const DEFAULT_FILTERS: SearchFilters = {
  script: 'S',
  hskFilter: false,
  hskLevel: 1,
  handwritingOnly: false,
}

/**
 * Map HSK level to handwriting band.
 * 1–3 → 1, 4–6 → 2, 7 → 3
 */
export function bandForLevel(level: HskLevel): HskBand {
  if (level >= 1 && level <= 3) return 1
  if (level >= 4 && level <= 6) return 2
  return 3
}

/**
 * Search for entries by syllable with optional tone and filters.
 * Results are pre-sorted by the dictionary and filtered in-place.
 * Does not mutate the input dictionary.
 */
export function searchSyllable(
  dict: Dictionary,
  syllable: string,
  tone: Tone | undefined,
  filters: SearchFilters,
): Hit[] {
  const hits = dict.bySyllable.get(syllable) ?? []
  const result: Hit[] = []

  for (const hit of hits) {
    // Filter by tone if provided
    if (tone !== undefined && hit.reading.tone !== tone) {
      continue
    }

    // Filter by script
    const scriptMatches = matchesScriptFilter(hit.entry.script, filters.script)
    if (!scriptMatches) {
      continue
    }

    // Skip useless entries: no meanings and no stroke data
    if (hit.reading.meanings.length === 0 && !hit.entry.hasStrokes) {
      continue
    }

    // Filter by HSK if enabled
    if (filters.hskFilter) {
      if (hit.entry.hsk === null || hit.entry.hsk > filters.hskLevel) {
        continue
      }

      // Filter by handwriting band if enabled
      if (filters.handwritingOnly) {
        const requiredBand = bandForLevel(filters.hskLevel)
        if (hit.entry.hskWriteBand === null || hit.entry.hskWriteBand > requiredBand) {
          continue
        }
      }
    }

    result.push(hit)
  }

  return result
}

/**
 * Check if an entry's script matches the requested script filter.
 */
function matchesScriptFilter(entryScript: Script, filterScript: 'S' | 'T' | 'ST'): boolean {
  if (filterScript === 'ST') return true
  if (filterScript === 'S') return entryScript === 'S' || entryScript === 'ST'
  // filterScript === 'T'
  return entryScript === 'T' || entryScript === 'ST'
}
