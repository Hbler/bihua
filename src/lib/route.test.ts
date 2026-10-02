import { describe, expect, it } from 'vitest'

import { characterHref, parseHash, searchHref } from './route.js'

describe('parseHash', () => {
  it('routes empty and root hashes to an empty search', () => {
    expect(parseHash('')).toEqual({ name: 'search', query: '' })
    expect(parseHash('#/')).toEqual({ name: 'search', query: '' })
  })

  it('routes a single Han character to its page, raw or URL-encoded', () => {
    expect(parseHash('#/睨')).toEqual({ name: 'character', char: '睨' })
    expect(parseHash(`#/${encodeURIComponent('說')}`)).toEqual({ name: 'character', char: '說' })
  })

  it('routes searches and about', () => {
    expect(parseHash('#/search/shi4')).toEqual({ name: 'search', query: 'shi4' })
    expect(parseHash(`#/search/${encodeURIComponent('shì')}`)).toEqual({
      name: 'search',
      query: 'shì',
    })
    expect(parseHash('#/about')).toEqual({ name: 'about' })
  })

  it('treats anything else as a search, including malformed escapes', () => {
    expect(parseHash('#/你好')).toEqual({ name: 'search', query: '你好' })
    expect(parseHash('#/%E4')).toEqual({ name: 'search', query: '%E4' })
  })

  it('round-trips hrefs', () => {
    expect(parseHash(characterHref('睨'))).toEqual({ name: 'character', char: '睨' })
    expect(parseHash(searchHref('lǜ'))).toEqual({ name: 'search', query: 'lǜ' })
    expect(searchHref('')).toBe('#/')
  })
})
