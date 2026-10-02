import { describe, it, expect } from 'vitest'
import { SYLLABLES } from './syllables'

describe('SYLLABLES', () => {
  it('should be a ReadonlySet', () => {
    expect(SYLLABLES).toBeInstanceOf(Set)
  })

  it('should have between 400 and 430 entries', () => {
    expect(SYLLABLES.size).toBeGreaterThanOrEqual(400)
    expect(SYLLABLES.size).toBeLessThanOrEqual(430)
  })

  it('should include standard pinyin syllables', () => {
    const expected = ['shi', 'hao', 'gou', 'gui', 'liu', 'ma', 'er']
    expected.forEach((syl) => {
      expect(SYLLABLES.has(syl)).toBe(true)
    })
  })

  it('should include ü represented as v', () => {
    const expected = ['lv', 'lve', 'nv', 'nve']
    expected.forEach((syl) => {
      expect(SYLLABLES.has(syl)).toBe(true)
    })
  })

  it('should include r and neutral tone syllables', () => {
    const expected = ['r', 'er']
    expected.forEach((syl) => {
      expect(SYLLABLES.has(syl)).toBe(true)
    })
  })

  it('should include syllabic consonants', () => {
    const expected = ['m', 'n', 'ng', 'hm', 'hng']
    expected.forEach((syl) => {
      expect(SYLLABLES.has(syl)).toBe(true)
    })
  })

  it('should include interjection syllables', () => {
    const expected = [
      'yo',
      'lo',
      'o',
      'ei',
      'dia',
      'den',
      'nou',
      'zhei',
      'shei',
      'cei',
      'fiao',
      'kei',
      'sei',
      'tei',
      'lun',
    ]
    expected.forEach((syl) => {
      expect(SYLLABLES.has(syl)).toBe(true)
    })
  })

  it('should include zhuang', () => {
    expect(SYLLABLES.has('zhuang')).toBe(true)
  })

  it('should not include lue (should be lve)', () => {
    expect(SYLLABLES.has('lue')).toBe(false)
  })

  it('should not include shei spelled as original ê', () => {
    // ê is skipped as per spec, shei is the interjection that's included
    expect(SYLLABLES.has('shei')).toBe(true)
  })
})
