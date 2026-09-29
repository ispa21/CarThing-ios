// The raw material for VISUAL's generative worlds: noise, dither thresholds, a
// character ramp and colour helpers. Pure — the canvases in ui/VisualWorld draw with it.
// Nothing here reads the cover's pixels: the cover is never altered; only three of its
// colours (sampled elsewhere) tint these worlds.

/** Light to dense. */
export const RAMP = ' .·:-=+*#%@'

/** 8×8 ordered-dither (Bayer) thresholds in [0, 1). */
export const BAYER8: number[] = (() => {
  const m = [0]
  let size = 1
  let mat = [[0]]
  while (size < 8) {
    const next: number[][] = []
    for (let y = 0; y < size * 2; y++) {
      next.push([])
      for (let x = 0; x < size * 2; x++) {
        const base = mat[y % size][x % size] * 4
        const q = (y < size ? 0 : 2) + (x < size ? 0 : 1)
        next[y].push(base + [0, 2, 3, 1][q])
      }
    }
    mat = next
    size *= 2
  }
  m.length = 0
  for (const row of mat) for (const v of row) m.push(v / 64)
  return m
})()

/** A stable pseudo-random value in [0, 1) for an integer lattice point. */
export function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Smooth value noise in [0, 1). */
export function noise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Fractal noise: `octaves` layers, each finer and quieter. In [0, 1). */
export function fbm(x: number, y: number, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise(x, y) * amp
    norm += amp
    x *= 2.03
    y *= 2.03
    amp *= 0.5
  }
  return sum / norm
}

/** The ramp character for a brightness in [0, 1]. */
export const glyph = (v: number) => RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)))]

/** "#rrggbb" → [r, g, b] in 0–255. Anything unreadable is ink. */
export function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [21, 21, 19]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The shared field every world samples: slow fractal weather drifting with the song's
 * time, plus a bright front where the playhead is (so you can see where you are in the
 * track). x and y in [0, 1], seconds of song time, progress in [0, 1].
 */
export function field(x: number, y: number, seconds: number, progress: number, octaves = 3) {
  const w = fbm(x * 3.2 + seconds * 0.045, y * 2.4 - seconds * 0.03, octaves)
  const front = Math.exp(-(((x - progress) * 9) ** 2)) * 0.35
  return Math.max(0, Math.min(1, w * 1.15 - 0.1 + front))
}
