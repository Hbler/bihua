import { describe, expect, it } from 'vitest'

import type { CharEntry, Tone } from '../data/types.js'
import {
  pickVoice,
  planReading,
  planWord,
  syllableKey,
  type SyllableKey,
  type VoiceLike,
} from './plan.js'

function makeCharEntry(
  char: string,
  readings: { syllable: string; tone: Tone; pinyin?: string }[],
): CharEntry {
  return {
    char,
    script: 'S',
    readings: readings.map((r) => ({
      syllable: r.syllable,
      tone: r.tone,
      pinyin: r.pinyin ?? r.syllable,
      meanings: ['meaning'],
      counterparts: [],
    })),
    freqRank: 1,
    hsk: 1,
    hskWriteBand: null,
    radical: null,
    strokeCount: 1,
    hasStrokes: true,
    components: [],
    hasUnknownComponent: false,
    etymology: null,
  }
}

describe('syllableKey', () => {
  it('combines syllable and tone, normalising ü to v', () => {
    expect(syllableKey('shuo', 1)).toBe('shuo1')
    expect(syllableKey('lv', 4)).toBe('lv4')
    expect(syllableKey('lü', 4)).toBe('lv4')
    expect(syllableKey('lve', 4)).toBe('lve4')
    expect(syllableKey('lüe', 4)).toBe('lve4')
    expect(syllableKey('de', 5)).toBe('de5')
  })
})

describe('pickVoice', () => {
  it('returns null for an empty list', () => {
    expect(pickVoice([])).toBeNull()
  })

  it('returns null when only online zh-CN voices are present', () => {
    const voices: VoiceLike[] = [
      { name: 'Tingting Online', lang: 'zh-CN', localService: false },
      { name: 'Xiaoxiao Online', lang: 'zh-CN', localService: false },
    ]
    expect(pickVoice(voices)).toBeNull()
  })

  it('returns null for a local zh-HK voice alone', () => {
    const voices: VoiceLike[] = [{ name: 'Sinji', lang: 'zh-HK', localService: true }]
    expect(pickVoice(voices)).toBeNull()
  })

  it('rejects other Cantonese tags (zh-MO, yue, zh-yue)', () => {
    const voices: VoiceLike[] = [
      { name: 'Macau Voice', lang: 'zh-MO', localService: true },
      { name: 'Yue Voice', lang: 'yue', localService: true },
      { name: 'Zh-Yue Voice', lang: 'zh-yue', localService: true },
    ]
    expect(pickVoice(voices)).toBeNull()
  })

  it('prefers local zh-CN over local zh_TW', () => {
    const tw: VoiceLike = { name: 'Meijia', lang: 'zh_TW', localService: true }
    const cn: VoiceLike = { name: 'Tingting', lang: 'zh-CN', localService: true }
    expect(pickVoice([tw, cn])).toBe(cn)
  })

  it('picks local zh-TW when it is alone', () => {
    const tw: VoiceLike = { name: 'Meijia', lang: 'zh-TW', localService: true }
    expect(pickVoice([tw])).toBe(tw)
  })

  it('picks local cmn-Hans-CN', () => {
    const cmn: VoiceLike = {
      name: 'Google 普通话',
      lang: 'cmn-Hans-CN',
      localService: true,
    }
    expect(pickVoice([cmn])).toBe(cmn)
  })

  it('returns null for en-US local plus zh-CN online', () => {
    const voices: VoiceLike[] = [
      { name: 'Samantha', lang: 'en-US', localService: true },
      { name: 'Tingting', lang: 'zh-CN', localService: false },
    ]
    expect(pickVoice(voices)).toBeNull()
  })

  it('picks rank 1 voices (cmn-cn, cmn) and rank 3 voices (zh, zh-sg) by preference', () => {
    const sg: VoiceLike = { name: 'Singapore', lang: 'zh-SG', localService: true }
    const tw: VoiceLike = { name: 'Taiwan', lang: 'zh-TW', localService: true }
    const cmn: VoiceLike = { name: 'Mandarin', lang: 'cmn', localService: true }

    expect(pickVoice([sg])).toBe(sg)
    expect(pickVoice([sg, tw])).toBe(tw)
    expect(pickVoice([sg, tw, cmn])).toBe(cmn)
  })

  it('preserves input order within the same rank', () => {
    const firstCn: VoiceLike = { name: 'Voice 1', lang: 'zh-CN', localService: true }
    const secondCn: VoiceLike = { name: 'Voice 2', lang: 'zh-CN', localService: true }
    expect(pickVoice([firstCn, secondCn])).toBe(firstCn)

    const firstTw: VoiceLike = { name: 'TW 1', lang: 'zh-TW', localService: true }
    const secondTw: VoiceLike = { name: 'TW 2', lang: 'cmn-hant-tw', localService: true }
    expect(pickVoice([firstTw, secondTw])).toBe(firstTw)
  })
})

