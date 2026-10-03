import { describe, expect, it } from 'vitest'

import type { CharEntry, HskBand, HskLevel, WordRow, WordsFile } from '../data/types.js'
import type { Dictionary } from '../data/dictionary.js'
import { decodeWords } from '../data/words.js'
import { parseWordQuery } from '../pinyin/parse.js'
import {
  buildCharIndex,
  buildWordIndex,
  filterWordHits,
  getWordDisplay,
  isWordExcluded,
  searchWordsEnglish,
  searchWordsPinyin,
  wordsContaining,
  wordScriptForChar,
} from './words.js'

const TEST_ROWS: WordRow[] = [
  ['先生', [['xian1 sheng5', ['teacher', 'gentleman; sir', '(dialect) doctor']]], 93],
  ['说话', [['shuo1 hua4', ['to speak', 'to say', 'to talk'], ['說話']]], 383],
  ['地球', [['di4 qiu2', ['the earth', 'planet Earth']]], 1254],
  ['你好', [['ni3 hao3', ['hello; hi']]], 2021],
  ['大地', [['da4 di4', ['earth', 'mother earth']]], 6441],
  ['用餐', [['yong4 can1', ['to eat a meal']]], 7414],
  ['泥土', [['ni2 tu3', ['earth; soil; mud; clay']]], 8200],
  ['西安', [['xi1 an1', ["Xi'an, capital of Shaanxi"]]], 29902],
  ['府上', [['fu3 shang4', ['(courteous) home']]], 35346],
  ['家园', [['jia1 yuan2', ['home; homeland']]], 40000],
  ['海量', [['hai3 liang4', ['(fig.) magnanimity']]], 50000],
]

const testFile: WordsFile = {
  version: 1,
  built: '2026-10-03',
  words: TEST_ROWS,
}

const entries = decodeWords(testFile)
const index = buildWordIndex(entries)

