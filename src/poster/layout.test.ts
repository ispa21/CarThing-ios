import { describe, expect, it } from 'vitest'
import { clampLines, fitHeadline, wrap } from './layout'

const mono = (size: number) => (t: string) => t.length * size * 0.5

describe('poster layout', () => {
  it('wraps greedily without breaking words', () => {
    expect(wrap('the quick brown fox jumps', (t) => t.length, 11)).toEqual(['the quick', 'brown fox', 'jumps'])
    expect(wrap('extraordinarily short', (t) => t.length, 8)).toEqual(['extraordinarily', 'short'])
    expect(wrap('', (t) => t.length, 8)).toEqual([])
  })

  it('picks the biggest size that fits, and shrinks for long headlines', () => {
    const opts = { max: 300, min: 60, maxWidth: 900, maxLines: 5, maxHeight: 700, leading: 0.85 }
    const short = fitHeadline('Five songs', mono, opts)
    const long = fitHeadline('You keep coming back to these songs you never saved anywhere at all', mono, opts)
    expect(short.size).toBeGreaterThan(long.size)
    expect(long.lines.length).toBeLessThanOrEqual(5)
    // a long word shrinks the type instead of overflowing
    const word = fitHeadline('Supercalifragilistic', mono, opts)
    expect(word.size * 0.5 * 'Supercalifragilistic'.length).toBeLessThanOrEqual(900)
  })

  it('clamps with an ellipsis', () => {
    expect(clampLines(['a', 'b', 'c', 'd'], 3)).toEqual(['a', 'b', 'c…'])
    expect(clampLines(['a', 'b'], 3)).toEqual(['a', 'b'])
  })
})
