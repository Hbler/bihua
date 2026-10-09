import { describe, expect, it } from 'vitest'

import { clipKeyFromFileName } from './audio-names.ts'

describe('clipKeyFromFileName', () => {
  it('extracts standard syllable keys with tones 1-4', () => {
    expect(clipKeyFromFileName('cmn-shuo1.mp3')).toBe('shuo1')
  })

  it('strips leading underscore for interjections', () => {
    expect(clipKeyFromFileName('cmn-_hm1.mp3')).toBe('hm1')
  })

  it('rewrites ü after j/q/x/y from v to u', () => {
    expect(clipKeyFromFileName('cmn-jv4.mp3')).toBe('ju4')
    expect(clipKeyFromFileName('cmn-qv2.mp3')).toBe('qu2')
  })

  it('keeps v after l and n', () => {
    expect(clipKeyFromFileName('cmn-lv4.mp3')).toBe('lv4')
    expect(clipKeyFromFileName('cmn-nv3.mp3')).toBe('nv3')
    expect(clipKeyFromFileName('cmn-nve4.mp3')).toBe('nve4')
  })

  it('skips tone 5 by returning null', () => {
    expect(clipKeyFromFileName('cmn-a5.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-de5.mp3')).toBeNull()
  })

  it('returns null for unrelated file names', () => {
    expect(clipKeyFromFileName('README.txt')).toBeNull()
    expect(clipKeyFromFileName('audio.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-')).toBeNull()
    expect(clipKeyFromFileName('')).toBeNull()
  })

  it('returns null for names containing uppercase characters', () => {
    expect(clipKeyFromFileName('cmn-SHUO1.mp3')).toBeNull()
    expect(clipKeyFromFileName('CMN-shuo1.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-Shuo1.mp3')).toBeNull()
  })

  it('returns null for names without valid tones 1-5 or invalid syllable shapes', () => {
    expect(clipKeyFromFileName('cmn-shuo.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-shuo6.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-shuo0.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-123.mp3')).toBeNull()
    expect(clipKeyFromFileName('cmn-_5.mp3')).toBeNull()
  })
})
