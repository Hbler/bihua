// HSK 3.0 (GF0025-2021) character and handwriting lists, transcribed in
// https://github.com/krmanik/HSK-3.0 ("New HSK (2021)/HSK Hanzi", "HSK Handwritten").

/** One character per line; blank lines and non-Han lines are ignored. */
export function parseCharList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\p{Script=Han}$/u.test(line))
}
