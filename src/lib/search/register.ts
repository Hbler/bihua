export type RegisterLabel =
  | 'literary'
  | 'archaic'
  | 'classical'
  | 'old'
  | 'dialect'
  | 'cantonese'
  | 'taiwan'
  | 'colloquial'
  | 'slang'
  | 'formal'
  | 'courteous'
  | 'polite'
  | 'honorific'
  | 'humble'
  | 'derogatory'
  | 'vulgar'
  | 'euphemism'
  | 'fig'

const REGISTER_LABEL_SET: ReadonlySet<string> = new Set<RegisterLabel>([
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
])

function isRegisterLabel(val: string): val is RegisterLabel {
  return REGISTER_LABEL_SET.has(val)
}

/**
 * Splits register labels out of a CC-CEDICT gloss string.
 *
 * Scans all parenthetical phrases, matching content against known RegisterLabels.
 * Matched labels are removed from the gloss text, while non-register parentheticals
 * (e.g. `(bound form)`, `(of people)`) and other text are preserved.
 */
export function splitRegisterLabels(gloss: string): { labels: RegisterLabel[]; text: string } {
  const labels: RegisterLabel[] = []

  let text = gloss.replace(/\(([^)]*)\)/g, (fullMatch, content: string) => {
    const parts = content.split(',')
    const keptParts: string[] = []
    let foundLabelInParen = false

    for (const rawPart of parts) {
      const normalized = rawPart.trim().toLowerCase().replace(/\.$/, '')
      if (isRegisterLabel(normalized)) {
        foundLabelInParen = true
        if (!labels.includes(normalized)) {
          labels.push(normalized)
        }
      } else {
        keptParts.push(rawPart.trim())
      }
    }

    if (!foundLabelInParen) {
      return fullMatch
    }
    if (keptParts.length === 0) {
      return ''
    }
    return `(${keptParts.join(', ')})`
  })

  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;.])/g, '$1')
    .replace(/^[,;.\s]+/, '')
    .trim()

  return { labels, text }
}
