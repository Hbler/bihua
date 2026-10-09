// Downloads syllable recordings from audio-cmn. Run with `npm run data:audio`.

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { clipKeyFromFileName } from './audio-names.ts'

const REPO = 'hugolpz/audio-cmn'
const COMMIT = 'ff9ed3d0c631195bd2c06f39450f3264c7124040'
const SET = '24k-abr'

const ROOT = join(import.meta.dirname, '..', '..')
const AUDIO_DIR = join(ROOT, 'public', 'audio')
const SYLLABLES_DIR = join(AUDIO_DIR, 'syllables')
const SYLLABLES_JSON = join(AUDIO_DIR, 'syllables.json')
const LICENSE_PATH = join(SYLLABLES_DIR, 'LICENSE.txt')

const LICENSE_TEXT =
  'Mandarin syllable recordings by Chen Wang, licensed CC BY-SA.\n' +
  'Source: audio-cmn, https://github.com/hugolpz/audio-cmn (commit ff9ed3d0c631195bd2c06f39450f3264c7124040, 24k-abr/syllabs).\n' +
  'Files are unmodified; only renamed from cmn-{syllable}{tone}.mp3 to {syllable}{tone}.mp3 (ü after j/q/x/y written as u). Tone-5 files are not included.\n'

const MAX_CONCURRENCY = 8

interface GitTreeEntry {
  path: string
  type: string
  sha: string
}

interface GitTreeResponse {
  tree: GitTreeEntry[]
}

interface DownloadTask {
  fileName: string
  key: string
  url: string
}

async function downloadWithRetry(url: string, retries = 3): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }
  throw new Error(`Failed to download ${url} after ${retries} retries: ${String(lastError)}`)
}

// 1. Delete existing public/audio/syllables/*.mp3 files so reruns are clean.
await mkdir(SYLLABLES_DIR, { recursive: true })
const existingFiles = await readdir(SYLLABLES_DIR)
for (const file of existingFiles) {
  if (file.endsWith('.mp3')) {
    await unlink(join(SYLLABLES_DIR, file))
  }
}

// 2. Query GitHub API for tree entries under SET/syllabs/*.mp3.
const rootRes = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${COMMIT}`, {
  headers: { 'User-Agent': 'bihua' },
})
if (!rootRes.ok) {
  throw new Error(`GitHub API root tree failed: HTTP ${rootRes.status}`)
}
const rootData = (await rootRes.json()) as GitTreeResponse
const setEntry = rootData.tree.find((entry) => entry.path === SET)
if (!setEntry) {
  throw new Error(`Could not find tree entry for ${SET}`)
}

const setRes = await fetch(
  `https://api.github.com/repos/${REPO}/git/trees/${setEntry.sha}?recursive=1`,
  {
    headers: { 'User-Agent': 'bihua' },
  },
)
if (!setRes.ok) {
  throw new Error(`GitHub API set tree failed: HTTP ${setRes.status}`)
}
const setData = (await setRes.json()) as GitTreeResponse
const blobs = setData.tree.filter(
  (entry) =>
    entry.type === 'blob' && entry.path.startsWith('syllabs/') && entry.path.endsWith('.mp3'),
)

// 3. Map blobs to download tasks and check for duplicates.
const tasks: DownloadTask[] = []
const seenKeys = new Map<string, string>()
let filesSkipped = 0

for (const blob of blobs) {
  const fileName = blob.path.slice('syllabs/'.length)
  const key = clipKeyFromFileName(fileName)
  if (key === null) {
    filesSkipped++
    continue
  }
  const existing = seenKeys.get(key)
  if (existing) {
    throw new Error(`Duplicate key "${key}" mapped from both "${existing}" and "${fileName}"`)
  }
  seenKeys.set(key, fileName)
  const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${SET}/syllabs/${encodeURIComponent(fileName)}`
  tasks.push({ fileName, key, url })
}

// 4. Download files concurrently.
let nextIndex = 0
let filesWritten = 0
let totalBytes = 0

async function worker(): Promise<void> {
  while (true) {
    const idx = nextIndex++
    if (idx >= tasks.length) break
    const task = tasks[idx]
    const buffer = await downloadWithRetry(task.url, 3)
    await writeFile(join(SYLLABLES_DIR, `${task.key}.mp3`), buffer)
    totalBytes += buffer.byteLength
    filesWritten++
  }
}

await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, tasks.length) }, () => worker()))

// 5. Write syllables.json and LICENSE.txt.
const sortedKeys = Array.from(seenKeys.keys()).sort()
await writeFile(SYLLABLES_JSON, JSON.stringify(sortedKeys, null, 2) + '\n')
await writeFile(LICENSE_PATH, LICENSE_TEXT)

// 6. Print report.
const sizeInMib = (totalBytes / (1024 * 1024)).toFixed(2)
console.log('Audio syllables report:')
console.log(`  files listed:   ${blobs.length.toLocaleString()}`)
console.log(`  files written:  ${filesWritten.toLocaleString()}`)
console.log(`  files skipped:  ${filesSkipped.toLocaleString()}`)
console.log(`  total size:     ${sizeInMib} MiB`)
