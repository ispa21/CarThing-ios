// ARCHIVE: long-term memory — your eras, then vs now, a month's soundtrack, and
// time capsules sealed once a month on this device. Pure.

import type { TrackRef } from '../history/types'
import { fmt, monthName, play, playFor, plural, upTo, type Card } from './cards'
import { lead, type Model } from './model'
import { DAY, LISTEN_MS } from './stats'

const tracksOf = (m: Model, uris: Iterable<string>) => [...uris].map((u) => m.track(u)).filter((t): t is TrackRef => t !== null)

/** A snapshot of your sound, sealed once a month. */
export interface Capsule {
  at: number
  artists: string[]
  rooms: string[]
  emerging: string[]
  uris: string[]
}

function topWithin(m: Model, from: number, to: number) {
  const c = new Map<string, number>()
  for (const p of m.plays) if (p.ts >= from && p.ts < to && p.playedMs >= LISTEN_MS) c.set(p.uri, (c.get(p.uri) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1])
}

export function capsuleOf(m: Model): Capsule | null {
  const top = topWithin(m, m.now - 30 * DAY, m.now + 1)
  if (top.length < 10) return null
  const artists = new Map<string, number>()
  for (const [u, n] of top) artists.set(m.primary(u), (artists.get(m.primary(u)) ?? 0) + n)
  const emerging = [...artists.keys()].filter((a) => {
    const first = Math.min(...(m.statsByArtist.get(a) ?? []).map((s) => s.first))
    return first >= m.now - 60 * DAY && (artists.get(a) ?? 0) >= 5
  })
  const rooms = new Map<string, number>()
  for (const [a, n] of artists) {
    const r = m.rooms.find((x) => x.id === m.roomOf.get(a))
    if (r) rooms.set(r.name, (rooms.get(r.name) ?? 0) + n)
  }
  return {
    at: m.now,
    artists: [...artists.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([a]) => a),
    rooms: [...rooms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r]) => r),
    emerging: emerging.slice(0, 4),
    uris: top.slice(0, 12).map(([u]) => u),
  }
}

export function timeCapsule(m: Model, capsules: Capsule[]): Card | null {
  const old = capsules.filter((c) => c.at <= m.now - 60 * DAY).sort((a, b) => a.at - b.at)[0]
  if (!old) {
    const now = capsuleOf(m)
    if (!now) return null
    return {
      id: 'capsule',
      depth: 'archive',
      job: 'understand',
      kicker: `music time capsule · sealed ${monthName(m.now).toLowerCase()} ${new Date(m.now).getFullYear()}`,
      headline: `Your ${monthName(m.now)} sound.`,
      lede: 'PartyDeck seals one of these every month, on this device. Months from now, it will show you who you were.',
      figures: [{ kind: 'rows', rows: [...now.artists.slice(0, 5).map((a) => ({ title: a, sub: 'core' })), ...now.emerging.map((a) => ({ title: a, sub: 'emerging' }))] }],
      actions: [play(`Play your ${monthName(m.now)} sound`, tracksOf(m, now.uris), `${monthName(m.now)} sound`)],
      weight: 0.35,
    }
  }
  const when = `${monthName(old.at)} ${new Date(old.at).getFullYear()}`
  const kept = old.artists.filter((a) => (m.statsByArtist.get(a) ?? []).some((s) => s.listens > 0 && s.last >= m.now - 30 * DAY))
  return {
    id: 'capsule',
    depth: 'archive',
    job: 'understand',
    kicker: `music time capsule · ${when.toLowerCase()}`,
    headline: `Your ${when} self sounded like this.`,
    lede: `${old.rooms.length ? `Mostly ${old.rooms.join(', ')}. ` : ''}${kept.length ? `You still play ${kept.slice(0, 3).join(', ')}.` : 'None of those artists made it to this month.'}`,
    figures: [{ kind: 'rows', rows: old.artists.slice(0, 6).map((a) => ({ title: a, trail: kept.includes(a) ? 'still here' : 'gone' })) }],
    actions: [play(`Play your ${when} sound`, tracksOf(m, old.uris), `${when} sound`)],
    weight: 0.6,
  }
}

