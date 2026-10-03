import type { Tone } from '../data/types.js'
import { SYLLABLES } from './syllables.js'
import { stripToneMarks } from './tone-marks.js'

const MAX_SYLLABLE_LENGTH = 6

export type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'char'; char: string }
  | { kind: 'chars'; chars: string[] }
  | { kind: 'pinyin'; syllable: string; tone?: Tone }
  | { kind: 'multi-syllable'; input: string }
  | { kind: 'invalid'; input: string }

/**
 * Parse user input into a normalized query type
 */
export function parseQuery(input: string): ParsedQuery {
  // Step 1: Trim and normalize
  const trimmed = input.trim()

  if (!trimmed) {
    return { kind: 'empty' }
  }

  // NFC normalization
  const normalized = trimmed.normalize('NFC')

  // Step 2: Check if all non-whitespace characters are Han ideographs
  const hanRegex = /\p{Script=Han}/u
  const latinRegex = /[a-zü:]/i

  let hasHan = false
  let hasLatin = false

  for (const char of normalized) {
    if (/[\s\p{P}]/u.test(char) && char !== "'" && char !== ':') {
      continue // Skip whitespace and punctuation (e.g. "睨。" pasted from a reader)
    }
    if (hanRegex.test(char)) {
      hasHan = true
    } else if (latinRegex.test(char)) {
      hasLatin = true
    } else {
      // Character that's neither Han nor Latin-like
      // Treat as Latin-like for pinyin processing
      hasLatin = true
    }
  }

  // If mixed Han and Latin, it's invalid
  if (hasHan && hasLatin) {
    return { kind: 'invalid', input: normalized }
  }

  // Step 3: If all Han, parse as character(s)
  if (hasHan) {
    const chars: string[] = []
    const seen = new Set<string>()

    for (const char of normalized) {
      if (hanRegex.test(char)) {
        if (!seen.has(char)) {
          chars.push(char)
          seen.add(char)
        }
      }
    }

    if (chars.length === 1) {
      return { kind: 'char', char: chars[0] }
    } else {
      return { kind: 'chars', chars }
    }
  }

  // Step 4: Parse as pinyin
  return parsePinyin(normalized)
}

/**
 * Parse Latin/pinyin input
 */
function parsePinyin(input: string): ParsedQuery {
  // Lowercase
  let text = input.toLowerCase()

  // Replace ü variants with v
  text = text.replace(/ü/g, 'v').replace(/u:/g, 'v')

  // Strip tone marks and record the tone (if any)
  const stripped = stripToneMarks(text)
  text = stripped.text
  let extractedTone = stripped.tone

  // Check for trailing digit tone
  let digitTone: Tone | undefined
  const lastChar = text[text.length - 1]

  if (/[0-5]/.test(lastChar)) {
    const digit = parseInt(lastChar, 10)
    digitTone = (digit === 0 ? 5 : digit) as Tone

    // Remove the digit from text
    text = text.slice(0, -1)

    // Check for conflict between tone mark and digit
    if (extractedTone && extractedTone !== digitTone) {
      return { kind: 'invalid', input }
    }

    extractedTone = digitTone
  }

  // Map lue → lve and nue → nve
  text = text.replace(/lue/g, 'lve').replace(/nue/g, 'nve')

  // Try to parse as single syllable first
  if (SYLLABLES.has(text)) {
    return {
      kind: 'pinyin',
      syllable: text,
      ...(extractedTone && { tone: extractedTone }),
    }
  }

  // Try to segment into multiple syllables
  const segmented = segmentIntoPinyinSyllables(text)

  if (segmented !== null) {
    return { kind: 'multi-syllable', input }
  }

  // Invalid
  return { kind: 'invalid', input }
}

/**
 * Try to segment a string into two or more valid pinyin syllables.
 * Spaces, apostrophes and tone digits are allowed between syllables.
 * Returns null if no segmentation exists.
 */
