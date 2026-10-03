import { describe, expect, it } from 'vitest'

import { indexDictionary } from '../data/dictionary.js'
import { testDictFile } from '../data/fixtures.js'
import type { DictionaryFile } from '../data/types.js'
import {
  buildEnglishIndex,
  comparePostings,
  extractGlosses,
  normalizeGloss,
  normalizeQuery,
  searchEnglish,
  shouldSkipGloss,
  type Posting,
} from './english.js'
import { DEFAULT_FILTERS } from './search.js'

describe('normalizeGloss', () => {
  it('lowercases glosses', () => {
    expect(normalizeGloss('Earth')).toBe('earth')
    expect(normalizeGloss('SOIL')).toBe('soil')
  })

  it('strips parenthetical labels', () => {
    expect(normalizeGloss('(literary) earth')).toBe('earth')
    expect(normalizeGloss('(bound form) soil')).toBe('soil')
    expect(normalizeGloss('(fig.) deeply moved')).toBe('deeply moved')
    expect(normalizeGloss('fathom (1.83 meters) (old)')).toBe('fathom')
  })

  it('strips leading to, a, the', () => {
    expect(normalizeGloss('to finish')).toBe('finish')
    expect(normalizeGloss('a person')).toBe('person')
    expect(normalizeGloss('the earth')).toBe('earth')
    expect(normalizeGloss('to eat')).toBe('eat')
    expect(normalizeGloss('to bank up')).toBe('bank up')
  })

  it('skips cross-references and labels', () => {
    expect(shouldSkipGloss('variant of 它[ta1]')).toBe(true)
    expect(normalizeGloss('variant of 它[ta1]')).toBeNull()

    expect(shouldSkipGloss('old variant of 汝[ru3]')).toBe(true)
    expect(normalizeGloss('old variant of 汝[ru3]')).toBeNull()

    expect(shouldSkipGloss('popular variant of 嘴[zui3]')).toBe(true)
    expect(normalizeGloss('popular variant of 嘴[zui3]')).toBeNull()

    expect(shouldSkipGloss('see 鰆魚|䲠鱼[chun1 yu2]')).toBe(true)
    expect(normalizeGloss('see 鰆魚|䲠鱼[chun1 yu2]')).toBeNull()

    expect(shouldSkipGloss('see also 冬字頭|冬字头[dong1 zi4 tou2]')).toBe(true)
    expect(normalizeGloss('see also 冬字頭|冬字头[dong1 zi4 tou2]')).toBeNull()

    expect(shouldSkipGloss('surname Zhang')).toBe(true)
    expect(normalizeGloss('surname Zhang')).toBeNull()

    expect(shouldSkipGloss('CL:個|个[ge4]')).toBe(true)
    expect(normalizeGloss('CL:個|个[ge4]')).toBeNull()
  })

  it('does not skip normal words like "see" when derived from "to see"', () => {
    expect(shouldSkipGloss('to see')).toBe(false)
    expect(normalizeGloss('to see')).toBe('see')
  })

  it('does not skip "variant" alone as a meaning', () => {
    expect(shouldSkipGloss('variant')).toBe(false)
    expect(normalizeGloss('variant')).toBe('variant')
  })

  it('returns null for empty or whitespace-only glosses', () => {
    expect(normalizeGloss('')).toBeNull()
    expect(normalizeGloss('   ')).toBeNull()
    expect(normalizeGloss('(completion particle)')).toBeNull()
  })
})

describe('normalizeQuery', () => {
  it('lowercases and trims queries', () => {
    expect(normalizeQuery('  Earth  ')).toBe('earth')
    expect(normalizeQuery('SOIL')).toBe('soil')
  })

  it('strips leading to, a, the from queries', () => {
    expect(normalizeQuery('to eat')).toBe('eat')
    expect(normalizeQuery('a book')).toBe('book')
    expect(normalizeQuery('the earth')).toBe('earth')
  })

  it('preserves multi-word phrases', () => {
    expect(normalizeQuery('bank up')).toBe('bank up')
    expect(normalizeQuery('to bank up')).toBe('bank up')
    expect(normalizeQuery('earth embankment')).toBe('earth embankment')
  })
})

