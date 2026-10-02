// Jun Da, Modern Chinese Character Frequency List:
// https://lingua.mtsu.edu/chinese-computing/statistics/ (no explicit license; credited in-app)
// Tab-delimited: rank, char, count, cumulative %, pinyin, gloss. Only the rank is used
// (its pinyin column is alphabetical, so it says nothing about which reading is primary).

export function parseJunDa(text: string): Map<string, number> {
  const ranks = new Map<string, number>()
  for (const line of text.split(/\r?\n/)) {
    const [rankText, char] = line.split('\t')
    const rank = Number(rankText)
    if (Number.isInteger(rank) && char && !ranks.has(char)) ranks.set(char, rank)
  }
  return ranks
}
