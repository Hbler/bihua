// The dictionary, loaded once for the whole app.

import { loadDictionary, type Dictionary } from './data/dictionary.js'

export type DictionaryState =
  | { status: 'loading' }
  | { status: 'ready'; dict: Dictionary }
  | { status: 'error'; message: string }

export const dictionary = $state<{ current: DictionaryState }>({ current: { status: 'loading' } })

export async function initDictionary(): Promise<void> {
  dictionary.current = { status: 'loading' }
  try {
    const dict = await loadDictionary(`${import.meta.env.BASE_URL}data/dict.json`)
    dictionary.current = { status: 'ready', dict }
  } catch (error) {
    dictionary.current = {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
