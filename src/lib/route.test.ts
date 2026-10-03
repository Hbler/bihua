import { describe, expect, it } from 'vitest'

import { characterHref, englishSearchHref, modeForRoute, parseHash, searchHref } from './route.js'

describe('parseHash', () => {
  it('routes empty and root hashes to an empty search with explicit=false', () => {
    expect(parseHash('')).toEqual({ name: 'search', query: '', explicit: false })
    expect(parseHash('#/')).toEqual({ name: 'search', query: '', explicit: false })
  })

  it('sets explicit flag correctly for bare vs explicit search hashes', () => {
    expect(parseHash('#/')).toEqual({ name: 'search', query: '', explicit: false })
    expect(parseHash('#/shi')).toEqual({ name: 'search', query: 'shi', explicit: false })
    expect(parseHash('#/search/shi')).toEqual({ name: 'search', query: 'shi', explicit: true })
  })

  it('routes a single Han character to its page, raw or URL-encoded', () => {
    expect(parseHash('#/睨')).toEqual({ name: 'character', char: '睨' })
    expect(parseHash(`#/${encodeURIComponent('說')}`)).toEqual({ name: 'character', char: '說' })
  })

  it('handles character links and user search for single characters', () => {
    // Character link (#/睨) routes to character page
    expect(parseHash('#/睨')).toEqual({ name: 'character', char: '睨' })
    // Explicit search path (#/search/睨) routes to search route with explicit=true (user typing)
    expect(parseHash('#/search/睨')).toEqual({ name: 'search', query: '睨', explicit: true })
  })

  it('routes searches and about', () => {
    expect(parseHash('#/search/shi4')).toEqual({ name: 'search', query: 'shi4', explicit: true })
    expect(parseHash(`#/search/${encodeURIComponent('shì')}`)).toEqual({
      name: 'search',
      query: 'shì',
      explicit: true,
    })
    expect(parseHash('#/about')).toEqual({ name: 'about' })
  })

  it('routes English searches', () => {
    expect(parseHash('#/en')).toEqual({ name: 'english-search', query: '' })
    expect(parseHash('#/en/')).toEqual({ name: 'english-search', query: '' })
    expect(parseHash('#/en/earth')).toEqual({ name: 'english-search', query: 'earth' })
    expect(parseHash(`#/en/${encodeURIComponent('to eat')}`)).toEqual({
      name: 'english-search',
      query: 'to eat',
    })
  })

  it('treats anything else as a search with explicit=false, including malformed escapes', () => {
    expect(parseHash('#/你好')).toEqual({ name: 'search', query: '你好', explicit: false })
    expect(parseHash('#/%E4')).toEqual({ name: 'search', query: '%E4', explicit: false })
  })

  it('round-trips hrefs', () => {
    expect(parseHash(characterHref('睨'))).toEqual({ name: 'character', char: '睨' })
    expect(parseHash(searchHref('lǜ'))).toEqual({ name: 'search', query: 'lǜ', explicit: true })
    expect(parseHash(searchHref(''))).toEqual({ name: 'search', query: '', explicit: false })
    expect(searchHref('')).toBe('#/')
    expect(searchHref('lǜ')).toBe(`#/search/${encodeURIComponent('lǜ')}`)
    expect(searchHref('earth', 'english')).toBe('#/en/earth')
    expect(searchHref('', 'english')).toBe('#/en')
    expect(parseHash(englishSearchHref('earth'))).toEqual({
      name: 'english-search',
      query: 'earth',
    })
    expect(parseHash(englishSearchHref(''))).toEqual({
      name: 'english-search',
      query: '',
    })
  })
})

describe('searchHref', () => {
  it('formats pinyin search href as #/search/<q> or #/', () => {
    expect(searchHref('shi')).toBe('#/search/shi')
    expect(searchHref('')).toBe('#/')
    expect(searchHref('   ')).toBe('#/')
  })

  it('formats english search href as #/en/<q> or #/en', () => {
    expect(searchHref('earth', 'english')).toBe('#/en/earth')
    expect(searchHref('', 'english')).toBe('#/en')
  })

  it('round-trips correctly through parseHash', () => {
    expect(parseHash(searchHref('shi'))).toEqual({ name: 'search', query: 'shi', explicit: true })
    expect(parseHash(searchHref(''))).toEqual({ name: 'search', query: '', explicit: false })
    expect(parseHash(searchHref('earth', 'english'))).toEqual({
      name: 'english-search',
      query: 'earth',
    })
    expect(parseHash(searchHref('', 'english'))).toEqual({
      name: 'english-search',
      query: '',
    })
  })
})

describe('modeForRoute', () => {
  it('returns english if route.name is english-search', () => {
    expect(modeForRoute({ name: 'english-search', query: 'earth' }, 'pinyin')).toBe('english')
    expect(modeForRoute({ name: 'english-search', query: '' }, 'pinyin')).toBe('english')
    expect(modeForRoute({ name: 'english-search', query: 'earth' }, 'english')).toBe('english')
  })

  it('returns pinyin if route.name is search and explicit is true', () => {
    expect(modeForRoute({ name: 'search', query: 'shi', explicit: true }, 'english')).toBe('pinyin')
    expect(modeForRoute({ name: 'search', query: 'shi', explicit: true }, 'pinyin')).toBe('pinyin')
    expect(modeForRoute({ name: 'search', query: '', explicit: true }, 'english')).toBe('pinyin')
  })

  it('returns remembered mode if route.name is search and explicit is false', () => {
    expect(modeForRoute({ name: 'search', query: '', explicit: false }, 'english')).toBe('english')
    expect(modeForRoute({ name: 'search', query: '', explicit: false }, 'pinyin')).toBe('pinyin')
    expect(modeForRoute({ name: 'search', query: 'shi', explicit: false }, 'english')).toBe(
      'english',
    )
    expect(modeForRoute({ name: 'search', query: 'shi', explicit: false }, 'pinyin')).toBe('pinyin')
  })

  it('returns remembered mode for about route', () => {
    expect(modeForRoute({ name: 'about' }, 'english')).toBe('english')
    expect(modeForRoute({ name: 'about' }, 'pinyin')).toBe('pinyin')
  })
})
