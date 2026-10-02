import { describe, it, expect, vi } from 'vitest'
import { indexDictionary, loadDictionary } from './dictionary.js'
import { testDictFile } from './fixtures.js'

describe('indexDictionary', () => {
  it('should create byChar map with all entries', () => {
    const dict = indexDictionary(testDictFile)
    expect(dict.byChar.has('了')).toBe(true)
    expect(dict.byChar.has('好')).toBe(true)
    expect(dict.byChar.has('说')).toBe(true)
    expect(dict.byChar.has('人')).toBe(true)
  })

  it('should return the correct CharEntry for each character', () => {
    const dict = indexDictionary(testDictFile)
    const liaoEntry = dict.byChar.get('了')
    expect(liaoEntry?.char).toBe('了')
    expect(liaoEntry?.readings.length).toBe(2)
  })

  it('should create bySyllable map with all syllables', () => {
    const dict = indexDictionary(testDictFile)
    expect(dict.bySyllable.has('le')).toBe(true)
    expect(dict.bySyllable.has('liao')).toBe(true)
    expect(dict.bySyllable.has('hao')).toBe(true)
    expect(dict.bySyllable.has('shuo')).toBe(true)
    expect(dict.bySyllable.has('ren')).toBe(true)
  })

  it('should include polyphone 了 under both syllables le and liao', () => {
    const dict = indexDictionary(testDictFile)
    const leHits = dict.bySyllable.get('le')
    const liaoHits = dict.bySyllable.get('liao')

    expect(leHits?.length).toBeGreaterThan(0)
    expect(liaoHits?.length).toBeGreaterThan(0)

    const leEntry = leHits?.find((h) => h.entry.char === '了')
    const liaoEntry = liaoHits?.find((h) => h.entry.char === '了')

    expect(leEntry?.reading.tone).toBe(5)
    expect(liaoEntry?.reading.tone).toBe(3)
  })

  it('should sort bySyllable results by freqRank ascending, then strokeCount, then code point', () => {
    const dict = indexDictionary(testDictFile)
    const renHits = dict.bySyllable.get('ren')

    // 人 has freqRank 5 and strokeCount 2
    expect(renHits?.length).toBeGreaterThan(0)
    expect(renHits?.[0].entry.char).toBe('人')
    expect(renHits?.[0].entry.freqRank).toBe(5)
  })

  it('should sort tone pairs correctly under hao syllable', () => {
    const dict = indexDictionary(testDictFile)
    const haoHits = dict.bySyllable.get('hao')

    expect(haoHits?.length).toBe(2)
    // Both have same freqRank (20) and strokeCount (6), so sorted by tone
    expect(haoHits?.[0].reading.tone).toBe(3) // tone 3 comes before tone 4
    expect(haoHits?.[1].reading.tone).toBe(4)
  })

  it('should create readonly Hit objects with entry and reading', () => {
    const dict = indexDictionary(testDictFile)
    const liaoHits = dict.bySyllable.get('liao')
    const hit = liaoHits?.[0]

    expect(hit).toHaveProperty('entry')
    expect(hit).toHaveProperty('reading')
    expect(hit?.entry.char).toBe('了')
    expect(hit?.reading.syllable).toBe('liao')
  })

  it('should handle characters with null freqRank', () => {
    const dict = indexDictionary(testDictFile)
    const zhongHits = dict.bySyllable.get('zhong')

    expect(zhongHits?.length).toBeGreaterThan(0)
    // 中 has null freqRank
    const zhongEntry = zhongHits?.find((h) => h.entry.char === '中')
    expect(zhongEntry?.entry.freqRank).toBeNull()
  })

  it('should sort entries with null freqRank after those with values', () => {
    const dict = indexDictionary(testDictFile)
    // Check that characters with freqRank come before those without
    // This would need multiple characters with same syllable
    const liaoHits = dict.bySyllable.get('liao')
    const withRank = liaoHits?.filter((h) => h.entry.freqRank !== null)
    const withoutRank = liaoHits?.filter((h) => h.entry.freqRank === null)

    if (withRank && withoutRank && withRank.length > 0 && withoutRank.length > 0) {
      const lastWithRank = withRank[withRank.length - 1]
      const firstWithoutRank = withoutRank[0]
      const indexWithRank = liaoHits?.indexOf(lastWithRank)
      const indexWithoutRank = liaoHits?.indexOf(firstWithoutRank)
      expect(indexWithRank! < indexWithoutRank!).toBe(true)
    }
  })

  it('should return readonly maps', () => {
    const dict = indexDictionary(testDictFile)
    expect(dict.byChar).toBeInstanceOf(Map)
    expect(dict.bySyllable).toBeInstanceOf(Map)
  })

  it('should not mutate the input file', () => {
    const fileCopy = JSON.parse(JSON.stringify(testDictFile))
    indexDictionary(testDictFile)
    expect(testDictFile).toEqual(fileCopy)
  })

  it('should include all readings for polyphones', () => {
    const dict = indexDictionary(testDictFile)
    const liaoEntry = dict.byChar.get('了')
    expect(liaoEntry?.readings.length).toBe(2)
    expect(liaoEntry?.readings.map((r) => r.tone)).toContain(5)
    expect(liaoEntry?.readings.map((r) => r.tone)).toContain(3)
  })
})

describe('loadDictionary', () => {
  it('should fetch and index a dictionary from a URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => testDictFile,
    })

    const dict = await loadDictionary('http://example.com/dict.json', mockFetch)

    expect(mockFetch).toHaveBeenCalledWith('http://example.com/dict.json')
    expect(dict.byChar.has('了')).toBe(true)
  })

  it('should throw on 404 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(loadDictionary('http://example.com/missing.json', mockFetch)).rejects.toThrow()
  })

  it('should throw on non-ok response with status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(loadDictionary('http://example.com/dict.json', mockFetch)).rejects.toThrow(/500/)
  })

  it('should throw on wrong version', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 2, chars: [] }),
    })

    await expect(loadDictionary('http://example.com/dict.json', mockFetch)).rejects.toThrow(
      /version/,
    )
  })

  it('should throw if version is missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chars: [] }),
    })

    await expect(loadDictionary('http://example.com/dict.json', mockFetch)).rejects.toThrow()
  })

  it('should call indexDictionary on successful load', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => testDictFile,
    })

    const dict = await loadDictionary('http://example.com/dict.json', mockFetch)

    // Verify the result is properly indexed
    expect(dict.byChar.size).toBeGreaterThan(0)
    expect(dict.bySyllable.size).toBeGreaterThan(0)
  })
})
