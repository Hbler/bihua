import { describe, expect, it } from 'vitest'

import { addRecent, RECENT_MAX, sanitizeRecent, type RecentItem } from './recent.js'
import { clearRecent, recent, recordView } from './recent.svelte.js'

describe('addRecent', () => {
  it('inserts into empty', () => {
    const item: RecentItem = { kind: 'char', text: '睨', pinyin: 'nì' }
    const result = addRecent([], item)
    expect(result).toEqual([item])
  })

  it('puts a new item first', () => {
    const first: RecentItem = { kind: 'char', text: '睨', pinyin: 'nì' }
    const second: RecentItem = { kind: 'word', text: '地球', pinyin: 'dì qiú' }
    const result = addRecent([first], second)
    expect(result).toEqual([second, first])
  })

  it('re-adding moves to the top without duplicates', () => {
    const itemA: RecentItem = { kind: 'char', text: '睨', pinyin: 'nì' }
    const itemB: RecentItem = { kind: 'word', text: '地球', pinyin: 'dì qiú' }
    const list = [itemB, itemA]
    const updated = addRecent(list, itemA)
    expect(updated).toEqual([itemA, itemB])
    expect(updated).toHaveLength(2)
  })

  it('same text with a different kind is a separate item', () => {
    const charItem: RecentItem = { kind: 'char', text: '好', pinyin: 'hǎo' }
    const wordItem: RecentItem = { kind: 'word', text: '好', pinyin: 'hǎo' }
    const result = addRecent([charItem], wordItem)
    expect(result).toEqual([wordItem, charItem])
    expect(result).toHaveLength(2)
  })

  it('21 adds keep 20 (the oldest dropped)', () => {
    let list: RecentItem[] = []
    for (let i = 1; i <= 21; i++) {
      list = addRecent(list, { kind: 'char', text: String(i), pinyin: `p${i}` })
    }
    expect(list).toHaveLength(RECENT_MAX)
    expect(list[0]).toEqual({ kind: 'char', text: '21', pinyin: 'p21' })
    expect(list[RECENT_MAX - 1]).toEqual({ kind: 'char', text: '2', pinyin: 'p2' })
    expect(list.some((item) => item.text === '1')).toBe(false)
  })

  it('does not mutate input', () => {
    const initial: readonly RecentItem[] = Object.freeze([
      { kind: 'char', text: '睨', pinyin: 'nì' },
    ])
    const newItem: RecentItem = { kind: 'word', text: '地球', pinyin: 'dì qiú' }
    const result = addRecent(initial, newItem)
    expect(initial).toHaveLength(1)
    expect(initial[0].text).toBe('睨')
    expect(result).toEqual([newItem, initial[0]])
  })
})

describe('sanitizeRecent', () => {
  it('returns [] for null, a string, or an object', () => {
    expect(sanitizeRecent(null)).toEqual([])
    expect(sanitizeRecent('not an array')).toEqual([])
    expect(sanitizeRecent({ items: [] })).toEqual([])
    expect(sanitizeRecent(undefined)).toEqual([])
    expect(sanitizeRecent(123)).toEqual([])
    expect(sanitizeRecent(true)).toEqual([])
  })

  it('drops invalid entries', () => {
    const input = [
      null,
      undefined,
      42,
      'string',
      [],
      {},
      { kind: 'unknown', text: '睨', pinyin: 'nì' },
      { kind: 'char' },
      { kind: 'char', text: '' },
      { kind: 'char', text: 123 },
      { kind: 'word', text: '地球', pinyin: 'dì qiú' },
    ]
    expect(sanitizeRecent(input)).toEqual([{ kind: 'word', text: '地球', pinyin: 'dì qiú' }])
  })

  it('drops duplicates keeping the first', () => {
    const input = [
      { kind: 'char', text: '睨', pinyin: 'nì' },
      { kind: 'word', text: '地球', pinyin: 'dì qiú' },
      { kind: 'char', text: '睨', pinyin: 'different' },
    ]
    expect(sanitizeRecent(input)).toEqual([
      { kind: 'char', text: '睨', pinyin: 'nì' },
      { kind: 'word', text: '地球', pinyin: 'dì qiú' },
    ])
  })

  it('treats missing pinyin as empty string', () => {
    const input = [{ kind: 'char', text: '睨' }]
    expect(sanitizeRecent(input)).toEqual([{ kind: 'char', text: '睨', pinyin: '' }])

    const nonStringPinyin = [{ kind: 'char', text: '睨', pinyin: null }]
    expect(sanitizeRecent(nonStringPinyin)).toEqual([{ kind: 'char', text: '睨', pinyin: '' }])
  })

  it('caps more than 20 items to 20', () => {
    const input = Array.from({ length: 25 }, (_, i) => ({
      kind: 'char' as const,
      text: String(i),
      pinyin: `p${i}`,
    }))
    const result = sanitizeRecent(input)
    expect(result).toHaveLength(20)
    expect(result[0].text).toBe('0')
    expect(result[19].text).toBe('19')
  })
})

describe('recent reactive state', () => {
  it('recordView adds items and clearRecent empties the list', () => {
    clearRecent()
    expect(recent.items).toEqual([])

    recordView({ kind: 'char', text: '睨', pinyin: 'nì' })
    expect(recent.items).toEqual([{ kind: 'char', text: '睨', pinyin: 'nì' }])

    recordView({ kind: 'word', text: '地球', pinyin: 'dì qiú' })
    expect(recent.items).toEqual([
      { kind: 'word', text: '地球', pinyin: 'dì qiú' },
      { kind: 'char', text: '睨', pinyin: 'nì' },
    ])

    clearRecent()
    expect(recent.items).toEqual([])
  })

  it('persists to localStorage and removes key on clear', () => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    }

    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    })

    try {
      recordView({ kind: 'char', text: '睨', pinyin: 'nì' })
      expect(store.has('bihua:recent')).toBe(true)
      expect(JSON.parse(store.get('bihua:recent')!)).toEqual([
        { kind: 'char', text: '睨', pinyin: 'nì' },
      ])

      clearRecent()
      expect(store.has('bihua:recent')).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
        writable: true,
      })
    }
  })
})
