import { describe, expect, it } from 'vitest'
import { contrast, deepen, hex, PAPER, paletteFrom, recordFrom, type RGB } from './record'

const fill = (n: number, rgba: number[]) => Array.from({ length: n }, () => rgba).flat()

describe('recordFrom', () => {
  it('keeps the hue of colourful art', () => {
    const [r, g, b] = recordFrom(fill(16, [210, 86, 43, 255]))!
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('never returns near-white or near-black', () => {
    const light = recordFrom(fill(16, [255, 230, 120, 255]))!
    const dark = recordFrom(fill(16, [40, 10, 60, 255]))!
    expect(Math.max(...light)).toBeLessThanOrEqual(Math.round(255 * 0.82))
    expect(Math.max(...dark)).toBeGreaterThanOrEqual(Math.round(255 * 0.38) - 1)
  })

  it('gives null for greyscale, black or transparent art', () => {
    expect(recordFrom(fill(16, [128, 128, 128, 255]))).toBeNull()
    expect(recordFrom(fill(16, [5, 5, 8, 255]))).toBeNull()
    expect(recordFrom(fill(16, [250, 20, 20, 0]))).toBeNull()
  })
})

describe('deepen', () => {
  it('darkens until paper text passes 4.5:1', () => {
    const light: RGB = [242, 194, 48]
    expect(contrast(light, PAPER)).toBeLessThan(4.5)
    expect(contrast(deepen(light), PAPER)).toBeGreaterThanOrEqual(4.5)
  })

  it('leaves an already dark colour alone', () => {
    const dark: RGB = [19, 29, 54]
    expect(deepen(dark)).toEqual(dark)
  })
})

describe('paletteFrom', () => {
  it('takes the fullest colour as the ground and a contrasting one as the line', () => {
    const px = [...fill(300, [210, 86, 43, 255]), ...fill(150, [241, 230, 207, 255]), ...fill(60, [23, 20, 15, 255])]
    const p = paletteFrom(px)!
    expect(hex(p.ground)).toBe('#d2562b')
    expect(contrast(p.line, p.ground)).toBeGreaterThan(3)
  })

  it('falls back to ink or paper lines when the art is one colour', () => {
    const p = paletteFrom(fill(100, [236, 234, 224, 255]))!
    expect(p.line).toEqual([21, 21, 19])
    const q = paletteFrom(fill(100, [14, 59, 56, 255]))!
    expect(q.line).toEqual(PAPER)
  })

  it('returns null with no opaque pixels', () => {
    expect(paletteFrom(fill(10, [0, 0, 0, 0]))).toBeNull()
  })
})