export function eras(m: Model): Card | null {
  const L = m.plays.filter((p) => p.playedMs >= LISTEN_MS)
  if (L.length < 300) return null
  const Q = 91 * DAY
  const quarters: Array<{ start: number; room: string | null }> = []
  for (let t = L[0].ts; t < m.now; t += Q) {
    const c = new Map<string, number>()
    let n = 0
    for (const p of L) {
      if (p.ts < t || p.ts >= t + Q) continue
      const r = m.roomOf.get(lead(p.artist))
      n++
      if (r) c.set(r, (c.get(r) ?? 0) + 1)
    }
    const top = [...c.entries()].sort((a, b) => b[1] - a[1])[0]
    quarters.push({ start: t, room: n >= 20 && top && top[1] / n >= 0.25 ? top[0] : null })
  }
  const list: Array<{ room: string; from: number; to: number }> = []
  for (const q of quarters) {
    if (!q.room) continue
    const last = list[list.length - 1]
    if (last && last.room === q.room) last.to = q.start + Q
    else list.push({ room: q.room, from: q.start, to: q.start + Q })
  }
  if (list.length < 2) return null
  const yr = (t: number) => new Date(t).getFullYear()
  const name = (id: string) => m.rooms.find((r) => r.id === id)?.name ?? '?'
  const first = list[0]
  const firstEra = upTo(
    tracksOf(
      m,
      topWithin(m, first.from, first.to).map(([u]) => u),
    ),
    30,
  )
  return {
    id: 'eras',
    depth: 'archive',
    job: 'understand',
    kicker: 'your music eras',
    headline: `${plural(list.length, 'era')}, so far.`,
    lede: `From ${name(first.room)} to ${name(list[list.length - 1].room)}. Each era is the sound that ruled a stretch of months.`,
    figures: [{ kind: 'rows', rows: list.slice(-6).map((e, i) => ({ title: `era ${String(i + 1).padStart(2, '0')} — ${name(e.room)}`, trail: yr(e.from) === yr(e.to - 1) ? String(yr(e.from)) : `${yr(e.from)}–${yr(e.to - 1)}` })) }],
    actions: firstEra.length >= 3 ? [playFor('Time machine: era 01', firstEra, `era 01, ${name(first.room)}`)] : [],
    weight: 0.55,
  }
}

export function thenVsNow(m: Model): Card | null {
  const L = m.plays.filter((p) => p.playedMs >= LISTEN_MS)
  if (!L.length) return null
  const firstYear = new Date(L[0].ts).getFullYear()
  const thisYear = new Date(m.now).getFullYear()
  if (thisYear - firstYear < 2) return null
  const then = topWithin(m, new Date(firstYear, 0, 1).getTime(), new Date(firstYear + 1, 0, 1).getTime())
  const now = topWithin(m, m.now - 90 * DAY, m.now + 1)
  if (then.length < 5 || now.length < 5) return null
  const a = tracksOf(
    m,
    then.slice(0, 5).map(([u]) => u),
  )
  const b = tracksOf(
    m,
    now.slice(0, 5).map(([u]) => u),
  )
  const overlap = a.filter((t) => b.some((x) => x.uri === t.uri)).length
  return {
    id: 'then-now',
    depth: 'archive',
    job: 'understand',
    kicker: 'then vs now',
    headline: `${firstYear} you vs ${thisYear} you.`,
    lede: overlap ? `${overlap} of your ${firstYear} favourites are still in your top five.` : `Not one of your ${firstYear} favourites is in your top five now.`,
    figures: [{ kind: 'covers', tracks: [a[0], b[0]], arrows: true }, { kind: 'rows', rows: a.slice(0, 3).map((t, i) => ({ title: t.title, sub: `${firstYear}`, trail: b[i] ? `now: ${b[i].title}` : '' })) }],
    actions: [play('Then, then now', [...a, ...b], `${firstYear} then ${thisYear}`)],
    weight: 0.5,
  }
}

export function monthSoundtrack(m: Model): Card | null {
  let best: { start: number; top: Array<[string, number]>; total: number } | null = null
  for (let i = 1; i <= 12; i++) {
    const d = new Date(m.now)
    const start = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime()
    const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime()
    const top = topWithin(m, start, end)
    const total = top.reduce((s, [, n]) => s + n, 0)
    if (total >= 40 && (!best || total > best.total)) best = { start, top, total }
  }
  if (!best) return null
  const tracks = tracksOf(
    m,
    best.top.slice(0, 12).map(([u]) => u),
  )
  const label = `${monthName(best.start)} ${new Date(best.start).getFullYear()}`
  return {
    id: 'month',
    depth: 'archive',
    job: 'understand',
    kicker: 'the soundtrack of a month',
    headline: `The soundtrack of ${label}.`,
    lede: `Your busiest month of the last year: ${fmt(best.total)} listens. These twelve carried it.`,
    figures: [{ kind: 'covers', tracks: tracks.slice(0, 4) }],
    actions: [playFor('Play it back', tracks, `the soundtrack of ${label}`), { kind: 'save', label: 'Save the soundtrack', name: `Soundtrack · ${label}`, description: `What ${label} sounded like. Made with PartyDeck.`, uris: tracks.map((t) => t.uri) }],
    weight: 0.45,
  }
}
