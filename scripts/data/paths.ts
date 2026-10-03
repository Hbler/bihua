import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const RAW_DIR = join(ROOT, 'data', 'raw')
export const STROKES_DIR = join(ROOT, 'node_modules', 'hanzi-writer-data')
export const OUTPUT_FILE = join(ROOT, 'public', 'data', 'dict.json')
export const WORDS_OUTPUT_FILE = join(ROOT, 'public', 'data', 'words.json')

export const RAW_FILES = {
  cedict: join(RAW_DIR, 'cedict.txt'),
  mmah: join(RAW_DIR, 'mmah-dictionary.txt'),
  junda: join(RAW_DIR, 'junda.txt'),
  subtlexWords: join(RAW_DIR, 'subtlex-ch-wf.txt'),
  hskHanzi: (level: string) => join(RAW_DIR, `hsk-hanzi-${level}.txt`),
  hskHandwritten: (band: 'Elementary' | 'Medium' | 'Advanced') =>
    join(RAW_DIR, `hsk-handwritten-${band.toLowerCase()}.txt`),
}
