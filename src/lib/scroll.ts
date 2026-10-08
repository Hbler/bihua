export type ScrollDecision = { kind: 'top' } | { kind: 'restore'; y: number }

export function decideScroll(
  entryId: string | undefined,
  saved: ReadonlyMap<string, number>,
): ScrollDecision {
  if (entryId !== undefined && saved.has(entryId)) {
    return { kind: 'restore', y: saved.get(entryId)! }
  }
  return { kind: 'top' }
}

export function entryIdFrom(state: unknown): string | undefined {
  if (typeof state === 'object' && state !== null && 'scrollId' in state) {
    const id = (state as { scrollId: unknown }).scrollId
    if (typeof id === 'string') {
      return id
    }
  }
  return undefined
}
