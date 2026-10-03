// Downloads the raw data sources into data/raw/. Run with `npm run data:fetch`.

import { mkdir, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

import { unzipSync } from 'fflate'

import { RAW_DIR, RAW_FILES } from './paths.ts'

const HSK_BASE = 'https://raw.githubusercontent.com/krmanik/HSK-3.0/main/New%20HSK%20(2021)'

type Source = {
  file: string
  url: string
  decode: (body: Buffer) => string
}

const utf8 = (body: Buffer) => body.toString('utf8')

const SOURCES: Source[] = [
  {
    file: RAW_FILES.cedict,
    url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
    decode: (body) => gunzipSync(body).toString('utf8'),
  },
  {
    file: RAW_FILES.mmah,
    url: 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt',
    decode: utf8,
  },
  {
    file: RAW_FILES.junda,
    url: 'https://lingua.mtsu.edu/chinese-computing/statistics/char/download.php?Which=MO',
    decode: (body) => new TextDecoder('gb18030').decode(body),
  },
  {
    file: RAW_FILES.subtlexWords,
    url: 'https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/subtlexchwf.zip',
    decode: (body) => {
      const files = unzipSync(new Uint8Array(body))
      const raw = files['SUBTLEX-CH-WF']
      if (!raw) throw new Error('SUBTLEX-CH-WF not found in zip archive')
      return new TextDecoder('gb18030').decode(raw)
    },
  },
  ...['1', '2', '3', '4', '5', '6', '7-9'].map((level) => ({
    file: RAW_FILES.hskHanzi(level),
    url: `${HSK_BASE}/HSK%20Hanzi/HSK%20${level}.txt`,
    decode: utf8,
  })),
  ...(['Elementary', 'Medium', 'Advanced'] as const).map((band) => ({
    file: RAW_FILES.hskHandwritten(band),
    url: `${HSK_BASE}/HSK%20Handwritten/${band}.txt`,
    decode: utf8,
  })),
]

async function download(source: Source): Promise<void> {
  const response = await fetch(source.url)
  if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`)
  const text = source.decode(Buffer.from(await response.arrayBuffer()))
  await writeFile(source.file, text)
  console.log(`✓ ${source.file} (${text.length.toLocaleString()} chars)`)
}

await mkdir(RAW_DIR, { recursive: true })
for (const source of SOURCES) await download(source)
