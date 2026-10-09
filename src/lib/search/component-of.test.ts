import { describe, expect, it } from 'vitest'

import realDictJson from '../../../public/data/dict.json'
import { indexDictionary } from '../data/dictionary.js'
import type { CharEntry, DictionaryFile } from '../data/types.js'
import {
  buildComponentOfIndex,
  compareCharEntries,
  componentOf,
  componentTags,
  getOrBuildComponentOfIndex,
} from './component-of.js'

function createEntry(overrides: Partial<CharEntry> & { char: string }): CharEntry {
  return {
    script: 'S',
    readings: [
      {
        syllable: 'test',
        tone: 1,
        pinyin: 'tēst',
        meanings: ['test'],
        counterparts: [],
      },
    ],
    freqRank: null,
    hsk: null,
    hskWriteBand: null,
    radical: null,
    strokeCount: 4,
    hasStrokes: true,
    components: [],
    hasUnknownComponent: false,
    etymology: null,
    ...overrides,
  }
}

// Test fixture entries as specified in requirements:
// - 木 (S, freqRank: 100)
// - 林 (S, freqRank: 101, components: ['木'], no etymology)
// - 森 (S, freqRank: 102, components: ['木', '木', '木'], test de-duplication)
// - 机 (S, freqRank: 103, components: ['木'])
// - 样 (S, freqRank: 104, components: ['木'])
// - 讠 (S, freqRank: 110)
// - 言 (T, freqRank: 111)
// - 说 (S, freqRank: 112, components: ['讠'], etymology with semantic/phonetic)
// - 說 (T, freqRank: 113, components: ['言'], etymology with semantic/phonetic)
// - 信 (ST, freqRank: 114, components: ['讠', '言'])
// - One entry with radical set to part but part NOT in components (test radical-only not listed)
const entryMu = createEntry({
  char: '木',
  script: 'S',
  freqRank: 100,
  radical: '木',
  strokeCount: 4,
})

const entryLin = createEntry({
  char: '林',
  script: 'S',
  freqRank: 101,
  components: ['木'],
  radical: '木',
  strokeCount: 8,
  etymology: null,
})

const entrySen = createEntry({
  char: '森',
  script: 'S',
  freqRank: 102,
  components: ['木', '木', '木'],
  radical: '木',
  strokeCount: 12,
  etymology: null,
})

const entryJi = createEntry({
  char: '机',
  script: 'S',
  freqRank: 103,
  components: ['木'],
  radical: '木',
  strokeCount: 6,
  etymology: { type: 'pictophonetic', semantic: '木', phonetic: '几' },
})

const entryYang = createEntry({
  char: '样',
  script: 'S',
  freqRank: 104,
  components: ['木'],
  radical: '木',
  strokeCount: 10,
  etymology: { type: 'pictophonetic', semantic: '木', phonetic: '羊' },
})

const entryYanSimp = createEntry({
  char: '讠',
  script: 'S',
  freqRank: 110,
  radical: '讠',
  strokeCount: 2,
})

const entryYanTrad = createEntry({
  char: '言',
  script: 'T',
  freqRank: 111,
  radical: '言',
  strokeCount: 7,
})

const entryShuoSimp = createEntry({
  char: '说',
  script: 'S',
  freqRank: 112,
  components: ['讠'],
  radical: '讠',
  strokeCount: 9,
  etymology: { type: 'pictophonetic', semantic: '讠', phonetic: '兑' },
})

const entryShuoTrad = createEntry({
  char: '說',
  script: 'T',
  freqRank: 113,
  components: ['言'],
  radical: '言',
  strokeCount: 14,
  etymology: { type: 'pictophonetic', semantic: '言', phonetic: '兌' },
})

const entryXin = createEntry({
  char: '信',
  script: 'ST',
  freqRank: 114,
  components: ['讠', '言'],
  radical: '亻',
  strokeCount: 9,
  etymology: { type: 'ideographic', semantic: '言' },
})

// Entry with radical set to part ('木'), but part NOT in components
const entryYao = createEntry({
  char: '杳',
  script: 'S',
  freqRank: 120,
  radical: '木',
  components: ['日', '十'],
  strokeCount: 8,
  etymology: null,
})

