import { useEffect, useState } from 'react'
import { deepen, hex, paletteFrom, recordFrom, type Palette } from '../lib/record'

const SIZE = 24

export interface RecordColours {
  /** The record's colour: the lamp, the slab behind the art. */
  record: string
  /** The record, dark enough for paper-coloured text: the lyrics flood, the TV. */
  deep: string
  /** Three colours really in the cover: VISUAL's world. */
  palette: { ground: string; line: string; accent: string } | null
}

const cache = new Map<string, RecordColours | null>()
const pending = new Map<string, Promise<RecordColours | null>>()

/**
 * Samples a separate 24×24 CORS copy of the cover (the visible <img> never depends
 * on CORS, and is never altered). Spotify's image CDNs send Access-Control-Allow-Origin: *.
 */
function sample(src: string): Promise<RecordColours | null> {
  const hit = pending.get(src)
  if (hit) return hit
  const job = new Promise<RecordColours | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const px = ctx.getImageData(0, 0, SIZE, SIZE).data
        const rec = recordFrom(px)
        const pal: Palette | null = paletteFrom(px)
        resolve(
          rec
            ? {
                record: hex(rec),
                deep: hex(deepen(rec)),
                palette: pal && { ground: hex(pal.ground), line: hex(pal.line), accent: hex(pal.accent) },
              }
            : pal
              ? { record: '#8f897b', deep: '#4a463e', palette: { ground: hex(pal.ground), line: hex(pal.line), accent: hex(pal.accent) } }
              : null,
        )
      } catch {
        resolve(null) // tainted canvas or no 2D context: the machine stays in print grey
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  }).then((c) => {
    cache.set(src, c)
    pending.delete(src)
    return c
  })
  pending.set(src, job)
  return job
}

/** The colours of a cover. Keeps the previous colours while the next cover loads, so nothing blinks. */
export function useRecordColours(src: string | null): RecordColours | null {
  const [last, setLast] = useState<RecordColours | null>(null)
  useEffect(() => {
    if (!src || cache.has(src)) return
    let cancelled = false
    void sample(src).then((colours) => {
      if (!cancelled) setLast(colours)
    })
    return () => {
      cancelled = true
    }
  }, [src])
  if (!src) return null
  return cache.has(src) ? (cache.get(src) ?? null) : last
}