describe('extractGlosses', () => {
  it('splits CC-CEDICT meanings on semicolon and returns raw and normalized pairs', () => {
    const reading = {
      syllable: 'di',
      tone: 4 as const,
      pinyin: 'dì',
      meanings: ['earth; (bound form) soil; ground; place; land'],
      counterparts: [],
    }
    const glosses = extractGlosses(reading)
    expect(glosses).toEqual([
      { raw: 'earth', normalized: 'earth' },
      { raw: '(bound form) soil', normalized: 'soil' },
      { raw: 'ground', normalized: 'ground' },
      { raw: 'place', normalized: 'place' },
      { raw: 'land', normalized: 'land' },
    ])
  })

  it('omits skipped glosses from the extracted list', () => {
    const reading = {
      syllable: 'ta',
      tone: 1 as const,
      pinyin: 'tā',
      meanings: ['variant of 它[ta1]; he; she'],
      counterparts: [],
    }
    const glosses = extractGlosses(reading)
    expect(glosses).toEqual([
      { raw: 'he', normalized: 'he' },
      { raw: 'she', normalized: 'she' },
    ])
  })
})

describe('English Search: Ranking and Tiers', () => {
  const dict = indexDictionary(testDictFile)
  const index = buildEnglishIndex(dict)

  it('ranks Tier 1 matches before Tier 2 matches', () => {
    const results = searchEnglish(index, 'earth', DEFAULT_FILTERS)

    // Tier 1 matches: 地, 土 (exact gloss "earth")
    // Tier 2 matches: 埝 ("earth embankment" starts with "earth")
    const chars = results.map((r) => r.entry.char)
    expect(chars).toContain('地')
    expect(chars).toContain('土')
    expect(chars).toContain('埝')

    const diResult = results.find((r) => r.entry.char === '地')!
    const tuResult = results.find((r) => r.entry.char === '土')!
    const dianResult = results.find((r) => r.entry.char === '埝')!

    expect(diResult.tier).toBe(1)
    expect(diResult.matchedGloss).toBe('earth')

    expect(tuResult.tier).toBe(1)
    expect(tuResult.matchedGloss).toBe('earth')

    expect(dianResult.tier).toBe(2)
    expect(dianResult.matchedGloss).toBe('earth embankment')

    // Tier 1 before Tier 2
    expect(results.indexOf(diResult)).toBeLessThan(results.indexOf(dianResult))
    expect(results.indexOf(tuResult)).toBeLessThan(results.indexOf(dianResult))
  })

  it('ranks a common character (freqRank 20, gloss 2) above a rare character (freqRank 5000, gloss 0) within same tier', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '甲',
          script: 'ST',
          readings: [
            {
              syllable: 'jia',
              tone: 3,
              pinyin: 'jiǎ',
              meanings: ['ground; land; earth'], // "earth" is gloss 2
              counterparts: [],
            },
          ],
          freqRank: 20, // Common character
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
        {
          char: '乙',
          script: 'ST',
          readings: [
            {
              syllable: 'yi',
              tone: 3,
              pinyin: 'yǐ',
              meanings: ['earth; soil'], // "earth" is gloss 0
              counterparts: [],
            },
          ],
          freqRank: 5000, // Rare character
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 1,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)

    expect(results.map((r) => r.entry.char)).toEqual(['甲', '乙'])
  })

  it('uses compareHits (frequency rank) within the same tier and gloss index', () => {
    // Query "dust": 尘 (freqRank 500, S) and 塵 (freqRank 501, T)
    // When searching with ST script filter:
    const results = searchEnglish(index, 'dust', { ...DEFAULT_FILTERS, script: 'ST' })
    const chenIndex = results.findIndex((r) => r.entry.char === '尘')
    const chenTradIndex = results.findIndex((r) => r.entry.char === '塵')

    expect(chenIndex).not.toBe(-1)
    expect(chenTradIndex).not.toBe(-1)
    expect(chenIndex).toBeLessThan(chenTradIndex)
  })

  it('ranks characters without register labels above characters with register labels in the same tier ("eat": 吃 above 用)', () => {
    const results = searchEnglish(index, 'eat', { ...DEFAULT_FILTERS, script: 'ST' })
    const chiIndex = results.findIndex((r) => r.entry.char === '吃')
    const yongIndex = results.findIndex((r) => r.entry.char === '用')

    expect(chiIndex).not.toBe(-1)
    expect(yongIndex).not.toBe(-1)
    // 吃 (freqRank 75, no labels) ranks above 用 (freqRank 23, has 'courteous' label)
    expect(chiIndex).toBeLessThan(yongIndex)
  })

  it('ranks characters without register labels above characters with register labels in the same tier ("earth": 地 and 土 above 舆)', () => {
    const results = searchEnglish(index, 'earth', DEFAULT_FILTERS)
    const diIndex = results.findIndex((r) => r.entry.char === '地')
    const tuIndex = results.findIndex((r) => r.entry.char === '土')
    const yuIndex = results.findIndex((r) => r.entry.char === '舆')

    expect(diIndex).not.toBe(-1)
    expect(tuIndex).not.toBe(-1)
    expect(yuIndex).not.toBe(-1)
    // 地 (freqRank 15) and 土 (freqRank 25) rank above 舆 (freqRank 5, has 'literary' label)
    expect(diIndex).toBeLessThan(yuIndex)
    expect(tuIndex).toBeLessThan(yuIndex)
  })

  it('does not penalize fig label as registered in ranking', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '甲',
          script: 'ST',
          readings: [
            {
              syllable: 'jia',
              tone: 3,
              pinyin: 'jiǎ',
              meanings: ['(fig.) earth'],
              counterparts: [],
            },
          ],
          freqRank: 10,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
        {
          char: '乙',
          script: 'ST',
          readings: [
            {
              syllable: 'yi',
              tone: 3,
              pinyin: 'yǐ',
              meanings: ['earth'],
              counterparts: [],
            },
          ],
          freqRank: 20,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)

    // 甲 has fig label, which does NOT count as registered, so freqRank 10 ranks above freqRank 20
    expect(results.map((r) => r.entry.char)).toEqual(['甲', '乙'])
  })

  it('ranks Tier 3 for whole word anywhere in gloss', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '甲',
          script: 'ST',
          readings: [
            {
              syllable: 'jia',
              tone: 3,
              pinyin: 'jiǎ',
              meanings: ['earth'], // Tier 1
              counterparts: [],
            },
          ],
          freqRank: 100,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
        {
          char: '乙',
          script: 'ST',
          readings: [
            {
              syllable: 'yi',
              tone: 3,
              pinyin: 'yǐ',
              meanings: ['earth embankment'], // Tier 2
              counterparts: [],
            },
          ],
          freqRank: 10,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 1,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
        {
          char: '丙',
          script: 'ST',
          readings: [
            {
              syllable: 'bing',
              tone: 3,
              pinyin: 'bǐng',
              meanings: ['red earth used for pigments'], // Tier 3
              counterparts: [],
            },
          ],
          freqRank: 1,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)

    expect(results.map((r) => r.entry.char)).toEqual(['甲', '乙', '丙'])
    expect(results[0].tier).toBe(1)
    expect(results[1].tier).toBe(2)
    expect(results[2].tier).toBe(3)
    expect(results[2].matchedGloss).toBe('red earth used for pigments')
  })

  it('first matching tier wins when an entry has matches in multiple tiers', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '甲',
          script: 'ST',
          readings: [
            {
              syllable: 'jia',
              tone: 3,
              pinyin: 'jiǎ',
              meanings: ['earth embankment; earth'], // Tier 2 on gloss 0, Tier 1 on gloss 1
              counterparts: [],
            },
          ],
          freqRank: 100,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)

    expect(results).toHaveLength(1)
    expect(results[0].tier).toBe(1)
    expect(results[0].matchedGloss).toBe('earth')
  })

  it('does not match sub-strings that are not at word boundaries', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '甲',
          script: 'ST',
          readings: [
            {
              syllable: 'jia',
              tone: 3,
              pinyin: 'jiǎ',
              meanings: ['earthy smell; unearthed artifact'],
              counterparts: [],
            },
          ],
          freqRank: 100,
          hsk: null,
          hskWriteBand: null,
          radical: null,
          strokeCount: 5,
          hasStrokes: true,
          components: [],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)
    expect(results).toHaveLength(0)
  })
})

