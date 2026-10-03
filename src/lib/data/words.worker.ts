import type { WordsFile, WordEntry } from './types.js'
import { decodeWords } from './words.js'
import { parseWordQuery } from '../pinyin/parse.js'
import {
  buildCharIndex,
  buildWordIndex,
  searchWordsEnglish,
  searchWordsPinyin,
  wordsContaining,
  type WordHit,
  type WordIndex,
} from '../search/words.js'

export type WorkerRequestPayload =
  | { type: 'english'; query: string }
  | { type: 'pinyin'; query: string }
  | { type: 'lookup'; form: string }
  | { type: 'containing'; char: string }

export type WorkerRequest = WorkerRequestPayload & { id: number }

export type WorkerResponse =
  | { id: number; result: WordHit[] | WordEntry | null }
  | { id: number; error: string }
  | { type: 'ready' }
  | { type: 'error'; error: string }

let loadPromise: Promise<WordIndex> | null = null
let charIndex: Map<string, number[]> | null = null

async function getIndex(): Promise<WordIndex> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const url = `${import.meta.env.BASE_URL}data/words.json`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching words.json`)
      }
      const data: WordsFile = await res.json()
      const entries = decodeWords(data)
      return buildWordIndex(entries)
    })()
  }
  return loadPromise
}

// Start building index as soon as worker is initialized
getIndex()
  .then(() => {
    self.postMessage({ type: 'ready' })
  })
  .catch((err) => {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    })
  })

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  try {
    const index = await getIndex()
    if (req.type === 'english') {
      const hits = searchWordsEnglish(index, req.query).slice(0, 300)
      self.postMessage({ id: req.id, result: hits })
    } else if (req.type === 'pinyin') {
      const parsed = parseWordQuery(req.query)
      const hits = parsed ? searchWordsPinyin(index, parsed).slice(0, 300) : []
      self.postMessage({ id: req.id, result: hits })
    } else if (req.type === 'lookup') {
      const entryIndex = index.byForm.get(req.form)
      const result = entryIndex !== undefined ? index.entries[entryIndex] : null
      self.postMessage({ id: req.id, result })
    } else if (req.type === 'containing') {
      if (!charIndex) {
        charIndex = buildCharIndex(index.entries)
      }
      const hits = wordsContaining(index.entries, charIndex, req.char).slice(0, 300)
      self.postMessage({ id: req.id, result: hits })
    }
  } catch (error) {
    self.postMessage({
      id: req.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
