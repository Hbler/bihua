// Builds public/data/dict.json from data/raw/ and hanzi-writer-data. Run with `npm run data:build`.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

import type { DictionaryFile } from '../../src/lib/data/types.ts'

import { mergeSources } from './merge.ts'
import { OUTPUT_FILE, RAW_FILES, STROKES_DIR } from './paths.ts'
import { parseCedict } from './sources/cedict.ts'
import { parseJunDa } from './sources/frequency.ts'
import { parseCharList } from './sources/hsk.ts'
import { parseMmah } from './sources/mmah.ts'

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

const chars = mergeSources({
  cedict: parseCedict(await read(RAW_FILES.cedict)),
  frequency: parseJunDa(await read(RAW_FILES.junda)),
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
