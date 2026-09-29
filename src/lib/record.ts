// The record's colours. The cover is never touched: these pick colours from a
// small downsampled copy for separate layers (the lamp, the slab behind the art,
// the lyrics flood, the VISUAL world). Pure functions, tested in record.test.ts.

export type RGB = [number, number, number]

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

function toHsv([r, g, b]: RGB): RGB {
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return [(h * 60 + 360) % 360, max ? d / max : 0, max / 255]
}

function toRgb(h: number, s: number, v: number): RGB {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return clamp255(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
  }
  return [f(5), f(3), f(1)]
}

export const hex = (c: RGB) => `#${c.map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`

/** WCAG relative luminance. */
export function luminance([r, g, b]: RGB) {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The plate's light ink, used for text on the record colour. */
export const PAPER: RGB = [244, 238, 223]

/**
 * The record's colour from RGBA pixels (e.g. a 24×24 downsample): the art's most
 * vivid hue at its own brightness, kept in a range that reads as a colour on the
 * plate (never near-white, never near-black). Greyscale art → null (use print grey).
 */
export function recordFrom(px: ArrayLike<number>): RGB | null {
  let r = 0
  let g = 0
  let b = 0
  let weight = 0
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const [, s, v] = toHsv([px[i], px[i + 1], px[i + 2]])
    if (v < 0.12 || (v > 0.95 && s < 0.1)) continue
    const w = s * s * v + 0.02
    r += px[i] * w
    g += px[i + 1] * w
    b += px[i + 2] * w
    weight += w
  }
  if (!weight) return null
  const [h, s, v] = toHsv([r / weight, g / weight, b / weight])
  if (s < 0.14) return null
  return toRgb(h, Math.min(0.9, Math.max(0.45, s)), Math.min(0.82, Math.max(0.38, v)))
}

/**
 * Darken a colour (same hue) until `ink` on it passes `target` contrast. Used for
 * the lyrics flood and the TV: the record's colour, but always readable.
 */
export function deepen(c: RGB, ink: RGB = PAPER, target = 4.5): RGB {
  let [h, s, v] = toHsv(c)
  let out = toRgb(h, s, v)
  for (let i = 0; i < 40 && contrast(out, ink) < target; i++) {
    v *= 0.94
    s = Math.min(1, s * 1.01)
    out = toRgb(h, s, v)
  }
  return out
}

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export interface Palette {
  /** The cover's most common colour: VISUAL's ground. */
  ground: RGB
  /** The strongest contrast against the ground: rings, ticks, type. */
  line: RGB
  /** A third distinct colour: the record's label. Falls back to line. */
  accent: RGB
}

/**
 * Three colours that are really in the cover, for VISUAL's world. Pixels are
 * binned coarsely (4 levels per channel is too few, 8 is plenty for a 24×24 sample);
 * the ground is the fullest bin, the line the bin that contrasts most with it,
 * the accent the most vivid remaining bin that differs from both.
 */
export function paletteFrom(px: ArrayLike<number>): Palette | null {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const key = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5)
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n++
    bin.r += px[i]
    bin.g += px[i + 1]
    bin.b += px[i + 2]
    bins.set(key, bin)
  }
  if (!bins.size) return null
  const colours = [...bins.values()]
    .map((b) => ({ n: b.n, c: [b.r / b.n, b.g / b.n, b.b / b.n].map(clamp255) as RGB }))
    .sort((a, b) => b.n - a.n)
  const ground = colours[0].c
  let line = colours[0].c
  let best = 0
  for (const { c, n } of colours) {
    const score = contrast(c, ground) * Math.min(1, n / 3)
    if (score > best) {
      best = score
      line = c
    }
  }
  // Too little contrast in the art itself: draw the lines in ink or paper.
  if (contrast(line, ground) < 3) line = luminance(ground) > 0.4 ? [21, 21, 19] : PAPER
  let accent = line
  let vivid = -1
  for (const { c, n } of colours) {
    if (n < 2 || dist(c, ground) < 90 || dist(c, line) < 90) continue
    const s = toHsv(c)[1]
    if (s > vivid) {
      vivid = s
      accent = c
    }
  }
  return { ground, line, accent }
}

const parseHex = (h: string): RGB | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Blend two hex colours: t = 0 → a, t = 1 → b. Unparseable input falls back to the other colour. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  if (!ca) return cb ? hex(cb) : a
  if (!cb) return hex(ca)
  const k = Math.max(0, Math.min(1, t))
  return hex(ca.map((v, i) => v + (cb[i] - v) * k) as RGB)
}
