// Contract between the data pipeline (scripts/data) and the app.

export type Tone = 1 | 2 | 3 | 4 | 5

export type Script = 'S' | 'T' | 'ST'

/** HSK 3.0 level; 7 stands for the 7–9 band. */
export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** HSK 3.0 handwriting lists are per band: 1 elementary (1–3), 2 intermediate (4–6), 3 advanced (7–9). */
export type HskBand = 1 | 2 | 3

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

export type EtymologyType = 'pictophonetic' | 'ideographic' | 'pictographic'

/** How a character was formed, from Make Me a Hanzi. */
export type Etymology = {
  type: EtymologyType
  /** e.g. "The light of the sun 日 and moon 月" or "speech". */
  hint?: string
  /** Component carrying the meaning (讠 in 说). */
  semantic?: string
  /** Component carrying the sound (兑 in 说). */
  phonetic?: string
}

export type CharEntry = {
  char: string
  script: Script
  readings: Reading[]
  freqRank: number | null
  hsk: HskLevel | null
  hskWriteBand: HskBand | null
  radical: string | null
  strokeCount: number | null
  hasStrokes: boolean
  /** Leaf components of the decomposition, in order, without repeats or the character itself. */
  components: string[]
  /** True when the decomposition has parts Make Me a Hanzi couldn't identify (发 = ？ + 又). */
  hasUnknownComponent: boolean
  etymology: Etymology | null
}

export type DictionaryFile = {
  version: 1
  built: string
  chars: CharEntry[]
}
