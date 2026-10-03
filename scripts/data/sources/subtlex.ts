// SUBTLEX-CH word frequency list:
// Cai, Q., & Brysbaert, M. (2010). SUBTLEX-CH: Chinese word and character frequencies
// based on film subtitles. PLoS ONE 5(6): e10729.
// Format: 3 header lines, tab-separated "Word WCount W/million logW W-CD W-CD% logW-CD".

export function parseSubtlexWords(text: string): Map<string, number> {
  const ranks = new Map<string, number>()
  const lines = text.split(/\r?\n/)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const [word] = line.split('\t')
    if (word && !ranks.has(word)) {
      ranks.set(word, ranks.size + 1)
    }
  }
  return ranks
}