describe('planReading', () => {
  const clips = new Set<SyllableKey>(['xing2', 'hang2', 'di2', 'ba1', 'lv4'])

  const xingEntry = makeCharEntry('行', [
    { syllable: 'xing', tone: 2, pinyin: 'xíng' },
    { syllable: 'hang', tone: 2, pinyin: 'háng' },
  ])
  const deEntry = makeCharEntry('的', [
    { syllable: 'de', tone: 5, pinyin: 'de' },
    { syllable: 'di', tone: 2, pinyin: 'dí' },
  ])
  const baEntry = makeCharEntry('吧', [
    { syllable: 'ba', tone: 1, pinyin: 'bā' },
    { syllable: 'ba', tone: 5, pinyin: 'ba' },
  ])
  const yoEntry = makeCharEntry('哟', [{ syllable: 'yo', tone: 1, pinyin: 'yō' }])
  const lvEntry = makeCharEntry('绿', [{ syllable: 'lv', tone: 4, pinyin: 'lǜ' }])

  it('plans reading on 行: index 0 with voice → voice, without → clips; index 1 with voice → clips', () => {
    expect(planReading(xingEntry, 0, true, clips)).toEqual({
      kind: 'voice',
      text: '行',
    })
    expect(planReading(xingEntry, 0, false, clips)).toEqual({
      kind: 'clips',
      keys: ['xing2'],
    })
    expect(planReading(xingEntry, 1, true, clips)).toEqual({
      kind: 'clips',
      keys: ['hang2'],
    })
    expect(planReading(xingEntry, 1, false, clips)).toEqual({
      kind: 'clips',
      keys: ['hang2'],
    })
  })

  it('plans 的 main reading de5 with voice → voice, without → null', () => {
    expect(planReading(deEntry, 0, true, clips)).toEqual({
      kind: 'voice',
      text: '的',
    })
    expect(planReading(deEntry, 0, false, clips)).toBeNull()
  })

  it('plans 吧 secondary ba5 → null even with a voice', () => {
    expect(planReading(baEntry, 1, true, clips)).toBeNull()
    expect(planReading(baEntry, 1, false, clips)).toBeNull()
  })

  it('returns null for a reading whose clip is missing (yo1) without a voice', () => {
    expect(planReading(yoEntry, 0, false, clips)).toBeNull()
  })

  it('plans 绿 lv4 → ["lv4"] without a voice', () => {
    expect(planReading(lvEntry, 0, false, clips)).toEqual({
      kind: 'clips',
      keys: ['lv4'],
    })
  })

  it('returns null for invalid readingIndex', () => {
    expect(planReading(xingEntry, -1, true, clips)).toBeNull()
    expect(planReading(xingEntry, 5, true, clips)).toBeNull()
  })
})

describe('planWord', () => {
  const clips = new Set<SyllableKey>(['ni2', 'hao3', 'dong1'])

  it('plans 你好 with voice → voice "你好"', () => {
    expect(planWord('你好', ['ni', 'hao'], [2, 3], true, clips)).toEqual({
      kind: 'voice',
      text: '你好',
    })
  })

  it('plans 你好 without voice with spoken tones [2, 3] → ["ni2", "hao3"]', () => {
    expect(planWord('你好', ['ni', 'hao'], [2, 3], false, clips)).toEqual({
      kind: 'clips',
      keys: ['ni2', 'hao3'],
    })
  })

  it('plans 东西 ["dong", "xi"] [1, 5] without voice → null; with voice → voice', () => {
    expect(planWord('东西', ['dong', 'xi'], [1, 5], false, clips)).toBeNull()
    expect(planWord('东西', ['dong', 'xi'], [1, 5], true, clips)).toEqual({
      kind: 'voice',
      text: '东西',
    })
  })

  it('returns null when lengths are mismatched', () => {
    expect(planWord('你好', ['ni'], [2, 3], false, clips)).toBeNull()
    expect(planWord('你好', ['ni', 'hao'], [2], false, clips)).toBeNull()
    expect(planWord('你好', ['ni'], [2], false, clips)).toBeNull()
    expect(planWord('你好', ['ni'], [2, 3], true, clips)).toBeNull()
  })

  it('returns null for empty word or missing clips', () => {
    expect(planWord('', [], [], false, clips)).toBeNull()
    expect(planWord('世界', ['shi', 'jie'], [4, 4], false, clips)).toBeNull()
  })
})
