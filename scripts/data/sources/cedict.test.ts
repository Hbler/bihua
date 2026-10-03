import { describe, expect, it } from 'vitest'

import { parseCedictWords } from './cedict.ts'

describe('parseCedictWords', () => {
  const WORD_CEDICT = `# comment line\r
地球 地球 [di4 qiu2] /the Earth/planet Earth/CL:個|个[ge4]/\r
綠色 绿色 [lv4 se4] /green/\r
中國 中国 [Zhong1 guo2] /China/\r
人 人 [ren2] /person/\r
AA制 AA制 [A A zhi4] /to go Dutch/\r
卡拉OK 卡拉OK [ka3 la1 O K] /karaoke/\r
爸爸 爸爸 [ba1 ba5 , ba4 ba5] /father/dad/\r
某某 某某 [mou3 · mou3] /so-and-so/\r
`

  it('keeps multi-character Han words and parses syllables and tones', () => {
    const entries = parseCedictWords(WORD_CEDICT)
    expect(entries).toHaveLength(3)

    const diqiu = entries.find((e) => e.simp === '地球')!
    expect(diqiu).toEqual({
      trad: '地球',
      simp: '地球',
      syllables: ['di', 'qiu'],
      tones: [4, 2],
      isProperNoun: false,
      glosses: ['the Earth', 'planet Earth'],
    })

    const lvse = entries.find((e) => e.simp === '绿色')!
    expect(lvse).toEqual({
      trad: '綠色',
      simp: '绿色',
      syllables: ['lv', 'se'],
      tones: [4, 4],
      isProperNoun: false,
      glosses: ['green'],
    })
  })

  it('flags proper nouns with any capitalized syllable', () => {
    const entries = parseCedictWords(WORD_CEDICT)
    const china = entries.find((e) => e.simp === '中国')!
    expect(china.isProperNoun).toBe(true)
    expect(china.syllables).toEqual(['zhong', 'guo'])
    expect(china.tones).toEqual([1, 2])
  })

  it('skips single chars, mixed non-Han words, and entries with comma or dot in pinyin', () => {
    const entries = parseCedictWords(WORD_CEDICT)
    expect(entries.some((e) => e.simp === '人')).toBe(false)
    expect(entries.some((e) => e.simp === 'AA制')).toBe(false)
    expect(entries.some((e) => e.simp === '卡拉OK')).toBe(false)
    expect(entries.some((e) => e.simp === '爸爸')).toBe(false)
    expect(entries.some((e) => e.simp === '某某')).toBe(false)
  })
})
