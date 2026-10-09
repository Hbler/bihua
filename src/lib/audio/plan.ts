import type { CharEntry } from '../data/types.js'

export type VoiceLike = { name: string; lang: string; localService: boolean }

export type SyllableKey = string

export type PlayPlan = { kind: 'voice'; text: string } | { kind: 'clips'; keys: SyllableKey[] }

export function syllableKey(syllable: string, tone: number): SyllableKey {
  return `${syllable.trim().toLowerCase().replaceAll('ü', 'v')}${tone}`
}

function getVoiceRank(voice: VoiceLike): 1 | 2 | 3 | null {
  if (voice.localService !== true) {
    return null
  }
  const lang = voice.lang.trim().toLowerCase().replaceAll('_', '-')
  if (
    lang.startsWith('zh-hk') ||
    lang.startsWith('zh-mo') ||
    lang.startsWith('yue') ||
    lang.startsWith('zh-yue')
  ) {
    return null
  }
  if (
    lang === 'zh-cn' ||
    lang.startsWith('zh-cn-') ||
    lang === 'cmn-hans-cn' ||
    lang.startsWith('cmn-hans-cn-') ||
    lang === 'cmn-cn' ||
    lang.startsWith('cmn-cn-') ||
    lang === 'cmn'
  ) {
    return 1
  }
  if (
    lang === 'zh-tw' ||
    lang.startsWith('zh-tw-') ||
    lang === 'cmn-hant-tw' ||
    lang.startsWith('cmn-hant-tw-')
  ) {
    return 2
  }
  if (lang === 'zh' || lang.startsWith('zh-') || lang === 'cmn' || lang.startsWith('cmn-')) {
    return 3
  }
  return null
}

export function pickVoice(voices: readonly VoiceLike[]): VoiceLike | null {
  let bestVoice: VoiceLike | null = null
  let bestRank = Infinity

  for (const voice of voices) {
    const rank = getVoiceRank(voice)
    if (rank !== null && rank < bestRank) {
      bestRank = rank
      bestVoice = voice
      if (bestRank === 1) {
        break
      }
    }
  }

  return bestVoice
}

export function planReading(
  entry: CharEntry,
  readingIndex: number,
  hasVoice: boolean,
  clips: ReadonlySet<SyllableKey>,
): PlayPlan | null {
  const reading = entry.readings[readingIndex]
  if (!reading) {
    return null
  }

  if (readingIndex === 0 && hasVoice) {
    return { kind: 'voice', text: entry.char }
  }

  if (reading.tone === 5) {
    return null
  }

  const key = syllableKey(reading.syllable, reading.tone)
  if (clips.has(key)) {
    return { kind: 'clips', keys: [key] }
  }

  return null
}

export function planWord(
  word: string,
  syllables: readonly string[],
  spokenTones: readonly number[],
  hasVoice: boolean,
  clips: ReadonlySet<SyllableKey>,
): PlayPlan | null {
  if (
    syllables.length !== spokenTones.length ||
    [...word].length !== syllables.length ||
    word.length === 0
  ) {
    return null
  }

  if (hasVoice) {
    return { kind: 'voice', text: word }
  }

  const keys: SyllableKey[] = []
  for (let i = 0; i < syllables.length; i++) {
    const tone = spokenTones[i]
    if (tone === 5) {
      return null
    }
    const key = syllableKey(syllables[i], tone)
    if (!clips.has(key)) {
      return null
    }
    keys.push(key)
  }

  return { kind: 'clips', keys }
}
