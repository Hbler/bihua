import { describe, expect, it } from 'vitest'

import { decideScroll, entryIdFrom } from './scroll.js'

describe('decideScroll', () => {
  it('returns top for a new entry (no id)', () => {
    const saved = new Map<string, number>([['entry-1', 120]])
    expect(decideScroll(undefined, saved)).toEqual({ kind: 'top' })
  })

  it('returns top for an id without saved position', () => {
    const saved = new Map<string, number>([['entry-1', 120]])
    expect(decideScroll('entry-2', saved)).toEqual({ kind: 'top' })
  })

  it('returns restore with that y for an id with saved position', () => {
    const saved = new Map<string, number>([
      ['entry-1', 120],
      ['entry-2', 0],
    ])
    expect(decideScroll('entry-1', saved)).toEqual({ kind: 'restore', y: 120 })
    expect(decideScroll('entry-2', saved)).toEqual({ kind: 'restore', y: 0 })
  })
})

describe('entryIdFrom', () => {
  it('returns undefined for null', () => {
    expect(entryIdFrom(null)).toBeUndefined()
  })

  it('returns undefined for a string', () => {
    expect(entryIdFrom('scrollId')).toBeUndefined()
  })

  it('returns undefined for an object without scrollId', () => {
    expect(entryIdFrom({})).toBeUndefined()
    expect(entryIdFrom({ other: 'value' })).toBeUndefined()
  })

  it('returns undefined for an object with a non-string scrollId', () => {
    expect(entryIdFrom({ scrollId: 123 })).toBeUndefined()
    expect(entryIdFrom({ scrollId: true })).toBeUndefined()
    expect(entryIdFrom({ scrollId: null })).toBeUndefined()
    expect(entryIdFrom({ scrollId: undefined })).toBeUndefined()
    expect(entryIdFrom({ scrollId: {} })).toBeUndefined()
  })

  it('returns the id for a valid object with a string scrollId', () => {
    expect(entryIdFrom({ scrollId: 'test-id' })).toBe('test-id')
    expect(entryIdFrom({ scrollId: 'abc-123', extra: true })).toBe('abc-123')
  })
})
