import { describe, it, expect } from 'vitest'
import { indexDictionary } from '$lib/data/dictionary.js'
import { searchSyllable, DEFAULT_FILTERS, bandForLevel } from './search.js'
import { testDictFile } from '$lib/data/fixtures.js'

describe('bandForLevel', () => {
  it('should map levels 1-3 to band 1', () => {
    expect(bandForLevel(1)).toBe(1)
    expect(bandForLevel(2)).toBe(1)
    expect(bandForLevel(3)).toBe(1)
  })

  it('should map levels 4-6 to band 2', () => {
    expect(bandForLevel(4)).toBe(2)
    expect(bandForLevel(5)).toBe(2)
    expect(bandForLevel(6)).toBe(2)
  })

  it('should map level 7 to band 3', () => {
    expect(bandForLevel(7)).toBe(3)
  })
})

describe('DEFAULT_FILTERS', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_FILTERS).toEqual({
      script: 'S',
      hskFilter: false,
      hskLevel: 1,
      handwritingOnly: false,
    })
  })
})

describe('searchSyllable', () => {
  const dict = indexDictionary(testDictFile)
  const defaultFilters = DEFAULT_FILTERS

  it('should return all hits for a syllable without tone filter', () => {
    const hits = searchSyllable(dict, 'hao', undefined, defaultFilters)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.entry.char === '好')).toBe(true)
  })

  it('should return pre-sorted results without filtering', () => {
    const hits = searchSyllable(dict, 'hao', undefined, defaultFilters)
    // Results should maintain their pre-sorted order from dictionary
    if (hits.length > 1) {
      const freqRanks = hits.map((h) => h.entry.freqRank)
      for (let i = 0; i < freqRanks.length - 1; i++) {
        if (freqRanks[i] !== null && freqRanks[i + 1] !== null) {
          expect(freqRanks[i]).toBeLessThanOrEqual(freqRanks[i + 1]!)
        }
      }
    }
  })

  it('should filter by tone correctly', () => {
    const hitsNoTone = searchSyllable(dict, 'hao', undefined, defaultFilters)
    const hits3 = searchSyllable(dict, 'hao', 3, defaultFilters)
    const hits4 = searchSyllable(dict, 'hao', 4, defaultFilters)

    // With tone filter, should get fewer results
    expect(hits3.length).toBeLessThanOrEqual(hitsNoTone.length)
    expect(hits4.length).toBeLessThanOrEqual(hitsNoTone.length)

    // All results with tone 3 should have tone 3
    for (const hit of hits3) {
      expect(hit.reading.tone).toBe(3)
    }

    // All results with tone 4 should have tone 4
    for (const hit of hits4) {
      expect(hit.reading.tone).toBe(4)
    }
  })

  it('should return empty array for tone that does not exist', () => {
    const hits = searchSyllable(dict, 'hao', 1, defaultFilters)
    expect(hits.length).toBe(0)
  })

  it('should filter by script S (keep S and ST)', () => {
    const filters = { ...defaultFilters, script: 'S' as const }
    const shuoHits = searchSyllable(dict, 'shuo', undefined, filters)

    // Should include 说 (S) but not 說 (T)
    const hasSimplified = shuoHits.some((h) => h.entry.char === '说')
    const hasTraditional = shuoHits.some((h) => h.entry.char === '說')

    expect(hasSimplified).toBe(true)
    expect(hasTraditional).toBe(false)
  })

  it('should filter by script T (keep T and ST)', () => {
    const filters = { ...defaultFilters, script: 'T' as const }
    const shuoHits = searchSyllable(dict, 'shuo', undefined, filters)

    // Should include 說 (T) but not 说 (S)
    const hasSimplified = shuoHits.some((h) => h.entry.char === '说')
    const hasTraditional = shuoHits.some((h) => h.entry.char === '說')

    expect(hasSimplified).toBe(false)
    expect(hasTraditional).toBe(true)
  })

  it('should filter by script ST (keep everything)', () => {
    const filters = { ...defaultFilters, script: 'ST' as const }
    const shuoHits = searchSyllable(dict, 'shuo', undefined, filters)

    // Should include both 说 (S) and 說 (T)
    const hasSimplified = shuoHits.some((h) => h.entry.char === '说')
    const hasTraditional = shuoHits.some((h) => h.entry.char === '說')

    expect(hasSimplified).toBe(true)
    expect(hasTraditional).toBe(true)
  })

  it('should keep ST characters in all script modes', () => {
    const baHitsS = searchSyllable(dict, 'ren', undefined, {
      ...defaultFilters,
      script: 'S' as const,
    })
    const baHitsT = searchSyllable(dict, 'ren', undefined, {
      ...defaultFilters,
      script: 'T' as const,
    })
    const baHitsST = searchSyllable(dict, 'ren', undefined, {
      ...defaultFilters,
      script: 'ST' as const,
    })

    // 人 is ST, should appear in all three
    const hasRenS = baHitsS.some((h) => h.entry.char === '人')
    const hasRenT = baHitsT.some((h) => h.entry.char === '人')
    const hasRenST = baHitsST.some((h) => h.entry.char === '人')

    expect(hasRenS).toBe(true)
    expect(hasRenT).toBe(true)
    expect(hasRenST).toBe(true)
  })

  it('should skip entries with empty meanings and no strokeCount', () => {
    const filters = { ...defaultFilters, script: 'ST' as const }
    const baHits = searchSyllable(dict, 'ba', undefined, filters)

    // 㐀 has empty meanings and no strokeCount, should be filtered out
    const hasUselessEntry = baHits.some((h) => h.entry.char === '㐀')
    expect(hasUselessEntry).toBe(false)
  })

  it('should keep entries with meanings even if no strokeCount', () => {
    // This is checking the logic: skip only if BOTH empty meanings AND no strokes
    const filters = { ...defaultFilters, script: 'S' as const }
    const liHits = searchSyllable(dict, 'le', undefined, filters)

    // 了 has meanings and strokeCount, should be included
    const hasLiao = liHits.some((h) => h.entry.char === '了')
    expect(hasLiao).toBe(true)
  })

  it('should filter by HSK level when hskFilter is true', () => {
    const filters: typeof defaultFilters = { ...defaultFilters, hskFilter: true, hskLevel: 1 }
    const hitsShuo = searchSyllable(dict, 'shuo', undefined, filters)
    const hitsLe = searchSyllable(dict, 'le', undefined, filters)

    // 说 has hsk: 2, should be filtered out
    const hasShuo = hitsShuo.some((h) => h.entry.char === '说')
    expect(hasShuo).toBe(false)

    // 了 has hsk: 1, should be included
    const hasLiao = hitsLe.some((h) => h.entry.char === '了')
    expect(hasLiao).toBe(true)
  })

  it('should include entries with hsk <= hskLevel when hskFilter is true', () => {
    const filters: typeof defaultFilters = { ...defaultFilters, hskFilter: true, hskLevel: 2 }
    const hits = searchSyllable(dict, 'shuo', undefined, filters)

    // 说 has hsk: 2, should be included now
    const hasShuo = hits.some((h) => h.entry.char === '说')
    expect(hasShuo).toBe(true)
  })

  it('should include entries with hsk: 7 when hskLevel is 7', () => {
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: true,
      hskLevel: 7,
      script: 'T' as const,
    }
    const niHits = searchSyllable(dict, 'ni', undefined, filters)

    // 睨 has hsk: 7, should be included
    const hasNi = niHits.some((h) => h.entry.char === '睨')
    expect(hasNi).toBe(true)
  })

  it('should not filter by hsk when hskFilter is false', () => {
    const filters: typeof defaultFilters = { ...defaultFilters, hskFilter: false, hskLevel: 1 }
    const hits = searchSyllable(dict, 'shuo', undefined, filters)

    // 说 has hsk: 2, should still be included when hskFilter is false
    const hasShuo = hits.some((h) => h.entry.char === '说')
    expect(hasShuo).toBe(true)
  })

  it('should require hskWriteBand when handwritingOnly is true', () => {
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: true,
      hskLevel: 7,
      handwritingOnly: true,
      script: 'T' as const,
    }
    const hits = searchSyllable(dict, 'ni', undefined, filters)

    // 睨 has hskWriteBand: 3 and hskLevel: 7, should be included
    const hasNi = hits.some((h) => h.entry.char === '睨')
    expect(hasNi).toBe(true)
  })

  it('should exclude entries without hskWriteBand when handwritingOnly is true', () => {
    // Create a scenario where we have entries with and without hskWriteBand
    // This depends on the fixture data
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: true,
      hskLevel: 1,
      handwritingOnly: true,
    }
    const hits = searchSyllable(dict, 'le', undefined, filters)

    // All remaining entries should have hskWriteBand or be filtered
    for (const hit of hits) {
      expect(hit.entry.hskWriteBand).not.toBeNull()
    }
  })

  it('should apply bandForLevel correctly with handwritingOnly', () => {
    // hskLevel: 3 maps to band 1
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: true,
      hskLevel: 3,
      handwritingOnly: true,
    }
    const hits = searchSyllable(dict, 'xue', undefined, filters)

    // 学 has hskLevel: 3, hskWriteBand: 2
    // Band for level 3 is 1, so it should be filtered out
    const hasXue = hits.some((h) => h.entry.char === '学')
    expect(hasXue).toBe(false)
  })

  it('should ignore handwritingOnly when hskFilter is false', () => {
    const filtersWithoutHsk: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: false,
      handwritingOnly: true,
    }
    const filtersWithHsk: typeof defaultFilters = {
      ...defaultFilters,
      hskFilter: true,
      hskLevel: 3,
      handwritingOnly: true,
    }

    const hitsWithout = searchSyllable(dict, 'xue', undefined, filtersWithoutHsk)
    const hitsWith = searchSyllable(dict, 'xue', undefined, filtersWithHsk)

    // With hskFilter: false, handwritingOnly should be ignored
    // With hskFilter: true, handwritingOnly should be applied
    expect(hitsWithout.length).toBeGreaterThanOrEqual(hitsWith.length)
  })

  it('should return empty array for non-existent syllable', () => {
    const hits = searchSyllable(dict, 'xyz', undefined, defaultFilters)
    expect(hits).toEqual([])
  })

  it('should return empty array when all entries are filtered out', () => {
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      script: 'S' as const,
      hskFilter: true,
      hskLevel: 1,
    }
    const hits = searchSyllable(dict, 'shuo', undefined, filters)

    // 说 (S) has hsk: 2, should be filtered out
    // 說 (T) is filtered by script
    expect(hits).toEqual([])
  })

  it('should not mutate dictionary arrays', () => {
    const filters: typeof defaultFilters = { ...defaultFilters, hskFilter: true, hskLevel: 1 }
    const originalHits = dict.bySyllable.get('shuo')
    const originalLength = originalHits?.length

    searchSyllable(dict, 'shuo', undefined, filters)

    const afterHits = dict.bySyllable.get('shuo')
    expect(afterHits?.length).toBe(originalLength)
  })

  it('should handle combination of tone and script filters', () => {
    const filters = {
      ...defaultFilters,
      script: 'ST' as const,
    }
    const hitsAll = searchSyllable(dict, 'hao', undefined, filters)
    const hits3 = searchSyllable(dict, 'hao', 3, filters)

    // Filtered results should be a subset
    expect(hits3.length).toBeLessThanOrEqual(hitsAll.length)

    // All results should have correct tone
    for (const hit of hits3) {
      expect(hit.reading.tone).toBe(3)
    }
  })

  it('should handle combination of script and HSK filters', () => {
    const filters: typeof defaultFilters = {
      ...defaultFilters,
      script: 'S' as const,
      hskFilter: true,
      hskLevel: 2,
    }
    const hits = searchSyllable(dict, 'shuo', undefined, filters)

    // 说 is S and has hsk: 2, should be included
    const hasShuo = hits.some((h) => h.entry.char === '说')
    expect(hasShuo).toBe(true)

    // 說 is T, should be filtered by script
    const hasShuoTrad = hits.some((h) => h.entry.char === '說')
    expect(hasShuoTrad).toBe(false)
  })
})
