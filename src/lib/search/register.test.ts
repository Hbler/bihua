import { describe, expect, it } from 'vitest'

import { splitRegisterLabels, type RegisterLabel } from './register.js'

describe('splitRegisterLabels', () => {
  it('parses the exact prompt examples correctly', () => {
    expect(
      splitRegisterLabels(
        '(literary) (fig.) the earth (while the carriage canopy is a metaphor for heaven)',
      ),
    ).toEqual({
      labels: ['literary', 'fig'],
      text: 'the earth (while the carriage canopy is a metaphor for heaven)',
    })

    expect(splitRegisterLabels('(courteous) to eat')).toEqual({
      labels: ['courteous'],
      text: 'to eat',
    })

    expect(splitRegisterLabels('(bound form) old')).toEqual({
      labels: [],
      text: '(bound form) old',
    })

    expect(splitRegisterLabels('old (of people)')).toEqual({
      labels: [],
      text: 'old (of people)',
    })

    expect(splitRegisterLabels('(literary, archaic) meaning')).toEqual({
      labels: ['literary', 'archaic'],
      text: 'meaning',
    })
  })

  it('recognizes all 18 RegisterLabel types individually', () => {
    const allLabels: RegisterLabel[] = [
      'literary',
      'archaic',
      'classical',
      'old',
      'dialect',
      'cantonese',
      'taiwan',
      'colloquial',
      'slang',
      'formal',
      'courteous',
      'polite',
      'honorific',
      'humble',
      'derogatory',
      'vulgar',
      'euphemism',
      'fig',
    ]

    for (const label of allLabels) {
      const gloss = `(${label}) word`
      expect(splitRegisterLabels(gloss)).toEqual({
        labels: [label],
        text: 'word',
      })
    }
  })

  it('handles trailing periods on labels like (fig.) or (old.)', () => {
    expect(splitRegisterLabels('(fig.) deeply moved')).toEqual({
      labels: ['fig'],
      text: 'deeply moved',
    })
    expect(splitRegisterLabels('(old.) obsolete term')).toEqual({
      labels: ['old'],
      text: 'obsolete term',
    })
  })

  it('handles case-insensitivity in labels', () => {
    expect(splitRegisterLabels('(Literary) poem')).toEqual({
      labels: ['literary'],
      text: 'poem',
    })
    expect(splitRegisterLabels('(FIG.) metaphor')).toEqual({
      labels: ['fig'],
      text: 'metaphor',
    })
  })

  it('handles comma-separated register labels inside single parens', () => {
    expect(splitRegisterLabels('(formal, polite) hello')).toEqual({
      labels: ['formal', 'polite'],
      text: 'hello',
    })
    expect(splitRegisterLabels('(dialect, cantonese, slang) expression')).toEqual({
      labels: ['dialect', 'cantonese', 'slang'],
      text: 'expression',
    })
  })

  it('preserves non-register content when mixed in comma-separated parentheticals', () => {
    expect(
      splitRegisterLabels('(classical, usually follows negative or question words) only'),
    ).toEqual({
      labels: ['classical'],
      text: '(usually follows negative or question words) only',
    })
    expect(splitRegisterLabels('(courteous, as opposed to 他[ta1]) he')).toEqual({
      labels: ['courteous'],
      text: '(as opposed to 他[ta1]) he',
    })
  })

  it('does not match register label words that are outside parentheses', () => {
    expect(splitRegisterLabels('old book')).toEqual({
      labels: [],
      text: 'old book',
    })
    expect(splitRegisterLabels('a formal dinner')).toEqual({
      labels: [],
      text: 'a formal dinner',
    })
    expect(splitRegisterLabels('colloquial phrasing')).toEqual({
      labels: [],
      text: 'colloquial phrasing',
    })
  })

  it('preserves order of appearance without duplicates', () => {
    expect(splitRegisterLabels('(fig.) (literary) (fig.) the earth')).toEqual({
      labels: ['fig', 'literary'],
      text: 'the earth',
    })
    expect(splitRegisterLabels('(literary, archaic, literary) text')).toEqual({
      labels: ['literary', 'archaic'],
      text: 'text',
    })
  })

  it('cleans up punctuation and spacing when labels are removed', () => {
    expect(splitRegisterLabels('cloth (archaic), esp. of southern ethnic groups')).toEqual({
      labels: ['archaic'],
      text: 'cloth, esp. of southern ethnic groups',
    })
    expect(splitRegisterLabels('(old)(interjection expressing disapproval) tut!')).toEqual({
      labels: ['old'],
      text: '(interjection expressing disapproval) tut!',
    })
    expect(splitRegisterLabels('to eat (courteous)')).toEqual({
      labels: ['courteous'],
      text: 'to eat',
    })
  })

  it('handles edge cases gracefully', () => {
    expect(splitRegisterLabels('')).toEqual({
      labels: [],
      text: '',
    })
    expect(splitRegisterLabels('(literary)')).toEqual({
      labels: ['literary'],
      text: '',
    })
    expect(splitRegisterLabels('   (literary)   ')).toEqual({
      labels: ['literary'],
      text: '',
    })
    expect(splitRegisterLabels('plain text without parens')).toEqual({
      labels: [],
      text: 'plain text without parens',
    })
  })
})
