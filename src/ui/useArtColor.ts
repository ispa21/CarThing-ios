import { useEffect, useState } from 'react'
import { ambientFrom } from '../lib/ambient'

const SIZE = 24

/**
 * The ambient colour for a piece of artwork, sampled from a separate 24×24 CORS
 * copy — the visible <img> never depends on CORS. Keeps the previous colour while
 * the next one loads, so the glow cross-fades instead of blinking. null = no glow.
 */
export function useArtColor(src: string | null): string | null {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous' // Spotify's image CDNs send Access-Control-Allow-Origin: *
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const rgb = ambientFrom(ctx.getImageData(0, 0, SIZE, SIZE).data)
        setColor(rgb ? `rgb(${rgb.join(' ')})` : null)
      } catch {
        setColor(null) // tainted canvas or no 2D context: no glow, nothing else changes
      }
    }
    img.onerror = () => {
      if (!cancelled) setColor(null)
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  return src ? color : null
}
