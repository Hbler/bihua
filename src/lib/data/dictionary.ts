import type { CharEntry, DictionaryFile, Reading } from './types.js'

export type Hit = { entry: CharEntry; reading: Reading }

export type Dictionary = {
  byChar: ReadonlyMap<string, CharEntry>
  bySyllable: ReadonlyMap<string, readonly Hit[]>
}

/**
 * Compare two Hits for sorting.
 * Order: freqRank ascending (null last), strokeCount ascending (null last), char code point, tone ascending.
 */
function compareHits(a: Hit, b: Hit): number {
  // freqRank ascending (null last)
  if (a.entry.freqRank !== null && b.entry.freqRank === null) return -1
  if (a.entry.freqRank === null && b.entry.freqRank !== null) return 1
  if (a.entry.freqRank !== null && b.entry.freqRank !== null) {
    if (a.entry.freqRank !== b.entry.freqRank) {
      return a.entry.freqRank - b.entry.freqRank
    }
  }

  // strokeCount ascending (null last)
  if (a.entry.strokeCount !== null && b.entry.strokeCount === null) return -1
  if (a.entry.strokeCount === null && b.entry.strokeCount !== null) return 1
  if (a.entry.strokeCount !== null && b.entry.strokeCount !== null) {
    if (a.entry.strokeCount !== b.entry.strokeCount) {
      return a.entry.strokeCount - b.entry.strokeCount
    }
  }

  // char code point
  const aCode = a.entry.char.codePointAt(0)!
  const bCode = b.entry.char.codePointAt(0)!
  if (aCode !== bCode) return aCode - bCode

  // tone ascending
  return a.reading.tone - b.reading.tone
}

/**
 * Build an indexed dictionary from a DictionaryFile.
 * Creates byChar and bySyllable maps, with bySyllable results pre-sorted.
 */
export function indexDictionary(file: DictionaryFile): Dictionary {
  const byChar = new Map<string, CharEntry>()
  const bySyllableTemp = new Map<string, Hit[]>()

  // Populate byChar and build bySyllable
  for (const entry of file.chars) {
    byChar.set(entry.char, entry)

    for (const reading of entry.readings) {
      const hit: Hit = { entry, reading }
      const syllable = reading.syllable

      if (!bySyllableTemp.has(syllable)) {
        bySyllableTemp.set(syllable, [])
      }
      bySyllableTemp.get(syllable)!.push(hit)
    }
  }

  // Sort each syllable's hits and make readonly
  const bySyllable = new Map<string, readonly Hit[]>()
  for (const [syllable, hits] of bySyllableTemp.entries()) {
    const sorted = hits.sort(compareHits)
    bySyllable.set(syllable, Object.freeze([...sorted]))
  }

  return {
    byChar: new Map(byChar),
    bySyllable,
  }
}

/**
 * Load and index a dictionary from a URL.
 * Validates version === 1 and throws on fetch or validation errors.
 */
export async function loadDictionary(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<Dictionary> {
  const response = await fetchFn(url)

  if (!response.ok) {
    throw new Error(`Failed to load dictionary: HTTP ${response.status}`)
  }

  const data = (await response.json()) as unknown

  // Validate version
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1) {
    throw new Error('Dictionary file has invalid or unsupported version')
  }

  return indexDictionary(data as DictionaryFile)
}
