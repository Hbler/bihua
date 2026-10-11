export type RecentItem = {
  kind: 'char' | 'word'
  text: string
  pinyin: string
}

export const RECENT_MAX = 20

/**
 * Removes any existing item with the same kind + text,
 * puts the new item first, trims to max.
 * Never mutates the input.
 */
export function addRecent(
  list: readonly RecentItem[],
  item: RecentItem,
  max = RECENT_MAX,
): RecentItem[] {
  const filtered = list.filter((it) => it.kind !== item.kind || it.text !== item.text)
  return [item, ...filtered].slice(0, max)
}

/**
 * Keeps only objects with kind 'char' | 'word', a non-empty string text,
 * and a string pinyin (missing pinyin → ''); drops later duplicates (kind + text);
 * caps at RECENT_MAX. Non-array returns [].
 */
export function sanitizeRecent(value: unknown): RecentItem[] {
  if (!Array.isArray(value)) {
    return []
  }
  const result: RecentItem[] = []
  const seen = new Set<string>()

  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      continue
    }
    const obj = raw as Record<string, unknown>
    if (obj.kind !== 'char' && obj.kind !== 'word') {
      continue
    }
    if (typeof obj.text !== 'string' || obj.text.length === 0) {
      continue
    }
    const key = `${obj.kind}:${obj.text}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    const pinyin = typeof obj.pinyin === 'string' ? obj.pinyin : ''
    result.push({
      kind: obj.kind,
      text: obj.text,
      pinyin,
    })
    if (result.length >= RECENT_MAX) {
      break
    }
  }

  return result
}
