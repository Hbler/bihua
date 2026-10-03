// Merges the parsed sources into CharEntry records. Pure: no file access, so it is unit-tested.

import { numberedToMarks } from '../../src/lib/pinyin/tone-marks.ts'
import type { CharEntry, HskBand, HskLevel, Reading, Tone } from '../../src/lib/data/types.ts'

import type { CedictEntry } from './sources/cedict.ts'
import type { MmahEntry } from './sources/mmah.ts'

export type MergeInput = {
  cedict: CedictEntry[]
  /** Jun Da frequency rank per character. */
  frequency: Map<string, number>
  /** Characters per HSK level (index 0 = level 1, index 6 = band 7–9). */
  hskLevels: string[][]
  /** Handwriting characters per band (index 0 = elementary). */
  hskBands: string[][]
  mmah: Map<string, MmahEntry>
  /** Stroke count for every character that has stroke data. */
  strokeCounts: Map<string, number>
}

type ReadingAcc = {
  syllable: string
  tone: Tone
  common: string[]
  /** Glosses from proper-noun entries (France for 法 Fǎ), shown after the common ones. */
  proper: string[]
  surname: string[]
  variant: string[]
  properOnly: boolean
  counterparts: Set<string>
  order: number
}

type CharAcc = {
  readings: Map<string, ReadingAcc>
  asSimp: boolean
  asTrad: boolean
}

const VARIANT_GLOSS =
  /^(old |archaic |ancient |erroneous |euphemistic |Japanese )*variant of |^see /i
const SURNAME_GLOSS = /^surname /i
/** Only "variant of …" glosses (not "see …" cross-references, which still carry meaning). */
const VARIANT_ONLY_GLOSS =
  /^(old |archaic |ancient |erroneous |euphemistic |Japanese )*variant of /i

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value)
}

function addReading(acc: CharAcc, entry: CedictEntry, counterpart: string | null): void {
  const key = `${entry.syllable}${entry.tone}`
  let reading = acc.readings.get(key)
  if (!reading) {
    reading = {
      syllable: entry.syllable,
      tone: entry.tone,
      common: [],
      proper: [],
      surname: [],
      variant: [],
      properOnly: true,
      counterparts: new Set(),
      order: acc.readings.size,
    }
    acc.readings.set(key, reading)
  }
  if (!entry.isProperNoun) reading.properOnly = false
  for (const gloss of entry.glosses) {
    if (VARIANT_GLOSS.test(gloss)) pushUnique(reading.variant, gloss)
    else if (SURNAME_GLOSS.test(gloss)) pushUnique(reading.surname, gloss)
    else pushUnique(entry.isProperNoun ? reading.proper : reading.common, gloss)
  }
  if (counterpart) reading.counterparts.add(counterpart)
}

/**
 * Reading sort weight: Make Me a Hanzi's readings first (it lists the main reading first), then
 * readings with ordinary meanings before proper-noun or variant-only ones, then by gloss count.
 */
function readingWeight(reading: ReadingAcc, preferred: string[]): number[] {
  const preferredIndex = preferred.indexOf(`${reading.syllable}${reading.tone}`)
  const isWeak = reading.properOnly || reading.common.length === 0
  return [
    preferredIndex === -1 ? Infinity : preferredIndex,
    isWeak ? 1 : 0,
    -reading.common.length,
    reading.order,
  ]
}

