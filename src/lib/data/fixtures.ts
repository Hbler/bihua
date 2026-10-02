import type { DictionaryFile } from './types.js'

/**
 * A minimal but comprehensive test fixture covering:
 * - Polyphones (了 with le5 and liao3)
 * - Tone pairs (好 with hao3 and hao4)
 * - Script variants (说 S, 說 T, 人 ST)
 * - Character without freqRank
 * - HSK levels including 7 with hskWriteBand
 * - A reading with empty meanings and no strokes (filtered in search)
 */
export const testDictFile: DictionaryFile = {
  version: 1,
  built: '2024-10-02T00:00:00Z',
  chars: [
    // Polyphone: 了 with two readings
    {
      char: '了',
      script: 'S',
      readings: [
        {
          syllable: 'le',
          tone: 5,
          pinyin: 'le',
          meanings: ['(completion particle)'],
          counterparts: [],
        },
        {
          syllable: 'liao',
          tone: 3,
          pinyin: 'liǎo',
          meanings: ['to finish'],
          counterparts: [],
        },
      ],
      freqRank: 10,
      hsk: 1,
      hskWriteBand: 1,
      radical: '亅',
      strokeCount: 2,
      hasStrokes: true,
    },
    // Tone pair: 好 with hao3 and hao4
    {
      char: '好',
      script: 'ST',
      readings: [
        {
          syllable: 'hao',
          tone: 3,
          pinyin: 'hǎo',
          meanings: ['good'],
          counterparts: [],
        },
        {
          syllable: 'hao',
          tone: 4,
          pinyin: 'hào',
          meanings: ['to like'],
          counterparts: [],
        },
      ],
      freqRank: 20,
      hsk: 1,
      hskWriteBand: 1,
      radical: '女',
      strokeCount: 6,
      hasStrokes: true,
    },
    // Script variant: 说 (Simplified)
    {
      char: '说',
      script: 'S',
      readings: [
        {
          syllable: 'shuo',
          tone: 1,
          pinyin: 'shuō',
          meanings: ['to speak'],
          counterparts: ['說'],
        },
      ],
      freqRank: 30,
      hsk: 2,
      hskWriteBand: 1,
      radical: '讠',
      strokeCount: 9,
      hasStrokes: true,
    },
    // Script variant: 說 (Traditional)
    {
      char: '說',
      script: 'T',
      readings: [
        {
          syllable: 'shuo',
          tone: 1,
          pinyin: 'shuō',
          meanings: ['to speak'],
          counterparts: ['说'],
        },
      ],
      freqRank: 31,
      hsk: 2,
      hskWriteBand: 1,
      radical: '言',
      strokeCount: 14,
      hasStrokes: true,
    },
    // Script variant: 人 (both Simplified and Traditional, same character)
    {
      char: '人',
      script: 'ST',
      readings: [
        {
          syllable: 'ren',
          tone: 2,
          pinyin: 'rén',
          meanings: ['person'],
          counterparts: [],
        },
      ],
      freqRank: 5,
      hsk: 1,
      hskWriteBand: 1,
      radical: '人',
      strokeCount: 2,
      hasStrokes: true,
    },
    // Character without freqRank (but has stroke data)
    {
      char: '中',
      script: 'ST',
      readings: [
        {
          syllable: 'zhong',
          tone: 1,
          pinyin: 'zhōng',
          meanings: ['middle'],
          counterparts: [],
        },
      ],
      freqRank: null,
      hsk: 1,
      hskWriteBand: 1,
      radical: '丨',
      strokeCount: 4,
      hasStrokes: true,
    },
    // Character with HSK 7 and hskWriteBand
    {
      char: '睨',
      script: 'T',
      readings: [
        {
          syllable: 'ni',
          tone: 4,
          pinyin: 'nì',
          meanings: ['to look down on'],
          counterparts: [],
        },
      ],
      freqRank: 50000,
      hsk: 7,
      hskWriteBand: 3,
      radical: '目',
      strokeCount: 12,
      hasStrokes: true,
    },
    // Reading with empty meanings and no strokeCount (should be filtered in search)
    {
      char: '㐀',
      script: 'T',
      readings: [
        {
          syllable: 'ba',
          tone: 1,
          pinyin: 'bā',
          meanings: [],
          counterparts: [],
        },
      ],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: null,
      strokeCount: null,
      hasStrokes: false,
    },
    // HSK level 3 with hskWriteBand
    {
      char: '学',
      script: 'S',
      readings: [
        {
          syllable: 'xue',
          tone: 2,
          pinyin: 'xué',
          meanings: ['to study'],
          counterparts: ['學'],
        },
      ],
      freqRank: 40,
      hsk: 3,
      hskWriteBand: 2,
      radical: '子',
      strokeCount: 8,
      hasStrokes: true,
    },
    // HSK level 4 with hskWriteBand
    {
      char: '难',
      script: 'S',
      readings: [
        {
          syllable: 'nan',
          tone: 2,
          pinyin: 'nán',
          meanings: ['difficult'],
          counterparts: ['難'],
        },
      ],
      freqRank: 100,
      hsk: 4,
      hskWriteBand: 2,
      radical: '阝',
      strokeCount: 10,
      hasStrokes: true,
    },
  ],
}
