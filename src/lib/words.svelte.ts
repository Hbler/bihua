import type { WordEntry } from './data/types.js'
import type { WordHit } from './search/words.js'
import type { WorkerRequestPayload, WorkerResponse } from './data/words.worker.js'
import { dictionary } from './dictionary.svelte.js'

export type WordsStatus = 'idle' | 'loading' | 'ready' | 'error'

export const words = $state<{ status: WordsStatus }>({ status: 'idle' })

let worker: Worker | null = null
let nextRequestId = 1
// Plain Map on purpose: pending requests are bookkeeping, never rendered.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const pendingRequests = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
>()

function rejectPending(reason: Error): void {
  for (const req of pendingRequests.values()) req.reject(reason)
  pendingRequests.clear()
}

export function ensureWorker(forceRestart = false): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null
  }

  if (worker && !forceRestart) {
    return worker
  }

  if (worker && forceRestart) {
    worker.terminate()
    worker = null
    rejectPending(new Error('Worker restarted'))
  }

  words.status = 'loading'

  try {
    // Vite needs this exact `new URL(..., import.meta.url)` form to bundle the worker.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    worker = new Worker(new URL('./data/words.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data

      if ('type' in data) {
        words.status = data.type === 'ready' ? 'ready' : 'error'
        return
      }

      const req = pendingRequests.get(data.id)
      if (req) {
        pendingRequests.delete(data.id)
        if ('error' in data) {
          req.reject(new Error(data.error))
        } else {
          if (words.status === 'loading') words.status = 'ready'
          req.resolve(data.result)
        }
      }
    }

    worker.onerror = () => {
      words.status = 'error'
      rejectPending(new Error('Word search worker failed'))
    }

    return worker
  } catch {
    words.status = 'error'
    return null
  }
}

export function retryWords(): void {
  ensureWorker(true)
}

let scheduled = false

function scheduleWorkerStart(): void {
  if (scheduled || words.status !== 'idle') return
  scheduled = true

  const start = () => {
    if (words.status === 'idle') {
      ensureWorker()
    }
  }

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(start)
  } else if (typeof setTimeout !== 'undefined') {
    setTimeout(start, 500)
  }
}

if (typeof window !== 'undefined') {
  $effect.root(() => {
    $effect(() => {
      if (dictionary.current.status === 'ready' && words.status === 'idle') {
        scheduleWorkerStart()
      }
    })
  })
}

function sendRequest<T>(req: WorkerRequestPayload): Promise<T> {
  const w = ensureWorker()
  if (!w) {
    return Promise.reject(new Error('Web Workers not supported'))
  }

  const id = nextRequestId++
  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (val) => resolve(val as T),
      reject,
    })
    w.postMessage({ ...req, id })
  })
}

export function searchWordsEnglish(query: string): Promise<WordHit[]> {
  return sendRequest<WordHit[]>({ type: 'english', query })
}

export function searchWordsPinyin(input: string): Promise<WordHit[]> {
  return sendRequest<WordHit[]>({ type: 'pinyin', query: input })
}

export function lookupWord(form: string): Promise<WordEntry | null> {
  return sendRequest<WordEntry | null>({ type: 'lookup', form })
}