// Entries inserted out of order to ensure index sorting is tested
const fixtureDictFile: DictionaryFile = {
  version: 1,
  built: '2026-10-08',
  chars: [
    entryYang,
    entryXin,
    entryMu,
    entrySen,
    entryShuoSimp,
    entryYanTrad,
    entryLin,
    entryJi,
    entryShuoTrad,
    entryYanSimp,
    entryYao,
  ],
}

const fixtureDict = indexDictionary(fixtureDictFile)

describe('component-of', () => {
  describe('buildComponentOfIndex', () => {
    it('1. maps 木 to container list ordered by frequency', () => {
      const index = buildComponentOfIndex(fixtureDict)
      const list = index.get('木')

      expect(list).toBeDefined()
      expect(list!.map((e) => e.char)).toEqual(['林', '森', '机', '样'])
      expect(list!.map((e) => e.freqRank)).toEqual([101, 102, 103, 104])
    })

    it('never indexes an entry under itself', () => {
      const entrySelf = createEntry({
        char: '自',
        components: ['自', '木'],
        freqRank: 99,
      })
      const testDict = indexDictionary({
        version: 1,
        built: '2026-10-08',
        chars: [entrySelf],
      })
      const index = buildComponentOfIndex(testDict)
      expect(index.has('自')).toBe(false)
      expect(index.get('木')?.map((e) => e.char)).toEqual(['自'])
    })

    it('orders by stroke count then code point when freqRank is null or tied', () => {
      const a = createEntry({ char: '乙', freqRank: null, strokeCount: 1 })
      const b = createEntry({ char: '丁', freqRank: null, strokeCount: 2 })
      const c = createEntry({ char: '七', freqRank: null, strokeCount: 2 })
      const d = createEntry({ char: '甲', freqRank: 10, strokeCount: 5 })

      expect(compareCharEntries(d, a)).toBeLessThan(0)
      expect(compareCharEntries(a, d)).toBeGreaterThan(0)
      expect(compareCharEntries(a, b)).toBeLessThan(0)
      // b ('丁': U+4E01) vs c ('七': U+4E03)
      expect(compareCharEntries(b, c)).toBeLessThan(0)
    })
  })

  describe('componentOf', () => {
    it('2. returns [林, 森 once, 机, 样] in frequency order for 木 in S script', () => {
      const index = buildComponentOfIndex(fixtureDict)
      const hits = componentOf(index, '木', 'S')

      expect(hits.map((h) => h.entry.char)).toEqual(['林', '森', '机', '样'])
      expect(hits.map((h) => h.entry.freqRank)).toEqual([101, 102, 103, 104])

      // Also works when passing CharEntry
      const hitsFromEntry = componentOf(index, entryMu, 'S')
      expect(hitsFromEntry.map((h) => h.entry.char)).toEqual(['林', '森', '机', '样'])
    })

    it('3. deduplicates repeated parts (森 has 3×木, listed once)', () => {
      const index = buildComponentOfIndex(fixtureDict)
      const hits = componentOf(index, '木', 'S')
      const senHits = hits.filter((h) => h.entry.char === '森')

      expect(senHits).toHaveLength(1)
      expect(index.get('木')!.filter((e) => e.char === '森')).toHaveLength(1)
    })

    it('4. filters by script: 讠 in S keeps S/ST only; in ST keeps all', () => {
      const index = buildComponentOfIndex(fixtureDict)

      // 讠 has containers: 说 (S), 信 (ST)
      const hitsS = componentOf(index, '讠', 'S')
      expect(hitsS.map((h) => h.entry.char)).toEqual(['说', '信'])
      expect(hitsS.every((h) => h.entry.script === 'S' || h.entry.script === 'ST')).toBe(true)

      const hitsST = componentOf(index, '讠', 'ST')
      expect(hitsST.map((h) => h.entry.char)).toEqual(['说', '信'])

      // 言 has containers: 說 (T), 信 (ST)
      // When queried with string '言' and setting 'S', 說 (T) is excluded
      const hitsYanS = componentOf(index, '言', 'S')
      expect(hitsYanS.map((h) => h.entry.char)).toEqual(['信'])

      // When queried with string '言' and setting 'ST', both are included
      const hitsYanST = componentOf(index, '言', 'ST')
      expect(hitsYanST.map((h) => h.entry.char)).toEqual(['說', '信'])

      // When queried with CharEntry 言 (script T), Traditional mode is forced
      const hitsYanEntry = componentOf(index, entryYanTrad, 'S')
      expect(hitsYanEntry.map((h) => h.entry.char)).toEqual(['說', '信'])
    })

    it('5. assigns tags meaning/sound/radical in correct order', () => {
      const index = buildComponentOfIndex(fixtureDict)

      // 说 (semantic: 讠, phonetic: 兑, radical: 讠) with part 讠
      const shuoHits = componentOf(index, '讠', 'S')
      const shuoHit = shuoHits.find((h) => h.entry.char === '说')
      expect(shuoHit?.tags).toEqual(['meaning', 'radical'])

      // 林 (no etymology, radical: 木) with part 木
      const muHits = componentOf(index, '木', 'S')
      const linHit = muHits.find((h) => h.entry.char === '林')
      expect(linHit?.tags).toEqual(['radical'])

      // 信 (semantic: 言, radical: 亻) with part 讠
      const xinHitYanSimp = shuoHits.find((h) => h.entry.char === '信')
      expect(xinHitYanSimp?.tags).toEqual([])

      // 信 with part 言
      const yanHits = componentOf(index, '言', 'ST')
      const xinHitYanTrad = yanHits.find((h) => h.entry.char === '信')
      expect(xinHitYanTrad?.tags).toEqual(['meaning'])
    })

    it('6. does not list entries where character is radical-only but not in components', () => {
      const index = buildComponentOfIndex(fixtureDict)

      // 杳 has radical: '木', but components: ['日', '十']
      expect(index.get('木')?.some((e) => e.char === '杳')).toBe(false)
      const muHits = componentOf(index, '木', 'S')
      expect(muHits.some((h) => h.entry.char === '杳')).toBe(false)
    })

    it('7. returns empty array for unknown part', () => {
      const index = buildComponentOfIndex(fixtureDict)
      expect(componentOf(index, 'unknown', 'S')).toEqual([])
      expect(componentOf(index, 'xyz', 'ST')).toEqual([])
      expect(componentOf(index, '', 'S')).toEqual([])
    })
  })

  describe('componentTags', () => {
    it('returns empty array when no tag matches', () => {
      const entry = createEntry({ char: 'A', radical: 'B', etymology: null })
      expect(componentTags(entry, 'C')).toEqual([])
    })

    it('returns tags in precise order [meaning, sound, radical]', () => {
      const entryAll = createEntry({
        char: 'X',
        radical: 'P',
        etymology: { type: 'pictophonetic', semantic: 'P', phonetic: 'P' },
      })
      expect(componentTags(entryAll, 'P')).toEqual(['meaning', 'sound', 'radical'])

      const entrySound = createEntry({
        char: 'X',
        radical: 'R',
        etymology: { type: 'pictophonetic', semantic: 'M', phonetic: 'P' },
      })
      expect(componentTags(entrySound, 'P')).toEqual(['sound'])

      const entrySoundRadical = createEntry({
        char: 'X',
        radical: 'P',
        etymology: { type: 'pictophonetic', semantic: 'M', phonetic: 'P' },
      })
      expect(componentTags(entrySoundRadical, 'P')).toEqual(['sound', 'radical'])
    })
  })

  describe('getOrBuildComponentOfIndex', () => {
    it('8. caches index per dictionary object', () => {
      const idx1 = getOrBuildComponentOfIndex(fixtureDict)
      const idx2 = getOrBuildComponentOfIndex(fixtureDict)
      expect(idx1).toBe(idx2)

      const otherDict = indexDictionary({ version: 1, built: '', chars: [] })
      const idx3 = getOrBuildComponentOfIndex(otherDict)
      expect(idx3).not.toBe(idx1)
    })
  })

  describe('real dictionary', () => {
    it('9. verifies 讠 and 言 counts on real dict.json and measures build time', () => {
      const realDict = indexDictionary(realDictJson as unknown as DictionaryFile)

      const t0 = performance.now()
      const realIndex = buildComponentOfIndex(realDict)
      const t1 = performance.now()

      console.log(`Real dict component-of index build time: ${(t1 - t0).toFixed(2)} ms`)

      const yanHits = componentOf(realIndex, '讠', 'S')
      expect(yanHits.length).toBe(147)

      const yanTradHitsS = componentOf(realIndex, '言', 'S')
      expect(yanTradHitsS.length).toBe(19)

      const yanTradHitsST = componentOf(realIndex, '言', 'ST')
      expect(yanTradHitsST.length).toBe(162)
    })
  })
})
