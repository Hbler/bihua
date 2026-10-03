import type { Tone } from '../data/types.js'
import { numberedToMarks } from './tone-marks.js'

export type SpokenTonesResult = {
  tones: Tone[]
  approximate: boolean
}

export type SandhiExample = {
  word: string
  spoken: string
}

export type SandhiNote = {
  text: string
  examples: SandhiExample[]
}

const NUMERALS = new Set('一二三四五六七八九十百千万零两萬兩')

/**
 * Calculates spoken tones (tone sandhi) for Chinese words.
 * Citation tones are CC-CEDICT tones (1-4, 5 = neutral).
 *
 * Rules are applied in this order:
 * 1. 一 (tone 1) sandhi:
 *    - followed by tone 4 (or neutral 个/個) → tone 2
 *    - followed by tones 1, 2, 3 → tone 4
 *    - followed by tone 5 → unchanged
 *    - unchanged when previous is 第, next is a numeral, or 一 is the last syllable.
 * 2. 不 (tone 4) sandhi:
 *    - followed by tone 4 → tone 2
 *    - otherwise unchanged
 * 3. Third-tone runs (consecutive tone-3 syllables; neutral tones break a run):
 *    - run of 2: first becomes 2
 *    - run of 3+: all except last become 2, and approximate = true
 */
export function spokenTones(chars: string[], tones: Tone[]): SpokenTonesResult {
  if (tones.length <= 1) {
    return { tones: [...tones], approximate: false }
  }

  const result = [...tones]
  let approximate = false

  // a. 一 (tone 1) followed by another syllable in the word
  for (let i = 0; i < tones.length; i++) {
    if (chars[i] === '一' && result[i] === 1) {
      if (i === tones.length - 1) continue
      if (i > 0 && chars[i - 1] === '第') continue
      if (NUMERALS.has(chars[i + 1])) continue

      const nextTone = tones[i + 1]
      const nextChar = chars[i + 1]
      if (nextTone === 4 || (nextTone === 5 && (nextChar === '个' || nextChar === '個'))) {
        result[i] = 2
      } else if (nextTone === 1 || nextTone === 2 || nextTone === 3) {
        result[i] = 4
      }
    }
  }

  // b. 不 (tone 4) followed by a tone 4
  for (let i = 0; i < tones.length - 1; i++) {
    if (chars[i] === '不' && result[i] === 4) {
      const nextTone = tones[i + 1]
      if (nextTone === 4) {
        result[i] = 2
      }
    }
  }

  // c. Third-tone runs
  let runStart = -1
  for (let i = 0; i <= result.length; i++) {
    if (i < result.length && result[i] === 3) {
      if (runStart === -1) {
        runStart = i
      }
    } else {
      if (runStart !== -1) {
        const runLength = i - runStart
        if (runLength === 2) {
          result[runStart] = 2
        } else if (runLength >= 3) {
          for (let k = runStart; k < i - 1; k++) {
            result[k] = 2
          }
          approximate = true
        }
        runStart = -1
      }
    }
  }

  return { tones: result, approximate }
}

function formatSpoken(chars: string[], syllables: string[], tones: Tone[]): string {
  const { tones: spoken } = spokenTones(chars, tones)
  return syllables.map((s, i) => numberedToMarks(s, spoken[i])).join(' ')
}

/**
 * Returns tone sandhi notes for a character and reading tone to display on the character page.
 */
export function sandhiNotes(char: string, tone: Tone): SandhiNote[] {
  if (char === '一' && tone === 1) {
    return [
      {
        text: 'yí before a 4th tone, yì before tones 1–3; yī alone, at the end of a word, and in ordinals',
        examples: [
          { word: '一个', spoken: formatSpoken(['一', '个'], ['yi', 'ge'], [1, 5]) },
          { word: '一天', spoken: formatSpoken(['一', '天'], ['yi', 'tian'], [1, 1]) },
        ],
      },
    ]
  }

  if (char === '不' && tone === 4) {
    return [
      {
        text: 'bú before a 4th tone',
        examples: [{ word: '不是', spoken: formatSpoken(['不', '是'], ['bu', 'shi'], [4, 4]) }],
      },
    ]
  }

  if (tone === 3) {
    return [
      {
        text: 'Before another 3rd tone it is said as a 2nd tone',
        examples: [{ word: '你好', spoken: formatSpoken(['你', '好'], ['ni', 'hao'], [3, 3]) }],
      },
    ]
  }

  return []
}
