import type { Tone, Script, WordEntry, WordReading } from '../data/types.js'
import type { Dictionary } from '../data/dictionary.js'
import { extractGlosses, normalizeQuery, tokenizeGloss } from './english.js'
import { splitRegisterLabels } from './register.js'
import { bandForLevel, type SearchFilters } from './search.js'

export type WordPosting = {
  entry: number
  reading: number
  gloss: number
  raw: string
  normalized: string
}

export type WordIndex = {
  entries: WordEntry[]
  byKey: Map<string, number[]>
  byForm: Map<string, number>
  english: Map<string, WordPosting[]>
}

export type WordHit = {
  entry: WordEntry
  readingIndex: number
  matchedGloss: string
  tier?: 1 | 2 | 3
}

/**
 * Builds the WordIndex from decoded WordEntry records.
 * Entries are expected to be in ranking order (index = rank).
 */
export function buildWordIndex(entries: WordEntry[]): WordIndex {
  const byKey = new Map<string, number[]>()
  const byForm = new Map<string, number>()
  const english = new Map<string, WordPosting[]>()

  for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
    const entry = entries[entryIndex]

    if (!byForm.has(entry.word)) {
      byForm.set(entry.word, entryIndex)
    }
    for (const t of entry.traditional) {
      if (!byForm.has(t)) {
        byForm.set(t, entryIndex)
      }
    }

    for (let readingIndex = 0; readingIndex < entry.readings.length; readingIndex++) {
      const reading = entry.readings[readingIndex]

      let keyList = byKey.get(reading.key)
      if (!keyList) {
        keyList = []
        byKey.set(reading.key, keyList)
      }
      if (keyList.length === 0 || keyList[keyList.length - 1] !== entryIndex) {
        keyList.push(entryIndex)
      }

      const glosses = extractGlosses(reading)
      for (let glossIndex = 0; glossIndex < glosses.length; glossIndex++) {
        const { raw, normalized } = glosses[glossIndex]
        const target: WordPosting = {
          entry: entryIndex,
          reading: readingIndex,
          gloss: glossIndex,
          raw,
          normalized,
        }

        const tokens = tokenizeGloss(normalized)
        const seenInGloss = new Set<string>()

        for (const token of tokens) {
          if (!seenInGloss.has(token)) {
            seenInGloss.add(token)
            let tokenPostings = english.get(token)
            if (!tokenPostings) {
              tokenPostings = []
              english.set(token, tokenPostings)
            }
            tokenPostings.push(target)
          }
        }
      }
    }
  }

  return { entries, byKey, byForm, english }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type CandidateItem = {
  entryIndex: number
  readingIndex: number
  glossIndex: number
  matchedGloss: string
  tier: 1 | 2 | 3
  hasReg: boolean
}

function compareCandidates(a: CandidateItem, b: CandidateItem): number {
  if (a.tier !== b.tier) return a.tier - b.tier
  if (a.hasReg !== b.hasReg) return a.hasReg ? 1 : -1
  if (a.entryIndex !== b.entryIndex) return a.entryIndex - b.entryIndex
  if (a.readingIndex !== b.readingIndex) return a.readingIndex - b.readingIndex
  return a.glossIndex - b.glossIndex
}

/**
 * Searches the English single-token index for word hits matching query.
 * Ranks: tier → glosses without register label first (fig does not count) → frequency → gloss index.
 * Returns one hit per word.
 */
export function searchWordsEnglish(index: WordIndex, query: string): WordHit[] {
  const normQuery = normalizeQuery(query)
  if (!normQuery) return []

  const queryTokens = tokenizeGloss(normQuery)
  if (queryTokens.length === 0) return []

  let rarestList: WordPosting[] | null = null
  for (const token of queryTokens) {
    const list = index.english.get(token)
    if (!list || list.length === 0) return []
    if (!rarestList || list.length < rarestList.length) {
      rarestList = list
    }
  }

  if (!rarestList) return []

  const prefixWithSpace = normQuery + ' '
  const phraseRegex = new RegExp(`(?:^|\\b)${escapeRegex(normQuery)}(?:\\b|$)`, 'i')

  const bestHitsByEntry = new Map<number, CandidateItem>()

  for (const cand of rarestList) {
    let tier: 1 | 2 | 3 | null = null
    if (cand.normalized === normQuery) {
      tier = 1
    } else if (cand.normalized.startsWith(prefixWithSpace)) {
      tier = 2
    } else if (phraseRegex.test(cand.normalized)) {
      tier = 3
    }
    if (tier === null) continue

    const { labels } = splitRegisterLabels(cand.raw)
    const hasReg = labels.some((l) => l !== 'fig')

    const item: CandidateItem = {
      entryIndex: cand.entry,
      readingIndex: cand.reading,
      glossIndex: cand.gloss,
      matchedGloss: cand.raw,
      tier,
      hasReg,
    }

    const existing = bestHitsByEntry.get(item.entryIndex)
    if (!existing || compareCandidates(item, existing) < 0) {
      bestHitsByEntry.set(item.entryIndex, item)
    }
  }

  const hits = Array.from(bestHitsByEntry.values())
  hits.sort(compareCandidates)

  return hits.map((h) => ({
    entry: index.entries[h.entryIndex],
    readingIndex: h.readingIndex,
    matchedGloss: h.matchedGloss,
    tier: h.tier,
  }))
}

