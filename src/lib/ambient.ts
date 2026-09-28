// The deck's ambient glow takes its colour from the artwork's pixels. The
// artwork itself is never touched: this only picks a colour for a separate
// light behind it (Spotify: artwork is shown uncropped and unaltered).

type RGB = [number, number, number]

function toHsv(r: number, g: number, b: number): RGB {
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
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
  }
  return [f(5), f(3), f(1)]
}

/**
 * A glow colour from RGBA pixels (e.g. a 24×24 downsample). Vivid pixels count
 * most; near-black and near-white are ignored. The result keeps the art's hue at
 * a brightness that reads as light on the dark glass. Greyscale art → null (no glow).
 */
export function ambientFrom(px: ArrayLike<number>): RGB | null {
  let r = 0
  let g = 0
  let b = 0
  let weight = 0
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const [, s, v] = toHsv(px[i], px[i + 1], px[i + 2])
    if (v < 0.12 || (v > 0.95 && s < 0.1)) continue
    const w = s * s * v + 0.02
    r += px[i] * w
    g += px[i + 1] * w
    b += px[i + 2] * w
    weight += w
  }
  if (!weight) return null
  const [h, s] = toHsv(r / weight, g / weight, b / weight)
  if (s < 0.14) return null
  return toRgb(h, Math.min(0.85, Math.max(0.5, s)), 0.86)
}
