import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'
import CompositionSection from './CompositionSection.svelte'
import { indexDictionary } from '$lib/data/dictionary.js'
import { testDictFile } from '$lib/data/fixtures.js'
import type { CharEntry } from '$lib/data/types.js'

function renderText(entry: CharEntry, dict = indexDictionary(testDictFile)) {
  const { body } = render(CompositionSection, { props: { entry, dict } })
  return {
    raw: body,
    clean: body.replace(/<!--[\s\S]*?-->/g, '').trim(),
  }
}

describe('CompositionSection', () => {
  const dict = indexDictionary(testDictFile)

  it('renders nothing if no parts and no etymology', () => {
    // 人 has radical: '人' (equal to char), components: [], etymology: null
    const entry = dict.byChar.get('人')!
    const { clean } = renderText(entry, dict)
    expect(clean).toBe('')
  })

  it('renders etymology, radical, components, tags for 好', () => {
    const entry = dict.byChar.get('好')!
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('Composition</h2>')
    expect(raw).toContain('Combined meaning — A woman is good')
    expect(raw).toContain('radical')
    expect(raw).toContain('meaning')
    expect(raw).toContain('#/%E5%A5%B3') // href to 女
    expect(raw).toContain('component') // 女 is not in testDictFile, so shows 'component'
  })

  it('renders pictophonetic and pictographic etymology type labels', () => {
    const baseEntry: CharEntry = {
      char: '说',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: null,
      strokeCount: null,
      hasStrokes: false,
      components: ['讠', '兑'],
      hasUnknownComponent: false,
      etymology: { type: 'pictophonetic', hint: 'speech', semantic: '讠', phonetic: '兑' },
    }
    const { raw } = renderText(baseEntry, dict)
    expect(raw).toContain('Sound + meaning — speech')
    expect(raw).toContain('meaning')
    expect(raw).toContain('sound')

    const pictoEntry: CharEntry = {
      ...baseEntry,
      etymology: { type: 'pictographic', hint: 'sun' },
    }
    const { raw: pictoRaw } = renderText(pictoEntry, dict)
    expect(pictoRaw).toContain('Picture — sun')
  })

  it('renders etymology without hint when hint is absent', () => {
    const entry: CharEntry = {
      char: '说',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: null,
      strokeCount: null,
      hasStrokes: false,
      components: [],
      hasUnknownComponent: false,
      etymology: { type: 'pictographic' },
    }
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('Picture')
    expect(raw).not.toContain('Picture —')
  })

  it('deduplicates radical if already in components', () => {
    const entry: CharEntry = {
      char: '学',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: '子',
      strokeCount: null,
      hasStrokes: false,
      components: ['子'],
      hasUnknownComponent: false,
      etymology: null,
    }
    const { raw } = renderText(entry, dict)
    // '子' should appear once as a part card link
    const matches = raw.match(/href="#\/%E5%AD%90"/g)
    expect(matches).toHaveLength(1)
  })

  it('does not add radical if radical equals char', () => {
    const entry: CharEntry = {
      char: '人',
      script: 'ST',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: '人',
      strokeCount: 2,
      hasStrokes: true,
      components: [],
      hasUnknownComponent: false,
      etymology: null,
    }
    const { clean } = renderText(entry, dict)
    expect(clean).toBe('')
  })

  it('displays unknown component note when hasUnknownComponent is true', () => {
    const entry: CharEntry = {
      char: '发',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: null,
      strokeCount: null,
      hasStrokes: false,
      components: ['又'],
      hasUnknownComponent: true,
      etymology: null,
    }
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('Part of this character is unidentified.')
  })

  it('shows pinyin and meaning when component has a dict entry with readings', () => {
    const entry: CharEntry = {
      char: '从',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: null,
      strokeCount: null,
      hasStrokes: false,
      components: ['人'], // 人 is in testDictFile with reading 'rén' and meaning 'person'
      hasUnknownComponent: false,
      etymology: null,
    }
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('rén')
    expect(raw).toContain('person')
  })

  it('uses zh-Hant lang for parts when entry.script is T', () => {
    const entry: CharEntry = {
      char: '說',
      script: 'T',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: '言',
      strokeCount: null,
      hasStrokes: false,
      components: ['兌'],
      hasUnknownComponent: false,
      etymology: null,
    }
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('lang="zh-Hant"')
  })

  it('uses zh-Hans lang for parts when entry.script is S or ST', () => {
    const entry: CharEntry = {
      char: '说',
      script: 'S',
      readings: [],
      freqRank: null,
      hsk: null,
      hskWriteBand: null,
      radical: '讠',
      strokeCount: null,
      hasStrokes: false,
      components: ['兑'],
      hasUnknownComponent: false,
      etymology: null,
    }
    const { raw } = renderText(entry, dict)
    expect(raw).toContain('lang="zh-Hans"')
  })
})
