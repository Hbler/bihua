// Make Me a Hanzi dictionary.txt: https://github.com/skishore/makemeahanzi (LGPL)
// One JSON object per line. Used for the radical, which reading is primary, the
// decomposition and the etymology.

import { stripToneMarks } from '../../../src/lib/pinyin/tone-marks.ts'
import type { Etymology, EtymologyType } from '../../../src/lib/data/types.ts'

export type MmahEntry = {
  radical: string | null
  /** Readings as `syllable + tone` keys (`liao3`), main reading first. */
  readings: string[]
  /** Leaf components in order, without repeats or the character itself. */
  components: string[]
  hasUnknownComponent: boolean
  etymology: Etymology | null
}

type RawEntry = {
  character: string
  radical?: string
  pinyin?: string[]
  decomposition?: string
  etymology?: { type?: string; hint?: string; semantic?: string; phonetic?: string }
}

/** Ideographic Description Characters (⿰ ⿱ …) describe layout, not parts. */
const IDS_OPERATOR = /[⿰-⿿]/u
const UNKNOWN_PART = '？'
const ETYMOLOGY_TYPES: readonly EtymologyType[] = ['pictophonetic', 'ideographic', 'pictographic']

/**
 * Reduces an Ideographic Description Sequence to its leaf parts: `⿱雨⿰革月` → 雨 革 月.
 * The intermediate groupings (革月) aren't characters, so only leaves can be linked.
 */
export function parseDecomposition(
  char: string,
  decomposition: string | undefined,
): { components: string[]; hasUnknownComponent: boolean } {
  const components: string[] = []
  let hasUnknownComponent = false
  for (const part of decomposition ?? '') {
    if (IDS_OPERATOR.test(part)) continue
    if (part === UNKNOWN_PART) hasUnknownComponent = true
    else if (part !== char && !components.includes(part)) components.push(part)
  }
  return { components, hasUnknownComponent }
}

function parseEtymology(raw: RawEntry['etymology']): Etymology | null {
  if (!raw || !ETYMOLOGY_TYPES.includes(raw.type as EtymologyType)) return null
  return {
    type: raw.type as EtymologyType,
    ...(raw.hint && { hint: raw.hint }),
    ...(raw.semantic && { semantic: raw.semantic }),
    ...(raw.phonetic && { phonetic: raw.phonetic }),
  }
}

export function parseMmah(text: string): Map<string, MmahEntry> {
  const entries = new Map<string, MmahEntry>()
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const raw = JSON.parse(line) as RawEntry
    const readings = (raw.pinyin ?? []).map((marked) => {
      const { text, tone } = stripToneMarks(marked.normalize('NFC').toLowerCase())
      return `${text}${tone ?? 5}`
    })
    entries.set(raw.character, {
      radical: raw.radical ?? null,
      readings,
      ...parseDecomposition(raw.character, raw.decomposition),
      etymology: parseEtymology(raw.etymology),
    })
  }
  return entries
}
