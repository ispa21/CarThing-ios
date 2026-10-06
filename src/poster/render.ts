// A story as a poster: an editorial page, not a stats card. Archivo condensed black at
// poster size, one sentence, the covers (whole and unaltered), and a line saying it was
// worked out on this device. Drawn on a canvas in the browser; nothing is uploaded.

import type { Card } from '../stories/cards'
import { clampLines, fitHeadline, wrap } from './layout'

const W = 1080
const H = 1350
const M = 72

const INK = '#151513'
const PLATE = '#ECE6D8'
const GREY = '#5C574C'

async function fontsReady() {
  await Promise.all([
    document.fonts.load('900 120px "Archivo Variable"'),
    document.fonts.load('400 40px "Stack Sans Text"'),
    document.fonts.load('400 24px "Departure Mono"'),
  ]).catch(() => {})
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function draw(ctx: CanvasRenderingContext2D, card: Card, covers: HTMLImageElement[], accent: string) {
  ctx.fillStyle = PLATE
  ctx.fillRect(0, 0, W, H)

  // Header: the wordmark, and the legend this story wears in the app.
  ctx.fillStyle = accent
  ctx.fillRect(M, M, 28, 28)
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  ctx.font = '800 34px "Stack Sans Text", system-ui, sans-serif'
  ctx.fillText('partydeck', M + 48, M + 26)
  ctx.font = '400 24px "Departure Mono", ui-monospace, monospace'
  ctx.fillStyle = GREY
  ctx.textAlign = 'right'
  ctx.fillText(card.kicker.toLowerCase().slice(0, 44), W - M, M + 24)
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.fillRect(M, M + 56, W - 2 * M, 3)

  // Room, top to bottom: header, headline, the sentence, the covers, footer.
  const top = M + 56 + 44
  const coverSize = covers.length ? Math.min(220, (W - 2 * M - 24 * (covers.length - 1)) / covers.length) : 0
  const coverBlock = covers.length ? coverSize + 48 : 0
  const bottom = H - M - 70 - coverBlock
  ctx.font = '400 38px "Stack Sans Text", system-ui, sans-serif'
  const ledeLines = clampLines(wrap(card.lede ?? '', (t) => ctx.measureText(t).width, W - 2 * M), covers.length ? 3 : 4)
  const ledeBlock = ledeLines.length ? ledeLines.length * 52 + 56 : 0

  // Headline: as large as it will go, condensed, in capitals.
  const fontAt = (size: number) => `900 ${size}px "Archivo Variable", "Archivo", Impact, system-ui, sans-serif`
  const measureAt = (size: number) => (t: string) => {
    ctx.font = fontAt(size)
    ctx.fontStretch = 'ultra-condensed'
    return ctx.measureText(t.toUpperCase()).width
  }
  const { size, lines } = fitHeadline(card.headline, measureAt, { max: 280, min: 70, maxWidth: W - 2 * M, maxLines: 6, maxHeight: bottom - ledeBlock - top, leading: 0.86 })
  ctx.font = fontAt(size)
  ctx.fontStretch = 'ultra-condensed'
  ctx.fillStyle = INK
  let y = top + size * 0.8
  for (const line of lines) {
    ctx.fillText(line.toUpperCase(), M - 4, y)
    y += size * 0.86
  }
  ctx.fontStretch = 'normal'
  y -= size * 0.86 // back to the last baseline

  // The one sentence.
  if (ledeLines.length) {
    ctx.font = '400 38px "Stack Sans Text", system-ui, sans-serif'
    ctx.fillStyle = GREY
    let ly = y + 70
    for (const line of ledeLines) {
      ctx.fillText(line, M, ly)
      ly += 52
    }
  }

  // The covers: whole, unaltered, side by side above the footer.
  if (covers.length) {
    const gap = 24
    const cy = H - M - 70 - coverSize
    covers.forEach((img, i) => ctx.drawImage(img, M + i * (coverSize + gap), cy, coverSize, coverSize))
  }

  // Footer.
  ctx.fillStyle = INK
  ctx.fillRect(M, H - M - 40, W - 2 * M, 2)
  ctx.font = '400 22px "Departure Mono", ui-monospace, monospace'
  ctx.fillStyle = GREY
  ctx.fillText('worked out on my device · never uploaded', M, H - M)
}

/** The poster as a PNG. Covers are used when the browser lets a canvas keep them; otherwise it's type alone. */
export async function renderPoster(card: Card): Promise<Blob> {
  await fontsReady()
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--record-deep').trim() || '#D2562B'
  const covers = (await Promise.all((card.art ?? []).slice(0, 4).map(loadImage))).filter((i): i is HTMLImageElement => i !== null)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  const toBlob = () => new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'))
  draw(ctx, card, covers, accent)
  try {
    return await toBlob()
  } catch {
    // A cover that wouldn't allow a canvas to export taints it: draw again without them.
    ctx.reset()
    draw(ctx, card, [], accent)
    return toBlob()
  }
}

/** Share the poster (the share sheet on phones), or download it. Returns how it went. */
export async function sharePoster(card: Card, text: string): Promise<'shared' | 'saved' | 'text' | 'cancelled'> {
  try {
    const blob = await renderPoster(card)
    const file = new File([blob], `partydeck-${card.id}.png`, { type: 'image/png' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text })
      return 'shared'
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'saved'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    // No canvas or no image: share the sentence instead.
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (nav.share) await nav.share({ text })
      else await navigator.clipboard.writeText(text)
      return 'text'
    } catch {
      return 'cancelled'
    }
  }
}
