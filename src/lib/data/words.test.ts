import { describe, expect, it } from 'vitest'

import type { WordsFile } from './types.js'
import { decodeWords } from './words.js'

describe('decodeWords', () => {
  it('decodes a word with identical traditional form (ST script)', () => {
    const file: WordsFile = {
      version: 1,
      built: '2026-10-03',
      words: [['地球', [['di4 qiu2', ['the Earth', 'planet Earth']]], 20]],
    }

    const entries = decodeWords(file)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      word: '地球',
      script: 'ST',
      traditional: [],
      freqRank: 20,
      readings: [
        {
          key: 'diqiu',
          syllables: ['di', 'qiu'],
          tones: [4, 2],
          pinyin: 'dì qiú',
          meanings: ['the Earth', 'planet Earth'],
          counterparts: [],
        },
      ],
    })
  })

  it('decodes a word with traditional counterparts (S script)', () => {
    const file: WordsFile = {
      version: 1,
      built: '2026-10-03',
      words: [['说话', [['shuo1 hua4', ['to speak', 'to say', 'to talk'], ['說話']]], 10]],
    }

    const entries = decodeWords(file)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      word: '说话',
      script: 'S',
      traditional: ['說話'],
      freqRank: 10,
      readings: [
        {
          key: 'shuohua',
          syllables: ['shuo', 'hua'],
          tones: [1, 4],
          pinyin: 'shuō huà',
          meanings: ['to speak', 'to say', 'to talk'],
          counterparts: ['說話'],
        },
      ],
    })
  })

  it('maps unranked (0) words to null freqRank', () => {
    const file: WordsFile = {
      version: 1,
      built: '2026-10-03',
      words: [['古城', [['gu3 cheng2', ['ancient city']]], 0]],
    }

    const entries = decodeWords(file)
    expect(entries[0].freqRank).toBeNull()
  })

  it('handles neutral tones and umlaut / v vowels', () => {
    const file: WordsFile = {
      version: 1,
      built: '2026-10-03',
      words: [
        ['头发', [['tou2 fa5', ['hair (on the head)'], ['頭髮']]], 790],
        ['绿色', [['lv4 se4', ['green'], ['綠色']]], 500],
      ],
    }

    const entries = decodeWords(file)
    const toufa = entries[0]
    expect(toufa.readings[0].syllables).toEqual(['tou', 'fa'])
    expect(toufa.readings[0].tones).toEqual([2, 5])
    expect(toufa.readings[0].pinyin).toBe('tóu fa')
    expect(toufa.readings[0].key).toBe('toufa')

    const lvse = entries[1]
    expect(lvse.readings[0].syllables).toEqual(['lv', 'se'])
    expect(lvse.readings[0].tones).toEqual([4, 4])
    expect(lvse.readings[0].pinyin).toBe('lǜ sè')
    expect(lvse.readings[0].key).toBe('lvse')
  })

  it('unions counterparts across multiple readings', () => {
    const file: WordsFile = {
      version: 1,
      built: '2026-10-03',
      words: [
        [
          '示例',
          [
            ['shi4 li4', ['reading 1'], ['示例一']],
            ['shi4 lie4', ['reading 2'], ['示例一', '示例二']],
          ],
          100,
        ],
      ],
    }

    const entries = decodeWords(file)
    expect(entries[0].script).toBe('S')
    expect(entries[0].traditional).toEqual(['示例一', '示例二'])
    expect(entries[0].readings[0].counterparts).toEqual(['示例一'])
    expect(entries[0].readings[1].counterparts).toEqual(['示例一', '示例二'])
  })
})
