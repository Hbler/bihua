import { numberedToMarks, parseNumberedSyllable } from '../pinyin/tone-marks.js'
import type { Script, Tone, WordEntry, WordReading, WordsFile } from './types.js'

/**
 * Pure decoder that turns a compact WordsFile into app-side WordEntry records.
 * Derives key, syllables, tones, display pinyin, counterparts, script, and traditional forms.
 */
export function decodeWords(file: WordsFile): WordEntry[] {
  const entries: WordEntry[] = []

  for (const [word, readingRows, rank] of file.words) {
    const readings: WordReading[] = []
    const traditionalSet = new Set<string>()

    for (const row of readingRows) {
      const [numberedPinyin, meanings, counterparts = []] = row
      for (const c of counterparts) traditionalSet.add(c)

      const syllables: string[] = []
      const tones: Tone[] = []
      for (const token of numberedPinyin.trim().split(/\s+/)) {
        const parsed = parseNumberedSyllable(token)
        if (parsed) {
          syllables.push(parsed.syllable)
          tones.push(parsed.tone)
        }
      }

      const key = syllables.join('')
      const pinyin = syllables.map((s, i) => numberedToMarks(s, tones[i])).join(' ')

      readings.push({
        key,
        syllables,
        tones,
        pinyin,
        meanings,
        counterparts,
      })
    }

    const traditional = Array.from(traditionalSet)
    const script: Script = traditional.length > 0 ? 'S' : 'ST'
    const freqRank = rank === 0 ? null : rank

    entries.push({
      word,
      script,
      readings,
      freqRank,
      traditional,
    })
  }

  return entries
}
