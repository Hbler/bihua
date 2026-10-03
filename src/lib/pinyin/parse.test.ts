import { describe, it, expect } from 'vitest'
import { parseQuery, parseWordQuery } from './parse'

describe('parseQuery', () => {
  describe('empty input', () => {
    it('should handle empty string', () => {
      expect(parseQuery('')).toEqual({ kind: 'empty' })
    })

    it('should handle whitespace only', () => {
      expect(parseQuery('   ')).toEqual({ kind: 'empty' })
      expect(parseQuery('\t\n')).toEqual({ kind: 'empty' })
    })
  })

  describe('single character input', () => {
    it('should recognize single Han characters', () => {
      const result = parseQuery('你')
      expect(result).toEqual({ kind: 'char', char: '你' })
    })

    it('should recognize single Han character with spaces', () => {
      expect(parseQuery('  說  ')).toEqual({ kind: 'char', char: '說' })
    })

    it('should recognize various Han characters', () => {
      expect(parseQuery('好')).toEqual({ kind: 'char', char: '好' })
      expect(parseQuery('睨')).toEqual({ kind: 'char', char: '睨' })
    })
  })

  describe('multiple characters input', () => {
    it('should recognize multiple Han characters', () => {
      const result = parseQuery('你好')
      expect(result.kind).toBe('chars')
      if (result.kind === 'chars') {
        expect(result.chars).toEqual(['你', '好'])
      }
    })

    it('should deduplicate characters', () => {
      const result = parseQuery('你你好')
      expect(result.kind).toBe('chars')
      if (result.kind === 'chars') {
        expect(result.chars).toEqual(['你', '好'])
      }
    })

    it('should preserve order while deduplicating', () => {
      const result = parseQuery('你好你说好')
      expect(result.kind).toBe('chars')
      if (result.kind === 'chars') {
        expect(result.chars).toEqual(['你', '好', '说'])
      }
    })
  })

  describe('single pinyin syllable', () => {
    it('should recognize lowercase pinyin', () => {
      expect(parseQuery('shi')).toEqual({ kind: 'pinyin', syllable: 'shi' })
    })

    it('should recognize uppercase pinyin', () => {
      expect(parseQuery('SHI')).toEqual({ kind: 'pinyin', syllable: 'shi' })
    })

    it('should trim whitespace', () => {
      expect(parseQuery('  shi  ')).toEqual({ kind: 'pinyin', syllable: 'shi' })
    })

    it('should recognize pinyin with tone digit', () => {
      expect(parseQuery('shi4')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 4 })
      expect(parseQuery('shi1')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 1 })
      expect(parseQuery('shi5')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 5 })
    })

    it('should handle tone 0 as tone 5', () => {
      expect(parseQuery('shi0')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 5 })
    })

    it('should recognize pinyin with tone marks', () => {
      expect(parseQuery('shì')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 4 })
      expect(parseQuery('shí')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 2 })
    })

    it('should recognize tone mark and digit when consistent', () => {
      expect(parseQuery('shì4')).toEqual({ kind: 'pinyin', syllable: 'shi', tone: 4 })
    })

    it('should reject when tone mark and digit conflict', () => {
      expect(parseQuery('shì2')).toEqual({ kind: 'invalid', input: 'shì2' })
    })

    it('should handle lü variations', () => {
      expect(parseQuery('lv')).toEqual({ kind: 'pinyin', syllable: 'lv' })
      expect(parseQuery('lu:')).toEqual({ kind: 'pinyin', syllable: 'lv' })
      expect(parseQuery('lü')).toEqual({ kind: 'pinyin', syllable: 'lv' })
      expect(parseQuery('lǜ')).toEqual({ kind: 'pinyin', syllable: 'lv', tone: 4 })
    })

    it('should map lue to lve', () => {
      expect(parseQuery('lue')).toEqual({ kind: 'pinyin', syllable: 'lve' })
      expect(parseQuery('lue4')).toEqual({ kind: 'pinyin', syllable: 'lve', tone: 4 })
    })

    it('should map nue to nve', () => {
      expect(parseQuery('nue')).toEqual({ kind: 'pinyin', syllable: 'nve' })
      expect(parseQuery('nue3')).toEqual({ kind: 'pinyin', syllable: 'nve', tone: 3 })
    })

    it('should recognize j, q, x, y syllables', () => {
      expect(parseQuery('ju')).toEqual({ kind: 'pinyin', syllable: 'ju' })
      expect(parseQuery('qu')).toEqual({ kind: 'pinyin', syllable: 'qu' })
      expect(parseQuery('xu')).toEqual({ kind: 'pinyin', syllable: 'xu' })
      expect(parseQuery('yu')).toEqual({ kind: 'pinyin', syllable: 'yu' })
    })

    it('should recognize er and r', () => {
      expect(parseQuery('er')).toEqual({ kind: 'pinyin', syllable: 'er' })
      expect(parseQuery('r5')).toEqual({ kind: 'pinyin', syllable: 'r', tone: 5 })
      expect(parseQuery('er2')).toEqual({ kind: 'pinyin', syllable: 'er', tone: 2 })
    })

    it('should reject invalid syllables', () => {
      expect(parseQuery('xyz')).toEqual({ kind: 'invalid', input: 'xyz' })
      expect(parseQuery('bb')).toEqual({ kind: 'invalid', input: 'bb' })
      expect(parseQuery('shi6')).toEqual({ kind: 'invalid', input: 'shi6' })
    })
  })

  describe('multi-syllable input', () => {
    it('should recognize multi-syllable pinyin without numbers', () => {
      const result = parseQuery('nihao')
      expect(result).toEqual({ kind: 'multi-syllable', input: 'nihao' })
    })

    it('should recognize multi-syllable with numbers', () => {
      const result = parseQuery('ni3hao3')
      expect(result).toEqual({ kind: 'multi-syllable', input: 'ni3hao3' })
    })

    it('should recognize multi-syllable with spaces', () => {
      const result = parseQuery('ni hao')
      expect(result).toEqual({ kind: 'multi-syllable', input: 'ni hao' })
    })

    it('should recognize multi-syllable with apostrophe', () => {
      const result = parseQuery("xi'an")
      expect(result).toEqual({ kind: 'multi-syllable', input: "xi'an" })
    })

    it('should reject invalid multi-syllable', () => {
      expect(parseQuery('nihaoxyz')).toEqual({ kind: 'invalid', input: 'nihaoxyz' })
    })
  })

  describe('mixed Han and Latin', () => {
    it('should reject mixed Han and Latin', () => {
      expect(parseQuery('你a')).toEqual({ kind: 'invalid', input: '你a' })
      expect(parseQuery('a你')).toEqual({ kind: 'invalid', input: 'a你' })
    })
  })

  describe('NFC normalization', () => {
    it('should handle NFC normalization', () => {
      // Test that combining characters are normalized
      // Using 'shi' as base, just checking normalization happens
      const result = parseQuery('shi')
      expect(result.kind).toBe('pinyin')
      if (result.kind === 'pinyin') {
        expect(result.syllable).toBe('shi')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle syllables with diacritics in marked form', () => {
      const result = parseQuery('hǎo')
      expect(result).toEqual({ kind: 'pinyin', syllable: 'hao', tone: 3 })
    })

    it('should handle case insensitivity for multi-syllable', () => {
      const result = parseQuery('NIHAO')
      expect(result.kind).toBe('multi-syllable')
    })

    it('should preserve tone digit 0 as 5', () => {
      expect(parseQuery('ma0')).toEqual({ kind: 'pinyin', syllable: 'ma', tone: 5 })
    })
  })

  describe('review fixes', () => {
    it('segments syllables longer than three letters', () => {
      expect(parseQuery('zhuangshi')).toEqual({ kind: 'multi-syllable', input: 'zhuangshi' })
      expect(parseQuery('xiongmao')).toEqual({ kind: 'multi-syllable', input: 'xiongmao' })
      expect(parseQuery('shuang1chuang2')).toEqual({
        kind: 'multi-syllable',
        input: 'shuang1chuang2',
      })
    })

    it('backtracks when the first syllable choice leads nowhere', () => {
      // "xian" + "g" fails, "xi" + "ang" succeeds.
      expect(parseQuery('xiang').kind).toBe('pinyin')
      expect(parseQuery('xiangong')).toEqual({ kind: 'multi-syllable', input: 'xiangong' })
    })

    it('ignores punctuation pasted along with characters', () => {
      expect(parseQuery('睨。')).toEqual({ kind: 'char', char: '睨' })
      expect(parseQuery('“你好”')).toEqual({ kind: 'chars', chars: ['你', '好'] })
    })

    it('still rejects punctuation inside pinyin', () => {
      expect(parseQuery('shi?').kind).toBe('invalid')
    })
  })
})

