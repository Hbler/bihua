// Display preferences, remembered per browser. The only state the app persists.

import type { HskLevel } from './data/types.js'
import { DEFAULT_FILTERS, type SearchFilters } from './search/search.js'

export type AnimationSpeed = 0.5 | 1 | 2

export type Settings = SearchFilters & { animationSpeed: AnimationSpeed }

const STORAGE_KEY = 'bihua:settings'

const DEFAULT_SETTINGS: Settings = { ...DEFAULT_FILTERS, animationSpeed: 1 }

const HSK_LEVELS: readonly HskLevel[] = [1, 2, 3, 4, 5, 6, 7]
const SPEEDS: readonly AnimationSpeed[] = [0.5, 1, 2]

/** Keeps only valid stored fields, so a stale or edited value can't break the app. */
export function sanitizeSettings(value: unknown): Settings {
  const stored = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >
  const pick = <T>(key: keyof Settings, valid: (v: unknown) => boolean): T =>
    (valid(stored[key]) ? stored[key] : DEFAULT_SETTINGS[key]) as T
  const isBoolean = (v: unknown) => typeof v === 'boolean'
  return {
    script: pick('script', (v) => v === 'S' || v === 'T' || v === 'ST'),
    hskFilter: pick('hskFilter', isBoolean),
    hskLevel: pick('hskLevel', (v) => HSK_LEVELS.includes(v as HskLevel)),
    handwritingOnly: pick('handwritingOnly', isBoolean),
    animationSpeed: pick('animationSpeed', (v) => SPEEDS.includes(v as AnimationSpeed)),
  }
}

function loadSettings(): Settings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const settings = $state<Settings>(loadSettings())

$effect.root(() => {
  $effect(() => {
    const snapshot = JSON.stringify($state.snapshot(settings))
    try {
      localStorage.setItem(STORAGE_KEY, snapshot)
    } catch {
      // Private mode or storage disabled: preferences just won't persist.
    }
  })
})
