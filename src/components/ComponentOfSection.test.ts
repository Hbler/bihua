import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'

import realDictJson from '../../public/data/dict.json'
import { indexDictionary, type Dictionary } from '$lib/data/dictionary.js'
import type { CharEntry, DictionaryFile } from '$lib/data/types.js'
import ComponentOfSection from './ComponentOfSection.svelte'

function renderText(
  char: string,
  entry: CharEntry | undefined,
  dict: Dictionary,
  pageSize?: number,
) {
  const { body } = render(ComponentOfSection, { props: { char, entry, dict, pageSize } })
  return {
    raw: body,
    clean: body.replace(/<!--[\s\S]*?-->/g, '').trim(),
  }
}

describe('ComponentOfSection', () => {
  const dict = indexDictionary(realDictJson as unknown as DictionaryFile)

  it('renders heading count, 12 cards, and Show more for a part with more than 12 containers', () => {
    const entry = dict.byChar.get('讠')
    const { raw } = renderText('讠', entry, dict)

    expect(raw).toContain('Component of 147 characters</h2>')

    const cardMatches = raw.match(/class="card\b/g)
    expect(cardMatches).toHaveLength(12)

    expect(raw).toContain('Show more')

    // Show more reveals more cards when pageSize is increased
    const { raw: rawMore } = renderText('讠', entry, dict, 24)
    const cardMatchesMore = rawMore.match(/class="card\b/g)
    expect(cardMatchesMore).toHaveLength(24)
  })

  it('renders nothing for a part with no containers', () => {
    const entry = dict.byChar.get('〇')
    const { clean } = renderText('〇', entry, dict)
    expect(clean).toBe('')

    const { clean: cleanMissing } = renderText('xyz', undefined, dict)
    expect(cleanMissing).toBe('')
  })

  it('uses singular "character" and omits Show more when container count is 1', () => {
    const entry = dict.byChar.get('兮')
    const { raw } = renderText('兮', entry, dict)

    expect(raw).toContain('Component of 1 character</h2>')
    expect(raw).not.toContain('characters')

    const cardMatches = raw.match(/class="card\b/g)
    expect(cardMatches).toHaveLength(1)

    expect(raw).not.toContain('Show more')
  })

  it('renders card content with link, pinyin, meaning, and tags', () => {
    const entry = dict.byChar.get('讠')
    const { raw } = renderText('讠', entry, dict)

    // 说 is one of 讠's containers
    expect(raw).toContain('#/%E8%AF%B4') // href for 说
    expect(raw).toContain('shuō')
    expect(raw).toContain('to speak')
    expect(raw).toContain('meaning')
    expect(raw).toContain('radical')
  })
})