describe('English Search: Phrases and Multi-word Queries', () => {
  const dict = indexDictionary(testDictFile)
  const index = buildEnglishIndex(dict)

  it('normalizes "to eat" and matches gloss "to finish" with "to finish" / "finish"', () => {
    const results = searchEnglish(index, 'finish', DEFAULT_FILTERS)
    expect(results.some((r) => r.entry.char === '了')).toBe(true)

    const resultsWithTo = searchEnglish(index, 'to finish', DEFAULT_FILTERS)
    expect(resultsWithTo.some((r) => r.entry.char === '了')).toBe(true)
  })

  it('matches multi-word phrases exactly or as whole words', () => {
    const results = searchEnglish(index, 'earth embankment', DEFAULT_FILTERS)
    expect(results).toHaveLength(1)
    expect(results[0].entry.char).toBe('埝')
    expect(results[0].tier).toBe(1)
    expect(results[0].matchedGloss).toBe('earth embankment')
  })
})

describe('English Search: Filters', () => {
  const dict = indexDictionary(testDictFile)
  const index = buildEnglishIndex(dict)

  it('filters by script', () => {
    // 尘 is S, 塵 is T
    const resultsS = searchEnglish(index, 'dust', { ...DEFAULT_FILTERS, script: 'S' })
    expect(resultsS.some((r) => r.entry.char === '尘')).toBe(true)
    expect(resultsS.some((r) => r.entry.char === '塵')).toBe(false)

    const resultsT = searchEnglish(index, 'dust', { ...DEFAULT_FILTERS, script: 'T' })
    expect(resultsT.some((r) => r.entry.char === '尘')).toBe(false)
    expect(resultsT.some((r) => r.entry.char === '塵')).toBe(true)

    const resultsST = searchEnglish(index, 'dust', { ...DEFAULT_FILTERS, script: 'ST' })
    expect(resultsST.some((r) => r.entry.char === '尘')).toBe(true)
    expect(resultsST.some((r) => r.entry.char === '塵')).toBe(true)
  })

  it('filters by HSK level', () => {
    // 地 is HSK 1, 埝 has hsk: null
    const resultsAll = searchEnglish(index, 'earth', {
      ...DEFAULT_FILTERS,
      hskFilter: false,
    })
    expect(resultsAll.some((r) => r.entry.char === '地')).toBe(true)
    expect(resultsAll.some((r) => r.entry.char === '埝')).toBe(true)

    const resultsHsk1 = searchEnglish(index, 'earth', {
      ...DEFAULT_FILTERS,
      hskFilter: true,
      hskLevel: 1,
    })
    expect(resultsHsk1.some((r) => r.entry.char === '地')).toBe(true)
    expect(resultsHsk1.some((r) => r.entry.char === '埝')).toBe(false)
  })

  it('filters by handwriting list', () => {
    // 睨 has HSK 7, hskWriteBand 3, meaning 'to look down on'
    const resultsNoWrite = searchEnglish(index, 'look down on', {
      ...DEFAULT_FILTERS,
      script: 'T',
      hskFilter: true,
      hskLevel: 7,
      handwritingOnly: false,
    })
    expect(resultsNoWrite.some((r) => r.entry.char === '睨')).toBe(true)

    // bandForLevel(3) is 1, so band 3 is filtered out
    const resultsWriteBand1 = searchEnglish(index, 'look down on', {
      ...DEFAULT_FILTERS,
      script: 'T',
      hskFilter: true,
      hskLevel: 3,
      handwritingOnly: true,
    })
    expect(resultsWriteBand1.some((r) => r.entry.char === '睨')).toBe(false)
  })
})