function compareWeights(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

function toReading(reading: ReadingAcc): Reading {
  return {
    syllable: reading.syllable,
    tone: reading.tone,
    pinyin: numberedToMarks(reading.syllable, reading.tone),
    meanings: [...reading.common, ...reading.proper, ...reading.surname, ...reading.variant],
    counterparts: [...reading.counterparts],
  }
}

function minOrNull<T extends number>(values: (T | null)[]): T | null {
  const present = values.filter((value): value is T => value !== null)
  return present.length ? (Math.min(...present) as T) : null
}

function levelLookup<T extends number>(lists: string[][]): Map<string, T> {
  const lookup = new Map<string, T>()
  lists.forEach((chars, index) => {
    for (const char of chars) if (!lookup.has(char)) lookup.set(char, (index + 1) as T)
  })
  return lookup
}

export function mergeSources(input: MergeInput): CharEntry[] {
  const chars = new Map<string, CharAcc>()
  const accFor = (char: string): CharAcc => {
    let acc = chars.get(char)
    if (!acc) {
      acc = { readings: new Map(), asSimp: false, asTrad: false }
      chars.set(char, acc)
    }
    return acc
  }

  for (const entry of input.cedict) {
    const simp = accFor(entry.simp)
    simp.asSimp = true
    if (entry.trad === entry.simp) {
      simp.asTrad = true
      addReading(simp, entry, null)
    } else {
      // Entries like `昰 是 [shi4] /variant of 是[shi4]/` only map an old form onto the
      // Simplified one: they describe the Traditional side, and add nothing to 是 itself.
      const isVariantMapping = entry.glosses.every((gloss) => VARIANT_ONLY_GLOSS.test(gloss))
      if (!isVariantMapping) addReading(simp, entry, entry.trad)
      const trad = accFor(entry.trad)
      trad.asTrad = true
      addReading(trad, entry, entry.simp)
    }
  }
  for (const char of input.strokeCounts.keys()) accFor(char)

  const hsk = levelLookup<HskLevel>(input.hskLevels)
  const hskBand = levelLookup<HskBand>(input.hskBands)

  const entries: CharEntry[] = [...chars].map(([char, acc]) => {
    const mmah = input.mmah.get(char)
    const readings = [...acc.readings.values()]
      .sort((a, b) =>
        compareWeights(
          readingWeight(a, mmah?.readings ?? []),
          readingWeight(b, mmah?.readings ?? []),
        ),
      )
      .map(toReading)
    const script = acc.asSimp && acc.asTrad ? 'ST' : acc.asTrad ? 'T' : acc.asSimp ? 'S' : 'ST'
    return {
      char,
      script,
      readings,
      freqRank: input.frequency.get(char) ?? null,
      hsk: hsk.get(char) ?? null,
      hskWriteBand: hskBand.get(char) ?? null,
      radical: mmah?.radical ?? null,
      components: mmah?.components ?? [],
      hasUnknownComponent: mmah?.hasUnknownComponent ?? false,
      etymology: mmah?.etymology ?? null,
      strokeCount: input.strokeCounts.get(char) ?? null,
      hasStrokes: input.strokeCounts.has(char),
    }
  })

  const byChar = new Map(entries.map((entry) => [entry.char, entry]))

  // CC-CEDICT lists obscure variant counterparts too (干 gān → 乾, 乹, 亁): keep those with stroke data when any exist.
  for (const reading of entries.flatMap((entry) => entry.readings)) {
    const drawable = reading.counterparts.filter((char) => byChar.get(char)?.hasStrokes)
    if (drawable.length) reading.counterparts = drawable
  }

  // Frequency and HSK lists are Simplified: Traditional-only characters inherit from their
  // counterparts, but only through readings with real meanings (not "variant of 法" forms like 㳒).
  for (const entry of entries) {
    if (entry.script !== 'T') continue
    const counterparts = [
      ...new Set(
        entry.readings
          .filter((reading) => reading.meanings.some((meaning) => !VARIANT_GLOSS.test(meaning)))
          .flatMap((reading) => reading.counterparts),
      ),
    ]
      .map((char) => byChar.get(char))
      .filter((counterpart) => counterpart !== undefined)
    entry.freqRank = minOrNull(counterparts.map((c) => c.freqRank))
    entry.hsk = minOrNull(counterparts.map((c) => c.hsk))
    entry.hskWriteBand = minOrNull(counterparts.map((c) => c.hskWriteBand))
  }

  return entries.sort((a, b) => a.char.codePointAt(0)! - b.char.codePointAt(0)!)
}
