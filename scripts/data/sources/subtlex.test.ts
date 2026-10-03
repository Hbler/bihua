import { describe, expect, it } from 'vitest'

import { parseSubtlexWords } from './subtlex.ts'

const SAMPLE = `"Total word count: 33,546,516"\t\t\t\t\t\t
"Context number: 6,243"\t\t\t\t\t\t
Word\tWCount\tW/million\tlogW\tW-CD\tW-CD%\tlogW-CD
的\t1682530\t50155.13\t6.226\t6243\t100\t3.7954
我\t1682285\t50147.83\t6.2259\t6242\t99.98\t3.7953
你\t1329424\t39629.27\t6.1237\t6242\t99.98\t3.7953

是\t947807\t28253.52\t5.9767\t6243\t100\t3.7954
我\t100\t1.0\t1.0\t1\t0.1\t0.1
`

describe('parseSubtlexWords', () => {
  it('skips 3 header lines, blank lines, and assigns 1-based ranks keeping first occurrence', () => {
    const ranks = parseSubtlexWords(SAMPLE)
    expect(ranks.get('的')).toBe(1)
    expect(ranks.get('我')).toBe(2)
    expect(ranks.get('你')).toBe(3)
    expect(ranks.get('是')).toBe(4)
    expect(ranks.size).toBe(4)
  })
})