function readingMatchesTones(reading: WordReading, tones: (Tone | undefined)[]): boolean {
  for (let i = 0; i < tones.length; i++) {
    const tone = tones[i]
    if (tone !== undefined) {
      if (i >= reading.tones.length || reading.tones[i] !== tone) {
        return false
      }
    }
  }
  return true
}

/**
 * Searches word index by pinyin key and optional tones.
 * Keeps readings whose tones match at every position where a tone was typed.
 * Ranking order is preserved. matchedGloss = meanings[0].
 */
export function searchWordsPinyin(
  index: WordIndex,
  parsed: { key: string; tones: (Tone | undefined)[] },
): WordHit[] {
  const list = index.byKey.get(parsed.key)
  if (!list) return []

  const hits: WordHit[] = []
  for (const entryIndex of list) {
    const entry = index.entries[entryIndex]
    const readingIndex = entry.readings.findIndex(
      (r) => r.key === parsed.key && readingMatchesTones(r, parsed.tones),
    )
    if (readingIndex !== -1) {
      hits.push({
        entry,
        readingIndex,
        matchedGloss: entry.readings[readingIndex].meanings[0] || '',
      })
    }
  }
  return hits
}

/**
 * Derives display string and optional counterpart according to script mode.
 * S → Simplified form.
 * T → traditional[0] when it exists, else Simplified.
 * ST → Simplified form with traditional[0] counterpart if present.
 */
export function getWordDisplay(
  entry: WordEntry,
  script: 'S' | 'T' | 'ST' | 'all' | Script,
  /** A character the shown form should contain when there's a choice (裡 → 這裡, not 這裏). */
  prefer?: string,
): { display: string; counterpart?: string } {
  const traditional =
    (prefer && entry.traditional.find((form) => form.includes(prefer))) || entry.traditional[0]
  if (script === 'T') {
    return {
      display: traditional ?? entry.word,
    }
  }
  if (script === 'ST') {
    return {
      display: entry.word,
      counterpart: traditional,
    }
  }
  return {
    display: entry.word,
  }
}

/**
 * Filters word hits according to HSK and handwriting criteria.
 * A word is kept only if every one of its characters satisfies the criteria.
 */
export function filterWordHits(
  hits: WordHit[],
  dict: Dictionary,
  filters: SearchFilters,
): WordHit[] {
  if (!filters.hskFilter) return hits

  const requiredBand = filters.handwritingOnly ? bandForLevel(filters.hskLevel) : null

  return hits.filter((hit) => {
    for (const char of hit.entry.word) {
      const charEntry = dict.byChar.get(char)
      if (!charEntry || charEntry.hsk === null || charEntry.hsk > filters.hskLevel) {
        return false
      }
      if (
        requiredBand !== null &&
        (charEntry.hskWriteBand === null || charEntry.hskWriteBand > requiredBand)
      ) {
        return false
      }
    }
    return true
  })
}

/**
 * Builds an inverted index mapping each character to the indices of the entries
 * containing it, in ranking order, without duplicates.
 * Indexes characters from both the simplified form and all traditional forms.
 */
export function buildCharIndex(entries: WordEntry[]): Map<string, number[]> {
  const index = new Map<string, number[]>()

  for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
    const entry = entries[entryIndex]
    const chars = new Set<string>()

    for (const c of entry.word) {
      chars.add(c)
    }
    for (const trad of entry.traditional) {
      for (const c of trad) {
        chars.add(c)
      }
    }

    for (const c of chars) {
      let list = index.get(c)
      if (!list) {
        list = []
        index.set(c, list)
      }
      list.push(entryIndex)
    }
  }

  return index
}

/**
 * Returns hits containing the character in ranking order.
 * readingIndex is 0 and matchedGloss is readings[0].meanings[0].
 * Words with several readings appear once.
 */
export function wordsContaining(
  entries: WordEntry[],
  charIndex: Map<string, number[]>,
  char: string,
): WordHit[] {
  const list = charIndex.get(char)
  if (!list) return []

  const hits: WordHit[] = []
  for (const entryIndex of list) {
    const entry = entries[entryIndex]
    hits.push({
      entry,
      readingIndex: 0,
      matchedGloss: entry.readings[0]?.meanings[0] ?? '',
    })
  }
  return hits
}

/**
 * Determines the word display script mode for a character page.
 * On a Traditional-only character page (charScript === 'T'), always shows
 * the Traditional form ('T'). Otherwise follows the user's script setting.
 */
export function wordScriptForChar(
  charScript: Script | undefined,
  settingScript: 'S' | 'T' | 'ST',
): 'S' | 'T' | 'ST' {
  if (charScript === 'T') {
    return 'T'
  }
  return settingScript
}

/**
 * Checks if a word entry matches an excluded word by either its Simplified
 * or any of its Traditional forms.
 */
export function isWordExcluded(entry: WordEntry, excludeWord?: string): boolean {
  if (!excludeWord) return false
  return entry.word === excludeWord || entry.traditional.includes(excludeWord)
}
