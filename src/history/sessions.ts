// Days, sessions and streaks from the listening log. Pure.

import type { Play, Session } from './types'

/** A gap longer than this ends a session. */
export const SESSION_GAP_MS = 25 * 60_000

const end = (p: Play) => p.ts + p.playedMs

/** Sessions, oldest first. `n` counts from the first session in `plays`, starting at `firstN`. */
export function sessionsFrom(plays: Play[], firstN = 1): Session[] {
  const sorted = [...plays].sort((a, b) => a.ts - b.ts)
  const out: Session[] = []
  for (const p of sorted) {
    const last = out[out.length - 1]
    if (last && p.ts - last.end <= SESSION_GAP_MS) {
      last.plays.push(p)
      last.end = Math.max(last.end, end(p))
    } else {
      out.push({ n: firstN + out.length, start: p.ts, end: end(p), plays: [p], heardMs: 0, longestRun: { length: 0, start: p.ts } })
    }
  }
  for (const s of out) {
    s.heardMs = s.plays.reduce((sum, p) => sum + p.playedMs, 0)
    let run = 0
    let runStart = s.start
    for (const p of s.plays) {
      if (p.skipped) {
        run = 0
        continue
      }
      if (run === 0) runStart = p.ts
      run++
      if (run > s.longestRun.length) s.longestRun = { length: run, start: runStart }
    }
  }
  return out
}

/** Local calendar day key, e.g. "2026-09-29". */
export function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Days in a row with at least one play, counting back from `today` (or yesterday, if today has none yet). */
export function streak(plays: Play[], today: number) {
  const days = new Set(plays.map((p) => dayKey(p.ts)))
  const d = new Date(today)
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d.getTime()))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/**
 * The day as stacks of records: each play is placed in a `binMs`-wide column at its
 * start time, and stacks upward within the column. Hours are measured from `dayStart`.
 */
export function stacks(plays: Play[], dayStart: number, binMs = 20 * 60_000) {
  const columns = new Map<number, number>()
  return [...plays]
    .sort((a, b) => a.ts - b.ts)
    .map((p) => {
      const col = Math.floor((p.ts - dayStart) / binMs)
      const level = columns.get(col) ?? 0
      columns.set(col, level + 1)
      return { play: p, col, level }
    })
}
