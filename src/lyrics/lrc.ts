// LRC parser. Pure, provider-agnostic, no Spotify imports.
//
// Supports: [mm:ss] [mm:ss.x] [mm:ss.xx] [mm:ss.xxx] [mm:ss:xx], several stamps per
// line, [offset:±ms], metadata tags ([ar:], [ti:] …), enhanced-LRC <mm:ss.xx> word
// stamps (stripped), CRLF, BOM. Malformed stamps and untimed lines are skipped.

export type LyricLine = {
  startMs: number
  /** Empty string = an instrumental gap. */
  text: string
}

const STAMP = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/
const META = /^([a-z]+):(.*)$/i
const WORD_STAMP = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g

/** "01:02.34" → 62340. Returns null if it isn't a valid timestamp. */
export function parseTimestamp(tag: string): number | null {
  const m = STAMP.exec(tag.trim())
  if (!m) return null
  const minutes = Number(m[1])
  const seconds = Number(m[2])
  if (seconds > 59) return null
  const frac = m[3] ?? ''
  // 1 digit = tenths, 2 = hundredths, 3 = milliseconds
  const ms = frac ? Math.round(Number(frac) * 10 ** (3 - frac.length)) : 0
  return (minutes * 60 + seconds) * 1000 + ms
}

export function parseLRC(input: string): LyricLine[] {
  const out: Array<LyricLine & { order: number }> = []
  let offset = 0
  let order = 0

  for (const raw of input.replace(/^﻿/, '').split(/\r?\n/)) {
    let rest = raw.trim()
    if (!rest) continue
    const stamps: number[] = []

    while (rest.startsWith('[')) {
      const end = rest.indexOf(']')
      if (end < 0) break
      const tag = rest.slice(1, end)
      const time = parseTimestamp(tag)
      if (time != null) {
        stamps.push(time)
      } else if (stamps.length) {
        break // e.g. "[00:12.00][Chorus] …" — the bracket belongs to the text
      } else {
        const meta = META.exec(tag)
        if (!meta) break // malformed stamp like [0a:12] — drop the line
        if (meta[1].toLowerCase() === 'offset') {
          const n = Number(meta[2].trim())
          if (Number.isFinite(n)) offset = n
        }
      }
      rest = rest.slice(end + 1)
    }

    if (!stamps.length) continue
    const text = rest.replace(WORD_STAMP, '').replace(/\s+/g, ' ').trim()
    for (const t of stamps) out.push({ startMs: t, text, order: order++ })
  }

  // Positive offset = lyrics appear sooner (LRC convention).
  return out
    .sort((a, b) => a.startMs - b.startMs || a.order - b.order)
    .map(({ startMs, text }) => ({ startMs: Math.max(0, startMs - offset), text }))
}
