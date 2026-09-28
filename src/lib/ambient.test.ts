import { describe, expect, it } from 'vitest'
import { ambientFrom } from './ambient'

const fill = (n: number, rgba: number[]) => Array.from({ length: n }, () => rgba).flat()

describe('ambientFrom', () => {
  it('keeps the hue of colourful art, at a glow-friendly brightness', () => {
    const [r, g, b] = ambientFrom(fill(16, [200, 30, 40, 255]))!
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(110)
    expect(b).toBeLessThan(110)
  })

  it('lets vivid pixels outweigh a mostly grey cover', () => {
    const px = [...fill(90, [120, 120, 120, 255]), ...fill(10, [20, 90, 230, 255])]
    const [r, , b] = ambientFrom(px)!
    expect(b).toBeGreaterThan(r)
  })

  it('gives no glow for greyscale, black or transparent art', () => {
    expect(ambientFrom(fill(16, [128, 128, 128, 255]))).toBeNull()
    expect(ambientFrom(fill(16, [5, 5, 8, 255]))).toBeNull()
    expect(ambientFrom(fill(16, [250, 20, 20, 0]))).toBeNull()
    expect(ambientFrom([])).toBeNull()
  })

  it('ignores near-white paper around a coloured motif', () => {
    const px = [...fill(80, [250, 250, 248, 255]), ...fill(20, [240, 160, 20, 255])]
    const [r, g, b] = ambientFrom(px)!
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })
})
