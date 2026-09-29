import { describe, expect, it } from 'vitest'
import { BAYER8, fbm, field, glyph, hash, noise, RAMP, rgb } from './field'

describe('the visual field', () => {
  it('has a complete 8×8 dither matrix', () => {
    expect(BAYER8).toHaveLength(64)
    expect(new Set(BAYER8).size).toBe(64)
    expect(Math.min(...BAYER8)).toBe(0)
    expect(Math.max(...BAYER8)).toBe(63 / 64)
  })

  it('is deterministic and bounded', () => {
    expect(hash(3, 9)).toBe(hash(3, 9))
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37
      const y = i * 0.11
      for (const v of [noise(x, y), fbm(x, y), field((i % 20) / 20, (i % 7) / 7, i, 0.5)]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('is continuous: neighbouring points are close', () => {
    expect(Math.abs(noise(1.5, 2.5) - noise(1.501, 2.5))).toBeLessThan(0.01)
  })

  it('lights the playhead', () => {
    const at = (x: number) => Array.from({ length: 50 }, (_, i) => field(x, i / 50, 10, 0.3)).reduce((s, v) => s + v, 0)
    expect(at(0.3)).toBeGreaterThan(at(0.8))
  })

  it('maps brightness to the ramp, and reads colours', () => {
    expect(glyph(0)).toBe(RAMP[0])
    expect(glyph(1)).toBe(RAMP[RAMP.length - 1])
    expect(rgb('#D2562B')).toEqual([210, 86, 43])
    expect(rgb('nope')).toEqual([21, 21, 19])
  })
})
