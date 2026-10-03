// Builds public/data/dict.json and words.json from data/raw/ and hanzi-writer-data. Run with `npm run data:build`.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

import type { DictionaryFile, WordsFile } from '../../src/lib/data/types.ts'

import { mergeSources } from './merge.ts'
import { OUTPUT_FILE, RAW_FILES, STROKES_DIR, WORDS_OUTPUT_FILE } from './paths.ts'
import { parseCedict, parseCedictWords } from './sources/cedict.ts'
import { parseJunDa } from './sources/frequency.ts'
import { parseCharList } from './sources/hsk.ts'
import { parseMmah } from './sources/mmah.ts'
import { parseSubtlexWords } from './sources/subtlex.ts'
import { mergeWords } from './words.ts'

const read = (file: string) => readFile(file, 'utf8')

async function readStrokeCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const file of await readdir(STROKES_DIR)) {
    const char = file.replace(/\.json$/, '')
    if (!file.endsWith('.json') || [...char].length !== 1) continue
    const { strokes } = JSON.parse(await read(join(STROKES_DIR, file))) as { strokes: string[] }
    counts.set(char, strokes.length)
  }
  return counts
}

const cedictRaw = await read(RAW_FILES.cedict)
const jundaRaw = await read(RAW_FILES.junda)
const jundaRanks = parseJunDa(jundaRaw)

const chars = mergeSources({
  cedict: parseCedict(cedictRaw),
  frequency: jundaRanks,
  hskLevels: await Promise.all(
    ['1', '2', '3', '4', '5', '6', '7-9'].map(async (level) =>
      parseCharList(await read(RAW_FILES.hskHanzi(level))),
    ),
  ),
  hskBands: await Promise.all(
    (['Elementary', 'Medium', 'Advanced'] as const).map(async (band) =>
      parseCharList(await read(RAW_FILES.hskHandwritten(band))),
    ),
  ),
  mmah: parseMmah(await read(RAW_FILES.mmah)),
  strokeCounts: await readStrokeCounts(),
})

const file: DictionaryFile = {
  version: 1,
  built: new Date().toISOString().slice(0, 10),
  chars,
}
const json = JSON.stringify(file)
await mkdir(dirname(OUTPUT_FILE), { recursive: true })
await writeFile(OUTPUT_FILE, json)

const count = (predicate: (entry: (typeof chars)[number]) => boolean) =>
  chars.filter(predicate).length
const kb = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString()} KB`

console.log(`Wrote ${OUTPUT_FILE}`)
console.log(`  characters:          ${chars.length.toLocaleString()}`)
console.log(`  with stroke data:    ${count((c) => c.hasStrokes).toLocaleString()}`)
console.log(`  with readings:       ${count((c) => c.readings.length > 0).toLocaleString()}`)
console.log(
  `  S / T / ST:          ${count((c) => c.script === 'S')} / ${count((c) => c.script === 'T')} / ${count((c) => c.script === 'ST')}`,
)
console.log(`  HSK tagged:          ${count((c) => c.hsk !== null)}`)
console.log(`  size:                ${kb(json.length)} raw, ${kb(gzipSync(json).length)} gzip`)

const hskWithoutStrokes = chars.filter((c) => c.hsk !== null && c.script !== 'T' && !c.hasStrokes)
if (hskWithoutStrokes.length) {
  console.warn(
    `  ⚠ HSK characters without stroke data: ${hskWithoutStrokes.map((c) => c.char).join('')}`,
  )
}
const hskWithoutReadings = chars.filter((c) => c.hsk !== null && c.readings.length === 0)
if (hskWithoutReadings.length) {
  console.warn(
    `  ⚠ HSK characters without readings: ${hskWithoutReadings.map((c) => c.char).join('')}`,
  )
}

const parsedCedictWords = parseCedictWords(cedictRaw)
const subtlexRanks = parseSubtlexWords(await read(RAW_FILES.subtlexWords))

const words = mergeWords({
  cedict: parsedCedictWords,
  subtlex: subtlexRanks,
  junda: jundaRanks,
})

const wordsFile: WordsFile = {
  version: 1,
  built: new Date().toISOString().slice(0, 10),
  words,
}
const wordsJson = JSON.stringify(wordsFile)
await mkdir(dirname(WORDS_OUTPUT_FILE), { recursive: true })
await writeFile(WORDS_OUTPUT_FILE, wordsJson)

const wordCount = (predicate: (entry: (typeof words)[number]) => boolean) =>
  words.filter(predicate).length

const properOnlyWords = new Set<string>()
const commonWords = new Set<string>()
for (const entry of parsedCedictWords) {
  if (entry.isProperNoun) {
    properOnlyWords.add(entry.simp)
    properOnlyWords.add(entry.trad)
  } else {
    commonWords.add(entry.simp)
    commonWords.add(entry.trad)
  }
}
for (const word of commonWords) properOnlyWords.delete(word)
const properCount = wordCount((w) => properOnlyWords.has(w[0]))

let seeCount = 0
for (const w of words) {
  for (const r of w[1]) {
    for (const m of r[1]) {
      if (/^(?:see |variant of |old variant of )/i.test(m)) {
        seeCount++
      }
    }
  }
}

const sCount = wordCount((w) => w[1].some((r) => r.length > 2))
const stCount = words.length - sCount
const rankedCount = wordCount((w) => w[2] > 0)

const wordsRawBytes = Buffer.byteLength(wordsJson)
const wordsGzipBytes = gzipSync(wordsJson).length

console.log(`Wrote ${WORDS_OUTPUT_FILE}`)
console.log(`  words/rows:          ${words.length.toLocaleString()}`)
console.log(`  S / ST:              ${sCount.toLocaleString()} / ${stCount.toLocaleString()}`)
console.log(`  with SUBTLEX rank:   ${rankedCount.toLocaleString()}`)
console.log(`  proper nouns kept:   ${properCount.toLocaleString()}`)
console.log(`  see/variant glosses: ${seeCount}`)
console.log(`  size:                ${kb(wordsRawBytes)} raw, ${kb(wordsGzipBytes)} gzip`)

if (seeCount > 0) {
  throw new Error(`Expected 0 see/variant glosses remaining, found ${seeCount}`)
}

const MAX_RAW = 8.5 * 1024 * 1024
const MAX_GZIP = 4 * 1024 * 1024
if (wordsRawBytes > MAX_RAW || wordsGzipBytes > MAX_GZIP) {
  console.warn(
    `  ⚠ Size budget exceeded: raw ${kb(wordsRawBytes)} (budget: ${kb(MAX_RAW)}), gzip ${kb(wordsGzipBytes)} (budget: ${kb(MAX_GZIP)})`,
  )
}