function segmentIntoPinyinSyllables(text: string): string[] | null {
  // Separators mark syllable boundaries, so each part is segmented on its own.
  const parts = text.split(/[\s'0-5]+/).filter(Boolean)
  const syllables: string[] = []
  for (const part of parts) {
    const segmented = segmentPart(part)
    if (!segmented) return null
    syllables.push(...segmented)
  }
  return syllables.length > 1 ? syllables : null
}

function segmentPart(part: string): string[] | null {
  // segments[i] = a segmentation of part.slice(0, i), or null if none exists.
  const segments: (string[] | null)[] = [[]]
  for (let end = 1; end <= part.length; end++) {
    segments[end] = null
    for (let start = Math.max(0, end - MAX_SYLLABLE_LENGTH); start < end; start++) {
      const before = segments[start]
      const candidate = part.slice(start, end)
      if (before && SYLLABLES.has(candidate)) {
        segments[end] = [...before, candidate]
        break
      }
    }
  }
  return segments[part.length]
}

const MAX_WORD_SYLLABLE_SLICE = 8

function parseSyllableSlice(slice: string): { syllable: string; tone: Tone | undefined } | null {
  // Tone digits cannot appear anywhere inside except at the end
  if (/[0-5]/.test(slice.slice(0, -1))) return null

  let tone: Tone | undefined
  let base = slice

  if (/[0-5]/.test(slice.slice(-1))) {
    const digit = parseInt(slice.slice(-1), 10)
    tone = (digit === 0 ? 5 : digit) as Tone
    base = slice.slice(0, -1)
  }

  // Count tone marks: at most one tone mark is permitted in a single syllable
  let markCount = 0
  for (const ch of base) {
    if ('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'.includes(ch)) {
      markCount++
    }
  }
  if (markCount > 1) return null

  const stripped = stripToneMarks(base)
  if (stripped.tone !== undefined) {
    if (tone !== undefined && tone !== stripped.tone) return null
    tone = stripped.tone
  }

  let text = stripped.text
  text = text.replace(/ü/g, 'v').replace(/u:/g, 'v').replace(/lue/g, 'lve').replace(/nue/g, 'nve')

  if (!SYLLABLES.has(text)) return null

  return { syllable: text, tone }
}

function segmentWordPart(part: string): { syllable: string; tone: Tone | undefined }[] | null {
  const n = part.length
  const dp: ({ syllable: string; tone: Tone | undefined }[] | null)[] = new Array(n + 1).fill(null)
  dp[0] = []

  for (let end = 1; end <= n; end++) {
    for (let start = Math.max(0, end - MAX_WORD_SYLLABLE_SLICE); start < end; start++) {
      const prev = dp[start]
      if (!prev) continue
      const slice = part.slice(start, end)
      const parsed = parseSyllableSlice(slice)
      if (parsed) {
        dp[end] = [...prev, parsed]
        break
      }
    }
  }

  return dp[n]
}

/**
 * Parse pinyin input for word search.
 * Accepts diqiu, di qiu, di'qiu, di4qiu2, di4 qiu2, dì qiú, dìqiú, xi'an, lvse, lv4se4, nv3ren2.
 * Mixed input such as di4qiu also works: syllables without a tone get undefined.
 * Spaces, apostrophes and tone digits are boundaries.
 * Returns null when the input can't be segmented into valid syllables.
 */
export function parseWordQuery(input: string): { key: string; tones: (Tone | undefined)[] } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/\p{Script=Han}/u.test(trimmed)) return null

  const norm = trimmed
    .toLowerCase()
    .replace(/ü/g, 'v')
    .replace(/u:/g, 'v')
    .replace(/lue/g, 'lve')
    .replace(/nue/g, 'nve')

  const parts = norm.split(/[\s']+/).filter(Boolean)
  if (parts.length === 0) return null

  const allSyllables: { syllable: string; tone: Tone | undefined }[] = []
  for (const part of parts) {
    const seg = segmentWordPart(part)
    if (!seg) return null
    allSyllables.push(...seg)
  }

  return {
    key: allSyllables.map((s) => s.syllable).join(''),
    tones: allSyllables.map((s) => s.tone),
  }
}
