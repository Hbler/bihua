import { pickVoice, type PlayPlan } from './plan.js'

export const speaker = $state({
  ready: false,
  hasVoice: false,
  playingId: null as string | null,
})

let clips: ReadonlySet<string> = new Set()
let voice: SpeechSynthesisVoice | null = null
let audioElement: HTMLAudioElement | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let currentPlayToken = 0
let initPromise: Promise<void> | null = null

function getAudio(): HTMLAudioElement | null {
  if (!audioElement && typeof Audio !== 'undefined') {
    audioElement = new Audio()
  }
  return audioElement
}

async function loadClips(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/syllables.json`)
    if (res.ok) {
      const data: unknown = await res.json()
      if (Array.isArray(data)) {
        clips = new Set(data.filter((item): item is string => typeof item === 'string'))
      }
    }
  } catch {
    // failures leave clips empty
  }
}

async function initVoice(): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  try {
    const synth = window.speechSynthesis

    const repick = () => {
      try {
        voice = (pickVoice(synth.getVoices()) as SpeechSynthesisVoice | null) ?? null
        speaker.hasVoice = voice !== null
      } catch {
        // ignore
      }
    }

    synth.addEventListener('voiceschanged', repick)

    const currentVoices = synth.getVoices()
    if (currentVoices.length > 0) {
      voice = (pickVoice(currentVoices) as SpeechSynthesisVoice | null) ?? null
    } else {
      await new Promise<void>((resolve) => {
        let done = false
        const timer = setTimeout(() => {
          if (done) return
          done = true
          synth.removeEventListener('voiceschanged', onFirstVoices)
          resolve()
        }, 1000)

        const onFirstVoices = () => {
          if (done) return
          done = true
          clearTimeout(timer)
          synth.removeEventListener('voiceschanged', onFirstVoices)
          resolve()
        }

        synth.addEventListener('voiceschanged', onFirstVoices)
      })
      voice = (pickVoice(synth.getVoices()) as SpeechSynthesisVoice | null) ?? null
    }
  } catch {
    voice = null
  }
}

async function doInit(): Promise<void> {
  await Promise.all([loadClips(), initVoice()])
  speaker.hasVoice = voice !== null
  speaker.ready = true
}

export function initSpeaker(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit()
  }
  return initPromise
}

export function getClips(): ReadonlySet<string> {
  return clips
}

function playClips(id: string, keys: readonly string[], token: number): void {
  if (keys.length === 0) {
    if (speaker.playingId === id && currentPlayToken === token) {
      speaker.playingId = null
    }
    return
  }

  const audio = getAudio()
  if (!audio) {
    if (speaker.playingId === id && currentPlayToken === token) {
      speaker.playingId = null
    }
    return
  }
  const currentAudio = audio

  let index = 0

  function playNext(): void {
    if (speaker.playingId !== id || currentPlayToken !== token) {
      return
    }
    if (index >= keys.length) {
      speaker.playingId = null
      return
    }

    const key = keys[index]
    index++

    currentAudio.src = `${import.meta.env.BASE_URL}audio/syllables/${key}.mp3`

    currentAudio.onended = () => {
      if (speaker.playingId !== id || currentPlayToken !== token) {
        return
      }
      playNext()
    }

    currentAudio.onerror = () => {
      if (speaker.playingId === id && currentPlayToken === token) {
        speaker.playingId = null
      }
    }

    currentAudio.play().catch(() => {
      if (speaker.playingId === id && currentPlayToken === token) {
        speaker.playingId = null
      }
    })
  }

  playNext()
}

export function stop(): void {
  currentPlayToken++
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
  if (activeUtterance) {
    activeUtterance.onend = null
    activeUtterance.onerror = null
    activeUtterance = null
  }
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
    audioElement.onended = null
    audioElement.onerror = null
  }
  speaker.playingId = null
}

export function play(id: string, getPlan: (hasVoice: boolean) => PlayPlan | null): void {
  stop()
  const plan = getPlan(speaker.hasVoice)
  if (!plan) return

  speaker.playingId = id
  const token = ++currentPlayToken

  if (plan.kind === 'voice') {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      const fallback = getPlan(false)
      if (fallback && fallback.kind === 'clips') {
        playClips(id, fallback.keys, token)
      } else {
        speaker.playingId = null
      }
      return
    }

    const utterance = new SpeechSynthesisUtterance(plan.text)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
    utterance.rate = 1

    activeUtterance = utterance

    utterance.onend = () => {
      activeUtterance = null
      if (speaker.playingId === id && currentPlayToken === token) {
        speaker.playingId = null
      }
    }

    utterance.onerror = () => {
      activeUtterance = null
      if (speaker.playingId === id && currentPlayToken === token) {
        const fallback = getPlan(false)
        if (fallback && fallback.kind === 'clips') {
          playClips(id, fallback.keys, token)
        } else {
          speaker.playingId = null
        }
      }
    }

    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      activeUtterance = null
      if (speaker.playingId === id && currentPlayToken === token) {
        const fallback = getPlan(false)
        if (fallback && fallback.kind === 'clips') {
          playClips(id, fallback.keys, token)
        } else {
          speaker.playingId = null
        }
      }
    }
  } else if (plan.kind === 'clips') {
    playClips(id, plan.keys, token)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', stop)
}
