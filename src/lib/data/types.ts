// Contract between the data pipeline (scripts/data) and the app.

export type Tone = 1 | 2 | 3 | 4 | 5

export type Script = 'S' | 'T' | 'ST'

/** HSK 3.0 level; 7 stands for the 7–9 band. */
export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Reading = {
  /** Toneless ASCII key, ü written as `v` (`lv`). */
  syllable: string
  tone: Tone
  /** Display form with tone mark (`lǜ`). */
  pinyin: string
  meanings: string[]
  /** Other-script forms for this reading; empty when identical. */
  counterparts: string[]
}

export type CharEntry = {
  char: string
  script: Script
  readings: Reading[]
  freqRank: number | null
  hsk: HskLevel | null
  hskWrite: HskLevel | null
  radical: string | null
  strokeCount: number | null
  hasStrokes: boolean
}

export type DictionaryFile = {
  version: 1
  built: string
  chars: CharEntry[]
}