describe('English Search: Edge Cases', () => {
  const dict = indexDictionary(testDictFile)
  const index = buildEnglishIndex(dict)

  it('returns empty array for empty or whitespace query', () => {
    expect(searchEnglish(index, '', DEFAULT_FILTERS)).toEqual([])
    expect(searchEnglish(index, '   ', DEFAULT_FILTERS)).toEqual([])
    expect(searchEnglish(index, 'to ', DEFAULT_FILTERS)).toEqual([])
  })

  it('returns empty array for non-matching query', () => {
    expect(searchEnglish(index, 'nonexistentwordxyz', DEFAULT_FILTERS)).toEqual([])
  })
})

describe('English Search: Original Raw Gloss Display', () => {
  it('displays the raw gloss with original case and labels intact for 舆', () => {
    const customFile: DictionaryFile = {
      version: 1,
      built: '2024-10-02T00:00:00Z',
      chars: [
        {
          char: '舆',
          script: 'S',
          readings: [
            {
              syllable: 'yu',
              tone: 2,
              pinyin: 'yú',
              meanings: [
                '(literary) chassis of a carriage (contrasted with the canopy 堪[kan1])',
                '(literary) (fig.) the earth (while the carriage canopy is a metaphor for heaven); land; territory',
                '(literary) carriage',
              ],
              counterparts: ['輿'],
            },
          ],
          freqRank: 2341,
          hsk: 7,
          hskWriteBand: null,
          radical: '车',
          strokeCount: 14,
          hasStrokes: true,
          components: ['舁', '车'],
          hasUnknownComponent: false,
          etymology: null,
        },
      ],
    }

    const customDict = indexDictionary(customFile)
    const customIndex = buildEnglishIndex(customDict)
    const results = searchEnglish(customIndex, 'earth', DEFAULT_FILTERS)

    expect(results).toHaveLength(1)
    expect(results[0].entry.char).toBe('舆')
    expect(results[0].matchedGloss).toBe(
      '(literary) (fig.) the earth (while the carriage canopy is a metaphor for heaven)',
    )
  })
})

