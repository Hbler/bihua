// CC-CEDICT: https://www.mdbg.net/chinese/dictionary?page=cc-cedict (CC BY-SA 4.0)
// Line format: `Trad Simp [pin1 yin1] /gloss/gloss/`. Only single-character entries are kept.

import { parseNumberedSyllable } from '../../../src/lib/pinyin/tone-marks.ts'
import type { Tone } from '../../../src/lib/data/types.ts'

export type CedictEntry = {
  trad: string
  simp: string
  syllable: string
  tone: Tone
  /** True when the pinyin is capitalised, i.e. a proper noun (surname, place). */
  isProperNoun: boolean
  glosses: string[]
}

const LINE = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/\s*$/u
const HAN = /^\p{Script=Han}$/u

export function parseCedict(text: string): CedictEntry[] {
  const entries: CedictEntry[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue
    const match = LINE.exec(line)
    if (!match) continue
    const [, trad, simp, pinyin, glossText] = match
    if (!HAN.test(trad) || !HAN.test(simp)) continue
    const parsed = parseNumberedSyllable(pinyin)
    if (!parsed) continue
    entries.push({
      trad,
      simp,
      ...parsed,
      isProperNoun: pinyin[0] !== pinyin[0].toLowerCase(),
      glosses: glossText.split('/').filter((gloss) => gloss && !gloss.startsWith('CL:')),
    })
  }
  return entries
}
