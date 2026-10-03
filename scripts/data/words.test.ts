import { describe, expect, it } from 'vitest'

import { decodeWords } from '../../src/lib/data/words.ts'

import { parseCedictWords } from './sources/cedict.ts'
import { mergeWords, shouldSkipGloss, type WordMergeInput } from './words.ts'

const CEDICT_SAMPLE = `# CC-CEDICT sample
地球 地球 [di4 qiu2] /the Earth/planet Earth/CL:個|个[ge4]/
說話 说话 [shuo1 hua4] /to speak/to say/to talk/
中國 中国 [Zhong1 guo2] /China/
古城 古城 [gu3 cheng2] /ancient city/
奧斯汀 奥斯汀 [Ao4 si1 ting1] /Austin (proper noun not in subtlex)/
西安 西安 [Xi1 an1] /see 西安市[Xi1 an1 Shi4]/see 西安區|西安区[Xi1 an1 Qu1]/
西安市 西安市 [Xi1 an1 Shi4] /Xi'an, sub-provincial city and capital of Shaanxi Province/
綠色 绿色 [lv4 se4] /green/
東西 东西 [dong1 xi5] /things/stuff/see also 東|东[dong1]/
無義 无义 [wu2 yi4] /variant of 無意義|无意义[wu2 yi4 yi4]/
`

function buildTestWords(overrides: Partial<WordMergeInput> = {}) {
  const cedict = parseCedictWords(CEDICT_SAMPLE)
  const subtlex = new Map<string, number>([
    ['说话', 10],
    ['地球', 20],
    ['中国', 30],
    ['绿色', 40],
    ['西安', 50],
    ['东西', 60],
  ])
  const junda = new Map<string, number>([
    ['古', 100],
    ['城', 200],
  ])

  return mergeWords({
    cedict,
    subtlex,
    junda,
    ...overrides,
  })
}

describe('shouldSkipGloss', () => {
  it('detects variant, see, surname, and CL glosses', () => {
    expect(shouldSkipGloss('variant of 它[ta1]')).toBe(true)
    expect(shouldSkipGloss('old variant of 汝[ru3]')).toBe(true)
    expect(shouldSkipGloss('see 西安市[Xi1 an1 Shi4]')).toBe(true)
    expect(shouldSkipGloss('surname Zhang')).toBe(true)
    expect(shouldSkipGloss('CL:個|个[ge4]')).toBe(true)

    expect(shouldSkipGloss('the Earth')).toBe(false)
    expect(shouldSkipGloss('to see')).toBe(false)
  })
})

describe('mergeWords', () => {
  it('emits one row per Simplified form with counterparts and no separate T rows', () => {
    const rows = buildTestWords()
    const wordMap = new Map(rows.map((r) => [r[0], r]))

    expect(wordMap.has('说话')).toBe(true)
    expect(wordMap.has('說話')).toBe(false)
    expect(wordMap.has('中国')).toBe(true)
    expect(wordMap.has('中國')).toBe(false)

    const shuohua = wordMap.get('说话')!
    expect(shuohua[1][0][0]).toBe('shuo1 hua4')
    expect(shuohua[1][0][1]).toEqual(['to speak', 'to say', 'to talk'])
    expect(shuohua[1][0][2]).toEqual(['說話'])

    const diqiu = wordMap.get('地球')!
    expect(diqiu[1][0][0]).toBe('di4 qiu2')
    expect(diqiu[1][0][1]).toEqual(['the Earth', 'planet Earth'])
    expect(diqiu[1][0][2]).toBeUndefined()
  })

  it('decodes correctly via decodeWords to WordEntry records', () => {
    const rows = buildTestWords()
    const decoded = decodeWords({ version: 1, built: '2026-10-03', words: rows })
    const map = new Map(decoded.map((w) => [w.word, w]))

    const diqiu = map.get('地球')!
    expect(diqiu.script).toBe('ST')
    expect(diqiu.traditional).toEqual([])
    expect(diqiu.readings[0].key).toBe('diqiu')
    expect(diqiu.readings[0].pinyin).toBe('dì qiú')
    expect(diqiu.readings[0].counterparts).toEqual([])

    const shuohua = map.get('说话')!
    expect(shuohua.script).toBe('S')
    expect(shuohua.traditional).toEqual(['說話'])
    expect(shuohua.readings[0].key).toBe('shuohua')
    expect(shuohua.readings[0].pinyin).toBe('shuō huà')
    expect(shuohua.readings[0].counterparts).toEqual(['說話'])

    const lvse = map.get('绿色')!
    expect(lvse.readings[0].key).toBe('lvse')
    expect(lvse.readings[0].pinyin).toBe('lǜ sè')
    expect(lvse.readings[0].syllables).toEqual(['lv', 'se'])
    expect(lvse.readings[0].tones).toEqual([4, 4])
  })

  it('keeps proper nouns in SUBTLEX and drops proper-noun-only words not in SUBTLEX', () => {
    const rows = buildTestWords()
    const map = new Map(rows.map((r) => [r[0], r]))

    expect(map.has('中国')).toBe(true)
    expect(map.has('奥斯汀')).toBe(false)
  })

  it('skips cross-references when common glosses exist', () => {
    const rows = buildTestWords()
    const map = new Map(rows.map((r) => [r[0], r]))

    const dongxi = map.get('东西')!
    expect(dongxi[1][0][1]).toEqual(['things', 'stuff'])
  })

  it('puts proper-noun glosses after common ones', () => {
    const cedict = parseCedictWords(`
法 法 [Fa3] /France/French/
法 法 [fa3] /law/method/
法国 法国 [Fa3 guo2] /France/French/
`)
    const subtlex = new Map<string, number>([['法国', 100]])
    const words = mergeWords({ cedict, subtlex, junda: new Map() })
    const france = words.find((w) => w[0] === '法国')!
    expect(france[1][0][1]).toEqual(['France', 'French'])
  })

  it('resolves cross-references to real proper-noun glosses for words in SUBTLEX (e.g. 西安)', () => {
    const rows = buildTestWords()
    const map = new Map(rows.map((r) => [r[0], r]))

    const xian = map.get('西安')!
    expect(xian).toBeDefined()
    expect(xian[1][0][1][0]).toMatch(/^Xi'an/)
    expect(xian[1][0][1].some((m) => m.startsWith('see '))).toBe(false)
  })

  it('drops words with only skipped glosses if not in SUBTLEX', () => {
    const rows = buildTestWords()
    const map = new Map(rows.map((r) => [r[0], r]))

    expect(map.has('无义')).toBe(false)
  })

  it('sorts words by freqRank ascending (0 last), then average Jun Da rank, then code points', () => {
    const rows = buildTestWords()
    const ranked = rows.filter((w) => w[2] > 0)
    expect(ranked[0][2]).toBeLessThanOrEqual(ranked[1][2])

    // Words with rank 0 come after ranked words
    const unranked = rows.filter((w) => w[2] === 0)
    expect(unranked.length).toBeGreaterThan(0)
    expect(rows.indexOf(unranked[0])).toBeGreaterThan(rows.indexOf(ranked[ranked.length - 1]))
  })
})
