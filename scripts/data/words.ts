// Merges parsed CC-CEDICT words, SUBTLEX-CH word frequencies, and Jun Da character ranks
// into compact WordRow records. Pure: no file access, so it is unit-tested.

import type { WordReadingRow, WordRow } from '../../src/lib/data/types.ts'
import { shouldSkipGloss } from '../../src/lib/search/english.ts'

import type { CedictWordEntry } from './sources/cedict.ts'

export { shouldSkipGloss }

export type WordMergeInput = {
  cedict: CedictWordEntry[]
  /** SUBTLEX-CH frequency rank per word. */
  subtlex: Map<string, number>
  /** Jun Da frequency rank per character (used as tie-breaker for words without SUBTLEX rank). */
  junda: Map<string, number>
}

type ReadingAcc = {
  pinyin: string
  common: string[]
  proper: string[]
  counterparts: Set<string>
  seeTargets: string[]
}

type WordAcc = {
  readings: Map<string, ReadingAcc>
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value)
}

function averageJunDaRank(word: string, junda: Map<string, number>): number {
  const chars = [...word]
  if (chars.length === 0) return 10000
  let sum = 0
  for (const char of chars) {
    sum += junda.get(char) ?? 10000
  }
  return sum / chars.length
}

function compareCodePoints(a: string, b: string): number {
  const charsA = [...a]
  const charsB = [...b]
  const len = Math.min(charsA.length, charsB.length)
  for (let i = 0; i < len; i++) {
    const cpA = charsA[i].codePointAt(0)!
    const cpB = charsB[i].codePointAt(0)!
    if (cpA !== cpB) return cpA - cpB
  }
  return charsA.length - charsB.length
}

const SEE_TARGET_RE = /^see (?:also )?(?:[^\s|[]+?\|)?([^\s[]+?)(?:\[|$)/i

export function mergeWords(input: WordMergeInput): WordRow[] {
  // Map of non-skipped glosses by word form (simp or trad) for cross-reference resolution
  const realGlossesByWord = new Map<string, string[]>()
  for (const entry of input.cedict) {
    const valid = entry.glosses.filter((g) => !shouldSkipGloss(g))
    if (valid.length > 0) {
      for (const form of [entry.simp, entry.trad]) {
        let list = realGlossesByWord.get(form)
        if (!list) {
          list = []
          realGlossesByWord.set(form, list)
        }
        for (const g of valid) {
          pushUnique(list, g)
        }
      }
    }
  }

  const words = new Map<string, WordAcc>()
  for (const entry of input.cedict) {
    let wordAcc = words.get(entry.simp)
    if (!wordAcc) {
      wordAcc = { readings: new Map() }
      words.set(entry.simp, wordAcc)
    }

    const pinyinKey = entry.syllables.map((s, i) => `${s}${entry.tones[i]}`).join(' ')
    let reading = wordAcc.readings.get(pinyinKey)
    if (!reading) {
      reading = {
        pinyin: pinyinKey,
        common: [],
        proper: [],
        counterparts: new Set(),
        seeTargets: [],
      }
      wordAcc.readings.set(pinyinKey, reading)
    }

    for (const gloss of entry.glosses) {
      if (shouldSkipGloss(gloss)) {
        const m = SEE_TARGET_RE.exec(gloss)
        if (m) reading.seeTargets.push(m[1])
      } else if (entry.isProperNoun) {
        pushUnique(reading.proper, gloss)
      } else {
        pushUnique(reading.common, gloss)
      }
    }

    if (entry.trad !== entry.simp) {
      reading.counterparts.add(entry.trad)
    }
  }

  // Resolve cross-references for readings that only had "see ..." glosses
  for (const [, wordAcc] of words) {
    for (const reading of wordAcc.readings.values()) {
      if (reading.common.length === 0 && reading.proper.length === 0) {
        for (const target of reading.seeTargets) {
          const resolved = realGlossesByWord.get(target)
          if (resolved) {
            for (const g of resolved) {
              pushUnique(reading.proper, g)
            }
          }
        }
      }
    }
  }

  type CandidateWord = {
    word: string
    readingRows: WordReadingRow[]
    rank: number
  }

  const candidates: CandidateWord[] = []

  for (const [word, acc] of words) {
    const isFormInSubtlex = input.subtlex.has(word)
    const readingRows: WordReadingRow[] = []

    for (const reading of acc.readings.values()) {
      const isProperOnly = reading.common.length === 0 && reading.proper.length > 0
      if (isProperOnly && !isFormInSubtlex) continue

      const meanings = [...reading.common, ...reading.proper]
      if (meanings.length === 0) continue

      const counterparts = Array.from(reading.counterparts)
      if (counterparts.length > 0) {
        readingRows.push([reading.pinyin, meanings, counterparts])
      } else {
        readingRows.push([reading.pinyin, meanings])
      }
    }

    if (readingRows.length === 0) continue

    const rank = input.subtlex.get(word) ?? 0
    candidates.push({ word, readingRows, rank })
  }

  // Sort words: freqRank ascending (0/unranked last), then average Jun Da rank, then code points
  candidates.sort((a, b) => {
    if (a.rank > 0 && b.rank > 0) {
      if (a.rank !== b.rank) return a.rank - b.rank
    } else if (a.rank > 0) {
      return -1
    } else if (b.rank > 0) {
      return 1
    }

    if (a.rank === 0 && b.rank === 0) {
      const avgA = averageJunDaRank(a.word, input.junda)
      const avgB = averageJunDaRank(b.word, input.junda)
      if (avgA !== avgB) return avgA - avgB
    }

    return compareCodePoints(a.word, b.word)
  })

  return candidates.map((c) => [c.word, c.readingRows, c.rank])
}
