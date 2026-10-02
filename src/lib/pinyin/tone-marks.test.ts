import { describe, it, expect } from 'vitest'
import { numberedToMarks, parseNumberedSyllable, stripToneMarks } from './tone-marks'

describe('numberedToMarks', () => {
  it('should mark ü correctly with tone', () => {
    expect(numberedToMarks('lv', 4)).toBe('lǜ')
    expect(numberedToMarks('nv', 3)).toBe('nǚ')
  })

  it('should mark a when present', () => {
    expect(numberedToMarks('hao', 3)).toBe('hǎo')
    expect(numberedToMarks('ma', 1)).toBe('mā')
  })

  it('should mark e when present (and no a)', () => {
    expect(numberedToMarks('ben', 3)).toBe('běn')
    expect(numberedToMarks('mei', 3)).toBe('měi')
  })

  it('should mark o in ou combination', () => {
    expect(numberedToMarks('gou', 3)).toBe('gǒu')
    expect(numberedToMarks('zou', 3)).toBe('zǒu')
  })

  it('should mark last vowel when a and e not present', () => {
    expect(numberedToMarks('gui', 4)).toBe('guì')
    expect(numberedToMarks('liu', 2)).toBe('liú')
    expect(numberedToMarks('xue', 2)).toBe('xué')
  })

  it('should handle lve correctly', () => {
    expect(numberedToMarks('lve', 4)).toBe('lüè')
    expect(numberedToMarks('nve', 3)).toBe('nüě')
  })

  it('should not mark tone 5 (neutral tone)', () => {
    expect(numberedToMarks('ma', 5)).toBe('ma')
    expect(numberedToMarks('de', 5)).toBe('de')
  })

  it('should handle er', () => {
    expect(numberedToMarks('er', 2)).toBe('ér')
    expect(numberedToMarks('er', 4)).toBe('èr')
    expect(numberedToMarks('er', 5)).toBe('er')
  })

  it('should return r unmarked for r5', () => {
    expect(numberedToMarks('r', 5)).toBe('r')
  })

  it('should mark r with other tones', () => {
    expect(numberedToMarks('r', 2)).toBe('r') // or ŕ optionally
  })

  it('should handle all tone numbers 1-5', () => {
    expect(numberedToMarks('shi', 1)).toBe('shī')
    expect(numberedToMarks('shi', 2)).toBe('shí')
    expect(numberedToMarks('shi', 3)).toBe('shǐ')
    expect(numberedToMarks('shi', 4)).toBe('shì')
    expect(numberedToMarks('shi', 5)).toBe('shi')
  })

  it('should display v as ü in output', () => {
    const result = numberedToMarks('lv', 3)
    // Result should be lǚ (ü with tone mark), not contain 'v'
    expect(result).not.toContain('v')
    // Should contain either ü or a marked ü variant
    expect(/[üǖǘǚǜ]/.test(result)).toBe(true)
  })
})

describe('parseNumberedSyllable', () => {
  it('should parse standard numbered syllables', () => {
    expect(parseNumberedSyllable('shuo1')).toEqual({ syllable: 'shuo', tone: 1 })
    expect(parseNumberedSyllable('ma5')).toEqual({ syllable: 'ma', tone: 5 })
    expect(parseNumberedSyllable('er2')).toEqual({ syllable: 'er', tone: 2 })
  })

  it('should handle u: notation', () => {
    expect(parseNumberedSyllable('lu:4')).toEqual({ syllable: 'lv', tone: 4 })
    expect(parseNumberedSyllable('nü:3')).toEqual({ syllable: 'nv', tone: 3 })
  })

  it('should lowercase uppercase input', () => {
    expect(parseNumberedSyllable('Zhang1')).toEqual({ syllable: 'zhang', tone: 1 })
    expect(parseNumberedSyllable('SHI4')).toEqual({ syllable: 'shi', tone: 4 })
  })

  it('should handle r5', () => {
    expect(parseNumberedSyllable('r5')).toEqual({ syllable: 'r', tone: 5 })
  })

  it('should return null for invalid syllables', () => {
    expect(parseNumberedSyllable('xx5')).toBeNull()
    expect(parseNumberedSyllable('invalid9')).toBeNull()
  })

  it('should return null for missing tone digit', () => {
    expect(parseNumberedSyllable('shi')).toBeNull()
  })

  it('should return null for invalid tone numbers', () => {
    expect(parseNumberedSyllable('shi6')).toBeNull()
    expect(parseNumberedSyllable('shi9')).toBeNull()
  })
})

describe('stripToneMarks', () => {
  it('should remove tone marks and return tone', () => {
    expect(stripToneMarks('shì')).toEqual({ text: 'shi', tone: 4 })
    expect(stripToneMarks('shí')).toEqual({ text: 'shi', tone: 2 })
    expect(stripToneMarks('shǐ')).toEqual({ text: 'shi', tone: 3 })
    expect(stripToneMarks('shī')).toEqual({ text: 'shi', tone: 1 })
  })

  it('should handle ü with tone marks', () => {
    expect(stripToneMarks('lǜ')).toEqual({ text: 'lv', tone: 4 })
    expect(stripToneMarks('lǘ')).toEqual({ text: 'lv', tone: 2 })
    expect(stripToneMarks('lǚ')).toEqual({ text: 'lv', tone: 3 })
    expect(stripToneMarks('lǖ')).toEqual({ text: 'lv', tone: 1 })
  })

  it('should handle unmarked ü', () => {
    expect(stripToneMarks('lü')).toEqual({ text: 'lv' })
  })

  it('should return no tone for unmarked syllables', () => {
    expect(stripToneMarks('shi')).toEqual({ text: 'shi' })
    expect(stripToneMarks('lv')).toEqual({ text: 'lv' })
  })

  it('should handle compound vowel marks', () => {
    expect(stripToneMarks('hǎo')).toEqual({ text: 'hao', tone: 3 })
    expect(stripToneMarks('zǒu')).toEqual({ text: 'zou', tone: 3 })
  })

  it('should handle other marked vowels', () => {
    expect(stripToneMarks('běn')).toEqual({ text: 'ben', tone: 3 })
    expect(stripToneMarks('méi')).toEqual({ text: 'mei', tone: 2 })
    expect(stripToneMarks('guì')).toEqual({ text: 'gui', tone: 4 })
  })

  it('should identify all tone marks', () => {
    // Test various vowel + tone combinations
    expect(stripToneMarks('á')).toEqual({ text: 'a', tone: 2 })
    expect(stripToneMarks('è')).toEqual({ text: 'e', tone: 4 })
    expect(stripToneMarks('ǒ')).toEqual({ text: 'o', tone: 3 })
    expect(stripToneMarks('ú')).toEqual({ text: 'u', tone: 2 })
  })
})