describe('word search pure logic', () => {
  describe('buildWordIndex', () => {
    it('indexes forms into byForm including traditional counterparts', () => {
      const shuoIndex = index.byForm.get('说话')
      expect(shuoIndex).toBeDefined()
      expect(index.entries[shuoIndex!].word).toBe('说话')

      const tradIndex = index.byForm.get('說話')
      expect(tradIndex).toBe(shuoIndex)
    })

    it('indexes pinyin keys into byKey in ranking order', () => {
      const diqiuIndices = index.byKey.get('diqiu')
      expect(diqiuIndices).toBeDefined()
      expect(diqiuIndices).toEqual([2]) // 地球 is at index 2
    })
  })

  describe('searchWordsEnglish', () => {
    it('ranks "earth" -> 地球 and 大地 in tier 1, 泥土 later', () => {
      const hits = searchWordsEnglish(index, 'earth')
      expect(hits.length).toBeGreaterThanOrEqual(3)

      expect(hits[0].entry.word).toBe('地球')
      expect(hits[0].tier).toBe(1)
      expect(hits[0].matchedGloss).toBe('the earth')

      expect(hits[1].entry.word).toBe('大地')
      expect(hits[1].tier).toBe(1)
      expect(hits[1].matchedGloss).toBe('earth')

      expect(hits[2].entry.word).toBe('泥土')
      expect(hits[2].tier).toBe(1)
      expect(hits[2].matchedGloss).toBe('earth')
    })

    it('matches "to speak" -> 说话', () => {
      const hits = searchWordsEnglish(index, 'to speak')
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].entry.word).toBe('说话')
      expect(hits[0].matchedGloss).toBe('to speak')
      expect(hits[0].tier).toBe(1)
    })

    it('ranks glosses without register labels before glosses with register labels', () => {
      // 府上 has rank index 8 with (courteous) home.
      // 家园 has rank index 9 with home.
      // 家园 must rank first because it has no register label.
      const hits = searchWordsEnglish(index, 'home')
      expect(hits.length).toBe(2)
      expect(hits[0].entry.word).toBe('家园')
      expect(hits[1].entry.word).toBe('府上')
    })

    it('does not penalize (fig.) as a register label', () => {
      const hits = searchWordsEnglish(index, 'magnanimity')
      expect(hits.length).toBe(1)
      expect(hits[0].entry.word).toBe('海量')
      expect(hits[0].tier).toBe(1)
    })
  })

  describe('searchWordsPinyin', () => {
    it('matches diqiu, di4qiu2, dì qiú -> 地球', () => {
      for (const query of ['diqiu', 'di4qiu2', 'dì qiú']) {
        const parsed = parseWordQuery(query)
        expect(parsed).not.toBeNull()
        const hits = searchWordsPinyin(index, parsed!)
        expect(hits.length).toBe(1)
        expect(hits[0].entry.word).toBe('地球')
        expect(hits[0].matchedGloss).toBe('the earth')
      }
    })

    it('matches xian -> 西安 and does NOT match 先生', () => {
      const parsed = parseWordQuery('xian')
      expect(parsed).not.toBeNull()
      const hits = searchWordsPinyin(index, parsed!)
      expect(hits.map((h) => h.entry.word)).toContain('西安')
      expect(hits.map((h) => h.entry.word)).not.toContain('先生')
    })

    it('filters out tone mismatches (di3qiu2 -> nothing)', () => {
      const parsed = parseWordQuery('di3qiu2')
      expect(parsed).not.toBeNull()
      const hits = searchWordsPinyin(index, parsed!)
      expect(hits).toHaveLength(0)
    })
  })

  describe('getWordDisplay', () => {
    it('handles script S, T and ST display and counterparts', () => {
      const shuoEntry = entries[1] // 说话 / 說話
      expect(getWordDisplay(shuoEntry, 'S')).toEqual({ display: '说话' })
      expect(getWordDisplay(shuoEntry, 'T')).toEqual({ display: '說話' })
      expect(getWordDisplay(shuoEntry, 'ST')).toEqual({ display: '说话', counterpart: '說話' })

      const diqiuEntry = entries[2] // 地球 (ST)
      expect(getWordDisplay(diqiuEntry, 'S')).toEqual({ display: '地球' })
      expect(getWordDisplay(diqiuEntry, 'T')).toEqual({ display: '地球' })
      expect(getWordDisplay(diqiuEntry, 'ST')).toEqual({ display: '地球', counterpart: undefined })
    })
  })

  describe('filterWordHits', () => {
    function makeChar(char: string, hsk: number | null, band: number | null): CharEntry {
      return {
        char,
        script: 'ST',
        readings: [],
        freqRank: 1,
        hsk: hsk as unknown as HskLevel | null,
        hskWriteBand: band as unknown as HskBand | null,
        radical: null,
        strokeCount: 1,
        hasStrokes: true,
        components: [],
        hasUnknownComponent: false,
        etymology: null,
      }
    }

    const mockDict: Dictionary = {
      byChar: new Map<string, CharEntry>([
        ['地', makeChar('地', 1, 1)],
        ['球', makeChar('球', 3, 2)],
        ['泥', makeChar('泥', 4, 2)],
        ['土', makeChar('土', 2, 1)],
      ]),
      bySyllable: new Map(),
    }

    const hits = searchWordsEnglish(index, 'earth') // 地球 (hsk max 3), 大地 (大 not in dict), 泥土 (hsk max 4)

    it('keeps all hits when hskFilter is false', () => {
      const filtered = filterWordHits(hits, mockDict, {
        script: 'S',
        hskFilter: false,
        hskLevel: 1,
        handwritingOnly: false,
      })
      expect(filtered).toHaveLength(hits.length)
    })

    it('filters out words where any character exceeds hsk level', () => {
      const filteredLevel2 = filterWordHits(hits, mockDict, {
        script: 'S',
        hskFilter: true,
        hskLevel: 2,
        handwritingOnly: false,
      })
      // 地球 (球 is level 3) -> excluded
      // 大地 (大 not in dict) -> excluded
      // 泥土 (泥 is level 4) -> excluded
      expect(filteredLevel2).toHaveLength(0)

      const filteredLevel3 = filterWordHits(hits, mockDict, {
        script: 'S',
        hskFilter: true,
        hskLevel: 3,
        handwritingOnly: false,
      })
      // 地球: 地(1) and 球(3) <= 3 -> kept!
      expect(filteredLevel3.map((h) => h.entry.word)).toEqual(['地球'])
    })

    it('filters by handwriting band when handwritingOnly is true', () => {
      // HskLevel 3 maps to band 1. 球 has band 2.
      const filtered = filterWordHits(hits, mockDict, {
        script: 'S',
        hskFilter: true,
        hskLevel: 3,
        handwritingOnly: true,
      })
      expect(filtered).toHaveLength(0)

      // HskLevel 4 maps to band 2. 球 has band 2.
      const filteredLevel4 = filterWordHits(hits, mockDict, {
        script: 'S',
        hskFilter: true,
        hskLevel: 4,
        handwritingOnly: true,
      })
      // Both 地球 (bands 1 and 2) and 泥土 (bands 2 and 1) satisfy band <= 2
      expect(filteredLevel4.map((h) => h.entry.word)).toContain('地球')
      expect(filteredLevel4.map((h) => h.entry.word)).toContain('泥土')
    })
  })

  describe('buildCharIndex and wordsContaining', () => {
    const charIndex = buildCharIndex(entries)

    it('finds 地 -> 地球 before 大地, each once', () => {
      const hits = wordsContaining(entries, charIndex, '地')
      expect(hits.map((h) => h.entry.word)).toEqual(['地球', '大地'])
      expect(hits[0].readingIndex).toBe(0)
      expect(hits[0].matchedGloss).toBe('the earth')
      expect(hits[1].readingIndex).toBe(0)
      expect(hits[1].matchedGloss).toBe('earth')
    })

    it('finds 說 -> 说话', () => {
      const hits = wordsContaining(entries, charIndex, '說')
      expect(hits.map((h) => h.entry.word)).toEqual(['说话'])
      expect(hits[0].readingIndex).toBe(0)
      expect(hits[0].matchedGloss).toBe('to speak')
    })

    it('finds 说 -> 说话', () => {
      const hits = wordsContaining(entries, charIndex, '说')
      expect(hits.map((h) => h.entry.word)).toEqual(['说话'])
      expect(hits[0].readingIndex).toBe(0)
      expect(hits[0].matchedGloss).toBe('to speak')
    })

    it('returns empty array for a character that is in no word', () => {
      const hits = wordsContaining(entries, charIndex, '睨')
      expect(hits).toEqual([])
    })

    it('builds the char index only from what is given', () => {
      const singleIndex = buildCharIndex([entries[0]]) // 先生
      expect(singleIndex.has('先')).toBe(true)
      expect(singleIndex.has('生')).toBe(true)
      expect(singleIndex.has('地')).toBe(false)
      expect(singleIndex.has('说')).toBe(false)
      expect(wordsContaining([entries[0]], singleIndex, '地')).toEqual([])
    })
  })

  describe('wordScriptForChar', () => {
    it('always returns T when charScript is T regardless of settingScript', () => {
      expect(wordScriptForChar('T', 'S')).toBe('T')
      expect(wordScriptForChar('T', 'T')).toBe('T')
      expect(wordScriptForChar('T', 'ST')).toBe('T')
    })

    it('returns settingScript when charScript is S, ST, or undefined', () => {
      expect(wordScriptForChar('S', 'S')).toBe('S')
      expect(wordScriptForChar('S', 'T')).toBe('T')
      expect(wordScriptForChar('S', 'ST')).toBe('ST')

      expect(wordScriptForChar('ST', 'S')).toBe('S')
      expect(wordScriptForChar('ST', 'T')).toBe('T')
      expect(wordScriptForChar('ST', 'ST')).toBe('ST')

      expect(wordScriptForChar(undefined, 'S')).toBe('S')
      expect(wordScriptForChar(undefined, 'T')).toBe('T')
      expect(wordScriptForChar(undefined, 'ST')).toBe('ST')
    })
  })

  describe('isWordExcluded', () => {
    const shuoEntry = entries[1] // 说话 / 說話

    it('excludes by simplified form', () => {
      expect(isWordExcluded(shuoEntry, '说话')).toBe(true)
    })

    it('excludes by traditional form', () => {
      expect(isWordExcluded(shuoEntry, '說話')).toBe(true)
    })

    it('does not exclude non-matching words or undefined', () => {
      expect(isWordExcluded(shuoEntry, '地球')).toBe(false)
      expect(isWordExcluded(shuoEntry, undefined)).toBe(false)
      expect(isWordExcluded(shuoEntry, '')).toBe(false)
    })
  })
})

describe('getWordDisplay', () => {
  const [zheli] = decodeWords({
    version: 1,
    built: '2026-10-03',
    words: [['这里', [['zhe4 li3', ['here'], ['這裏', '這裡']]], 100]],
  })

  it('shows the first Traditional form by default', () => {
    expect(getWordDisplay(zheli, 'T').display).toBe('這裏')
  })

  it('prefers the Traditional form containing the given character', () => {
    expect(getWordDisplay(zheli, 'T', '裡').display).toBe('這裡')
    expect(getWordDisplay(zheli, 'ST', '裡').counterpart).toBe('這裡')
  })

  it('keeps the Simplified form outside Traditional mode', () => {
    expect(getWordDisplay(zheli, 'S', '裡').display).toBe('这里')
  })
})