describe('comparePostings', () => {
  const commonEntry = {
    char: '吃',
    script: 'S' as const,
    readings: [
      {
        syllable: 'chi',
        tone: 1 as const,
        pinyin: 'chī',
        meanings: ['to eat; to consume'],
        counterparts: [],
      },
    ],
    freqRank: 75,
    hsk: 1 as const,
    hskWriteBand: 1 as const,
    radical: '口',
    strokeCount: 6,
    hasStrokes: true,
    components: [],
    hasUnknownComponent: false,
    etymology: null,
  }

  const courteousEntry = {
    char: '用',
    script: 'ST' as const,
    readings: [
      {
        syllable: 'yong',
        tone: 4 as const,
        pinyin: 'yòng',
        meanings: ['(courteous) to eat; to drink'],
        counterparts: [],
      },
    ],
    freqRank: 23, // Better frequency rank than 吃
    hsk: 1 as const,
    hskWriteBand: 1 as const,
    radical: '用',
    strokeCount: 5,
    hasStrokes: true,
    components: [],
    hasUnknownComponent: false,
    etymology: null,
  }

  it('orders by tier ascending first', () => {
    const postTier1: Posting = {
      entry: courteousEntry,
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }
    const postTier2: Posting = {
      entry: commonEntry,
      readingIndex: 0,
      glossIndex: 0,
      tier: 2,
    }

    expect(comparePostings(postTier1, postTier2)).toBeLessThan(0)
    expect(comparePostings(postTier2, postTier1)).toBeGreaterThan(0)
  })

  it('orders unregistered before registered when in the same tier', () => {
    const postUnregistered: Posting = {
      entry: commonEntry,
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }
    const postRegistered: Posting = {
      entry: courteousEntry,
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }

    // commonEntry (吃, freqRank 75, unregistered) comes before courteousEntry (用, freqRank 23, registered)
    expect(comparePostings(postUnregistered, postRegistered)).toBeLessThan(0)
    expect(comparePostings(postRegistered, postUnregistered)).toBeGreaterThan(0)
  })

  it('orders by compareHits when registered status is equal', () => {
    const postA: Posting = {
      entry: commonEntry, // freqRank 75
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }
    const otherUnregistered = {
      ...commonEntry,
      char: '喝',
      freqRank: 100,
    }
    const postB: Posting = {
      entry: otherUnregistered, // freqRank 100
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }

    expect(comparePostings(postA, postB)).toBeLessThan(0)
    expect(comparePostings(postB, postA)).toBeGreaterThan(0)
  })

  it('uses glossIndex as tiebreaker when hits are identical', () => {
    const post0: Posting = {
      entry: commonEntry,
      readingIndex: 0,
      glossIndex: 0,
      tier: 1,
    }
    const post1: Posting = {
      entry: commonEntry,
      readingIndex: 0,
      glossIndex: 1,
      tier: 1,
    }

    expect(comparePostings(post0, post1)).toBeLessThan(0)
    expect(comparePostings(post1, post0)).toBeGreaterThan(0)
  })
})
