import { describe, expect, it } from 'vitest'

import { sandhiNotes, spokenTones } from './sandhi.js'

describe('spokenTones', () => {
  it('changes first 3rd tone to 2nd in a two-character run (你好, 可以)', () => {
    expect(spokenTones(['你', '好'], [3, 3])).toEqual({
      tones: [2, 3],
      approximate: false,
    })
    expect(spokenTones(['可', '以'], [3, 3])).toEqual({
      tones: [2, 3],
      approximate: false,
    })
  })

  it('marks runs of 3+ third tones as approximate and turns all but last to 2nd tone (展览馆)', () => {
    expect(spokenTones(['展', '览', '馆'], [3, 3, 3])).toEqual({
      tones: [2, 2, 3],
      approximate: true,
    })
  })

  it('handles 一 sandhi before 4th tone and neutral-tone 个 (一个, 一样)', () => {
    expect(spokenTones(['一', '个'], [1, 5])).toEqual({
      tones: [2, 5],
      approximate: false,
    })
    expect(spokenTones(['一', '个'], [1, 4])).toEqual({
      tones: [2, 4],
      approximate: false,
    })
    expect(spokenTones(['一', '样'], [1, 4])).toEqual({
      tones: [2, 4],
      approximate: false,
    })
  })

  it('handles 一 sandhi before tones 1, 2, 3 (一天, 一年)', () => {
    expect(spokenTones(['一', '天'], [1, 1])).toEqual({
      tones: [4, 1],
      approximate: false,
    })
    expect(spokenTones(['一', '年'], [1, 2])).toEqual({
      tones: [4, 2],
      approximate: false,
    })
  })

  it('keeps 一 unchanged when ordinal, final, or numeral sequence (第一, 十一, 一二三)', () => {
    expect(spokenTones(['第', '一'], [4, 1])).toEqual({
      tones: [4, 1],
      approximate: false,
    })
    expect(spokenTones(['十', '一'], [2, 1])).toEqual({
      tones: [2, 1],
      approximate: false,
    })
    expect(spokenTones(['一', '二', '三'], [1, 4, 1])).toEqual({
      tones: [1, 4, 1],
      approximate: false,
    })
  })

  it('handles 不 sandhi before 4th tone (不是, 不对) and unchanged before other tones (不好)', () => {
    expect(spokenTones(['不', '是'], [4, 4])).toEqual({
      tones: [2, 4],
      approximate: false,
    })
    expect(spokenTones(['不', '对'], [4, 4])).toEqual({
      tones: [2, 4],
      approximate: false,
    })
    expect(spokenTones(['不', '好'], [4, 3])).toEqual({
      tones: [4, 3],
      approximate: false,
    })
  })

  it('does not alter words without sandhi (地球)', () => {
    expect(spokenTones(['地', '球'], [4, 2])).toEqual({
      tones: [4, 2],
      approximate: false,
    })
  })

  it('does not alter words with neutral tones that do not trigger sandhi (东西 dong1 xi5)', () => {
    expect(spokenTones(['东', '西'], [1, 5])).toEqual({
      tones: [1, 5],
      approximate: false,
    })
  })

  it('treats neutral tones as breaking a 3rd-tone run (姐姐 jie3 jie5)', () => {
    expect(spokenTones(['姐', '姐'], [3, 5])).toEqual({
      tones: [3, 5],
      approximate: false,
    })
  })
})

describe('sandhiNotes', () => {
  it('returns note for 一 (tone 1)', () => {
    const notes = sandhiNotes('一', 1)
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe(
      'yí before a 4th tone, yì before tones 1–3; yī alone, at the end of a word, and in ordinals',
    )
    expect(notes[0].examples).toEqual([
      { word: '一个', spoken: 'yí ge' },
      { word: '一天', spoken: 'yì tiān' },
    ])
  })

  it('returns note for 不 (tone 4)', () => {
    const notes = sandhiNotes('不', 4)
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('bú before a 4th tone')
    expect(notes[0].examples).toEqual([{ word: '不是', spoken: 'bú shì' }])
  })

  it('returns note for any 3rd tone reading (好 tone 3)', () => {
    const notes = sandhiNotes('好', 3)
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('Before another 3rd tone it is said as a 2nd tone')
    expect(notes[0].examples).toEqual([{ word: '你好', spoken: 'ní hǎo' }])
  })

  it('returns empty notes when tone is not 3 and not special character (好 tone 4, 地 tone 4)', () => {
    expect(sandhiNotes('好', 4)).toEqual([])
    expect(sandhiNotes('地', 4)).toEqual([])
  })
})
