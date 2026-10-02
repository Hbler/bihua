// Make Me a Hanzi dictionary.txt: https://github.com/skishore/makemeahanzi (LGPL)
// One JSON object per line. Used for the radical and for which reading is primary.

import { stripToneMarks } from '../../../src/lib/pinyin/tone-marks.ts'

export type MmahEntry = {
  radical: string | null
  /** Readings as `syllable + tone` keys (`liao3`), main reading first. */
  readings: string[]
}

export function parseMmah(text: string): Map<string, MmahEntry> {
  const entries = new Map<string, MmahEntry>()
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const { character, radical, pinyin } = JSON.parse(line) as {
      character: string
      radical?: string
      pinyin?: string[]
    }
    const readings = (pinyin ?? []).map((marked) => {
      const { text, tone } = stripToneMarks(marked.normalize('NFC').toLowerCase())
      return `${text}${tone ?? 5}`
    })
    entries.set(character, { radical: radical ?? null, readings })
  }
  return entries
}