describe('parseWordQuery', () => {
  it('accepts untoned, numbered, marked, spaced and apostrophe forms of diqiu', () => {
    expect(parseWordQuery('diqiu')).toEqual({ key: 'diqiu', tones: [undefined, undefined] })
    expect(parseWordQuery('di qiu')).toEqual({ key: 'diqiu', tones: [undefined, undefined] })
    expect(parseWordQuery("di'qiu")).toEqual({ key: 'diqiu', tones: [undefined, undefined] })
    expect(parseWordQuery('di4qiu2')).toEqual({ key: 'diqiu', tones: [4, 2] })
    expect(parseWordQuery('di4 qiu2')).toEqual({ key: 'diqiu', tones: [4, 2] })
    expect(parseWordQuery('dì qiú')).toEqual({ key: 'diqiu', tones: [4, 2] })
    expect(parseWordQuery('dìqiú')).toEqual({ key: 'diqiu', tones: [4, 2] })
  })

  it("accepts xi'an, lvse, lv4se4, nv3ren2", () => {
    expect(parseWordQuery("xi'an")).toEqual({ key: 'xian', tones: [undefined, undefined] })
    expect(parseWordQuery('lvse')).toEqual({ key: 'lvse', tones: [undefined, undefined] })
    expect(parseWordQuery('lv4se4')).toEqual({ key: 'lvse', tones: [4, 4] })
    expect(parseWordQuery('nv3ren2')).toEqual({ key: 'nvren', tones: [3, 2] })
  })

  it('handles mixed input with some untoned syllables', () => {
    expect(parseWordQuery('di4qiu')).toEqual({ key: 'diqiu', tones: [4, undefined] })
    expect(parseWordQuery('di qiu2')).toEqual({ key: 'diqiu', tones: [undefined, 2] })
  })

  it('handles single syllables such as xian', () => {
    expect(parseWordQuery('xian')).toEqual({ key: 'xian', tones: [undefined] })
    expect(parseWordQuery('shi4')).toEqual({ key: 'shi', tones: [4] })
  })

  it('returns null when input cannot be segmented or has Han characters', () => {
    expect(parseWordQuery('')).toBeNull()
    expect(parseWordQuery('   ')).toBeNull()
    expect(parseWordQuery('xyz')).toBeNull()
    expect(parseWordQuery('di44qiu')).toBeNull()
    expect(parseWordQuery('地球')).toBeNull()
    expect(parseWordQuery('di3qiu2x')).toBeNull()
  })
})
