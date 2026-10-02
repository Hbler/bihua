import type { Tone } from '../data/types.js'
import { SYLLABLES } from './syllables.js'

// Tone marks for each vowel: tone 1-4, stored as [1st, 2nd, 3rd, 4th tone mark]
const toneMarks: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ'], // v is rendered as ü
}

// Map of unmarked to marked vowels by tone (for reverse lookup in stripToneMarks)
const markedToUnmarked: Record<string, { vowel: string; tone: Tone }> = {}

// Build the reverse map
for (const [vowel, marks] of Object.entries(toneMarks)) {
  marks.forEach((mark, index) => {
    markedToUnmarked[mark] = { vowel, tone: (index + 1) as Tone }
  })
}

/**
 * Convert a toneless syllable + tone number to marked form
 * Examples: ('lv', 4) → 'lǜ', ('hao', 3) → 'hǎo'
 * Rules: mark a or e if present; 'ou' → o; otherwise last vowel
 * Tone 5 (neutral) gets no mark. v always displays as ü.
 */
export function numberedToMarks(syllable: string, tone: Tone): string {
  // Tone 5 (neutral) has no mark
  if (tone === 5) {
    return syllable.replace(/v/g, 'ü')
  }

  // Find which vowel should get the tone mark
  let markIndex = -1
  let markedVowel = ''

  // Rule: mark a or e if present
  if (syllable.includes('a')) {
    markIndex = syllable.indexOf('a')
    markedVowel = 'a'
  } else if (syllable.includes('e')) {
    markIndex = syllable.indexOf('e')
    markedVowel = 'e'
  } else if (syllable.includes('o')) {
    // Special case: in 'ou', mark the 'o'
    markIndex = syllable.indexOf('o')
    markedVowel = 'o'
  } else {
    // Otherwise mark the last vowel
    const vowels = ['i', 'u', 'ü', 'v']
    for (let i = syllable.length - 1; i >= 0; i--) {
      const char = syllable[i]
      if (vowels.includes(char)) {
        markIndex = i
        markedVowel = char === 'v' ? 'v' : char
        break
      }
    }
  }

  if (markIndex === -1) {
    // No vowel found, return as-is (syllabic consonant)
    return syllable.replace(/v/g, 'ü')
  }

  // Get the marked version of the vowel
  const vowelForMarking = markedVowel === 'v' ? 'v' : markedVowel
  const marks = toneMarks[vowelForMarking]
  if (!marks) {
    return syllable.replace(/v/g, 'ü')
  }

  const markedChar = marks[tone - 1]
  const result = syllable.slice(0, markIndex) + markedChar + syllable.slice(markIndex + 1)

  // Replace any remaining v with ü
  return result.replace(/v/g, 'ü')
}

/**
 * Parse CC-CEDICT-style tokens: 'shuo1', 'lu:4' → {lv,4}, 'ma5', 'Zhang1', 'r5'
 * Returns null if not a valid syllable
 */
export function parseNumberedSyllable(s: string): { syllable: string; tone: Tone } | null {
  if (!s || typeof s !== 'string') {
    return null
  }

  // Extract tone digit (must be at the end)
  const lastChar = s[s.length - 1]
  const toneDigit = parseInt(lastChar, 10)

  if (isNaN(toneDigit) || toneDigit < 0 || toneDigit > 5) {
    return null
  }

  // Extract syllable (everything except the last tone digit)
  let syllable = s.slice(0, -1).toLowerCase()

  // Replace u: and ü: with v (representing ü)
  syllable = syllable.replace(/u:/g, 'v').replace(/ü:/g, 'v')

  // Handle ü as v
  syllable = syllable.replace(/ü/g, 'v')

  // Tone 0 becomes tone 5
  const tone = (toneDigit === 0 ? 5 : toneDigit) as Tone

  // Check if it's a valid syllable
  if (!SYLLABLES.has(syllable)) {
    return null
  }

  return { syllable, tone }
}

/**
 * Remove a single tone mark from a marked syllable
 * Examples: 'shì' → {text: 'shi', tone: 4}, 'lǜ' → {text: 'lv', tone: 4}
 */
export function stripToneMarks(s: string): { text: string; tone?: Tone } {
  if (!s) {
    return { text: s }
  }

  let tone: Tone | undefined
  let result = ''

  for (const char of s) {
    if (markedToUnmarked[char]) {
      const { vowel, tone: foundTone } = markedToUnmarked[char]
      // Replace ü with v for consistency
      result += vowel === 'ü' ? 'v' : vowel
      if (!tone) {
        tone = foundTone
      }
    } else if (char === 'ü') {
      // Unmarked ü, convert to v
      result += 'v'
    } else {
      result += char
    }
  }

  return tone !== undefined ? { text: result, tone } : { text: result }
}
