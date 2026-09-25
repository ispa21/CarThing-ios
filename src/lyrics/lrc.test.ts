import { describe, expect, it } from 'vitest'
import { parseLRC, parseTimestamp } from './lrc'

describe('parseTimestamp', () => {
  it.each([
    ['00:12', 12_000],
    ['00:12.4', 12_400],
    ['00:12.40', 12_400],
    ['00:12.405', 12_405],
    ['01:02.34', 62_340],
    ['00:12:40', 12_400], // colon-separated centiseconds
    ['120:00.00', 7_200_000], // long mixes
    ['3:05.5', 185_500],
  ])('%s → %i', (tag, ms) => expect(parseTimestamp(tag)).toBe(ms))

  it.each(['0a:12', '00:75.00', '00-12', '', 'ar:Artist', '00:12.4567', ':12'])('rejects %s', (tag) => {
    expect(parseTimestamp(tag)).toBeNull()
  })
})

describe('parseLRC', () => {
  it('parses the basic example', () => {
    expect(parseLRC('[00:12.40] Streetlights on the avenue\n[00:15.80] Amber on the dash\n[00:19.20] Every signal green')).toEqual([
      { startMs: 12_400, text: 'Streetlights on the avenue' },
      { startMs: 15_800, text: 'Amber on the dash' },
      { startMs: 19_200, text: 'Every signal green' },
    ])
  })

  it('skips blank lines and CRLF', () => {
    expect(parseLRC('\r\n[00:01.00]a\r\n\r\n   \n[00:02.00]b\r\n')).toEqual([
      { startMs: 1000, text: 'a' },
      { startMs: 2000, text: 'b' },
    ])
  })

  it('expands multiple timestamps and sorts by time', () => {
    expect(parseLRC('[00:30.00][00:10.00]Chorus\n[00:20.00]Verse')).toEqual([
      { startMs: 10_000, text: 'Chorus' },
      { startMs: 20_000, text: 'Verse' },
      { startMs: 30_000, text: 'Chorus' },
    ])
  })

  it('ignores metadata tags and applies [offset] (positive = sooner)', () => {
    const lines = parseLRC('[ti:Night Drive]\n[ar:Demo]\n[length: 02:52]\n[offset:+500]\n[00:10.00]Hello\n[00:00.20]Early')
    expect(lines).toEqual([
      { startMs: 0, text: 'Early' },
      { startMs: 9500, text: 'Hello' },
    ])
  })

  it('applies a negative offset (later)', () => {
    expect(parseLRC('[offset:-250]\n[00:01.00]x')).toEqual([{ startMs: 1250, text: 'x' }])
  })

  it('drops lines with malformed or missing timestamps', () => {
    expect(parseLRC('[0a:12]bad\nplain untimed text\n[00:75.00]bad seconds\n[00:05.00]good\n[00:06.00')).toEqual([
      { startMs: 5000, text: 'good' },
    ])
  })

  it('keeps empty-text stamps as instrumental gaps', () => {
    expect(parseLRC('[00:01.00]sing\n[00:04.00]\n[00:09.00]again')).toEqual([
      { startMs: 1000, text: 'sing' },
      { startMs: 4000, text: '' },
      { startMs: 9000, text: 'again' },
    ])
  })

  it('keeps brackets that are part of the text', () => {
    expect(parseLRC('[00:01.00][Chorus] Turn it up')).toEqual([{ startMs: 1000, text: '[Chorus] Turn it up' }])
  })

  it('strips enhanced-LRC word timestamps and a BOM', () => {
    expect(parseLRC('﻿[00:01.00]<00:01.00>Turn <00:01.50>it <00:02.00>up')).toEqual([
      { startMs: 1000, text: 'Turn it up' },
    ])
  })

  it('returns an empty list for garbage', () => {
    expect(parseLRC('')).toEqual([])
    expect(parseLRC('not lyrics at all\n<html>')).toEqual([])
  })

  it('keeps text as plain text (no markup interpretation)', () => {
    expect(parseLRC('[00:01.00]<img src=x onerror=alert(1)>')[0].text).toBe('<img src=x onerror=alert(1)>')
  })
})
