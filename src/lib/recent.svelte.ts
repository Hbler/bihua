import { untrack } from 'svelte'

import { addRecent, sanitizeRecent, type RecentItem } from './recent.js'

export type { RecentItem }

const STORAGE_KEY = 'bihua:recent'

export const recent = $state({ items: [] as RecentItem[] })

try {
  recent.items = sanitizeRecent(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
} catch {
  recent.items = []
}

export function recordView(item: RecentItem): void {
  const next = untrack(() => addRecent(recent.items, item))
  recent.items = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage quota exceeded
  }
}

export function clearRecent(): void {
  recent.items = []
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or storage disabled
  }
}
