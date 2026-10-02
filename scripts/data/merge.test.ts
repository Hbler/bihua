import { describe, expect, it } from 'vitest'

import type { CharEntry } from '../../src/lib/data/types.ts'

import { mergeSources, type MergeInput } from './merge.ts'
import { parseCedict } from './sources/cedict.ts'
import { parseJunDa } from './sources/frequency.ts'
import { parseCharList } from './sources/hsk.ts'
import { parseMmah } from './sources/mmah.ts'

const CEDICT = `# comment line
發 发 [fa1] /to send out/to issue/
髮 发 [fa4] /hair/
說 说 [shuo1] /to speak/to say/
說 说 [shui4] /to persuade/
了 了 [le5] /(completed action marker)/
了 了 [liao3] /to finish/to understand/
瞭 了 [liao3] /(of eyes) bright/
人 人 [ren2] /person/CL:個|个[ge4]/
張 张 [Zhang1] /surname Zhang/
張 张 [zhang1] /to open up/classifier for flat objects/
后 后 [hou4] /empress/
後 后 [hou4] /back/behind/
倣 仿 [fang3] /variant of 仿[fang3]/
仿 仿 [fang3] /to imitate/
A A [A] /(slang) to steal/
你好 你好 [ni3 hao3] /hello/
`

const JUNDA = `/* header */
1\t了\t100\t1.0\tle/liao3\tparticle
2\t人\t90\t2.0\tren2\tperson
3\t说\t80\t3.0\tshui4/shuo1\tspeak
4\t后\t70\t4.0\thou4\tafter
9\t發\t5\t9.0\tfa1\tbogus traditional rank
`

const MMAH = [
  { character: '了', radical: '亅', pinyin: ['le', 'liǎo'] },
  { character: '说', radical: '讠', pinyin: ['shuō'] },
  { character: '說', radical: '言', pinyin: ['shuō'] },
]
  .map((entry) => JSON.stringify(entry))
  .join('\n')

function build(overrides: Partial<MergeInput> = {}): Map<string, CharEntry> {
  const entries = mergeSources({
    cedict: parseCedict(CEDICT),
    frequency: parseJunDa(JUNDA),
    hskLevels: [parseCharList('人\n了\n'), parseCharList('说\n')],
    hskBands: [parseCharList('人\n')],
    mmah: parseMmah(MMAH),
    strokeCounts: new Map([
      ['说', 9],
      ['說', 14],
      ['睨', 13],
    ]),
    ...overrides,
  })
  return new Map(entries.map((entry) => [entry.char, entry]))
}

describe('parseCedict', () => {
  it('keeps only single Han character entries and drops CL: glosses', () => {
    const entries = parseCedict(CEDICT)
    expect(entries.some((e) => e.simp === 'A' || e.simp === '你好')).toBe(false)
    expect(entries.find((e) => e.simp === '人')?.glosses).toEqual(['person'])
  })

  it('flags capitalised pinyin as proper nouns and lowercases the syllable', () => {
    const zhang = parseCedict(CEDICT).find((e) => e.trad === '張' && e.isProperNoun)
    expect(zhang).toMatchObject({ syllable: 'zhang', tone: 1 })
  })
})

describe('parseJunDa', () => {
  it('reads the rank of each character', () => {
    expect(parseJunDa(JUNDA).get('了')).toBe(1)
    expect(parseJunDa(JUNDA).get('说')).toBe(3)
  })
})

describe('parseMmah', () => {
  it('converts marked readings to syllable + tone keys, neutral tone as 5', () => {
    expect(parseMmah(MMAH).get('了')).toEqual({ radical: '亅', readings: ['le5', 'liao3'] })
  })
})

describe('mergeSources', () => {
  it('pairs one-to-many counterparts per reading (发 → 發 / 髮)', () => {
    const fa = build().get('发')!
    expect(fa.script).toBe('S')
    expect(fa.readings.map((r) => [r.pinyin, r.counterparts])).toEqual([
      ['fā', ['發']],
      ['fà', ['髮']],
    ])
  })

  it('marks characters identical in both scripts as ST with no counterparts', () => {
    const ren = build().get('人')!
    expect(ren.script).toBe('ST')
    expect(ren.readings[0].counterparts).toEqual([])
  })

  it('treats a character that is its own Traditional form and also a Simplified form as ST (后)', () => {
    const hou = build().get('后')!
    expect(hou.script).toBe('ST')
    expect(hou.readings[0].counterparts).toEqual(['後'])
    expect(hou.readings[0].meanings).toEqual(['empress', 'back', 'behind'])
  })

  it('puts the Make Me a Hanzi main reading first', () => {
    expect(
      build()
        .get('了')!
        .readings.map((r) => r.pinyin),
    ).toEqual(['le', 'liǎo'])
    expect(
      build()
        .get('说')!
        .readings.map((r) => r.pinyin),
    ).toEqual(['shuō', 'shuì'])
  })

  it('merges proper-noun and common glosses of a reading, surnames last', () => {
    const zhang = build().get('张')!
    expect(zhang.readings).toHaveLength(1)
    expect(zhang.readings[0].meanings).toEqual([
      'to open up',
      'classifier for flat objects',
      'surname Zhang',
    ])
  })

  it('orders readings without a main reading by number of ordinary glosses', () => {
    expect(
      build({ mmah: new Map() })
        .get('说')!
        .readings.map((r) => r.pinyin),
    ).toEqual(['shuō', 'shuì'])
  })

  it('keeps only counterparts that have stroke data when some do', () => {
    const shuo = build({
      cedict: parseCedict('說 说 [shuo1] /to speak/\n説 说 [shuo1] /Japanese variant of 說|说/\n'),
    }).get('说')!
    expect(shuo.readings[0].counterparts).toEqual(['說'])
  })

  it('puts variant glosses after ordinary ones', () => {
    expect(build().get('倣')!.readings[0].meanings).toEqual(['variant of 仿[fang3]'])
    expect(build().get('仿')!.readings[0].meanings[0]).toBe('to imitate')
  })

  it('attaches frequency, HSK, handwriting band, radical and strokes', () => {
    expect(build().get('人')).toMatchObject({ freqRank: 2, hsk: 1, hskWriteBand: 1 })
    expect(build().get('说')).toMatchObject({
      hsk: 2,
      hskWriteBand: null,
      radical: '讠',
      strokeCount: 9,
      hasStrokes: true,
    })
    expect(build().get('了')).toMatchObject({ hasStrokes: false, strokeCount: null })
  })

  it('makes Traditional-only characters inherit rank and HSK from counterparts', () => {
    expect(build().get('說')).toMatchObject({ script: 'T', freqRank: 3, hsk: 2 })
    // Jun Da is a Simplified corpus: a rank found for a Traditional form is replaced.
    expect(build().get('發')).toMatchObject({ script: 'T', freqRank: null })
  })

  it('includes characters that only have stroke data', () => {
    expect(build().get('睨')).toMatchObject({ readings: [], hasStrokes: true, script: 'ST' })
  })

  it('returns entries sorted by code point', () => {
    const chars = [...build().keys()]
    expect(chars).toEqual([...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!))
  })
})
