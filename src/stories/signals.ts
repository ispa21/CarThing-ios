// SIGNALS: things PartyDeck noticed about how you listen — taste, habits, time and
// playlists. Each is evidence first, then something to play. Pure.

import type { Play, TrackRef } from '../history/types'
import { ago, fmt, monthName, pct, play, playFor, plural, shortDate, upTo, word, type Card } from './cards'
import { bandOf, BANDS, lead, type Band, type Model } from './model'
import { buildRiskSession } from './session'
import { DAY, LISTEN_MS, rng, shuffle } from './stats'

const tracksOf = (m: Model, uris: Iterable<string>) => [...uris].map((u) => m.track(u)).filter((t): t is TrackRef => t !== null)
const byListens = (m: Model) => (a: TrackRef, b: TrackRef) => (m.stats.get(b.uri)?.listens ?? 0) - (m.stats.get(a.uri)?.listens ?? 0)
const listens = (m: Model) => m.plays.filter((p) => p.playedMs >= LISTEN_MS)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`

export function yourCore(m: Model): Card | null {
  if (m.core.size < 15) return null
  const saved = m.library.length
  const artists = new Set([...m.core].map(m.primary))
  const rooms = new Set([...artists].map((a) => m.roomOf.get(a)).filter(Boolean))
  const set = upTo(tracksOf(m, m.core).sort(byListens(m)), 30)
  return {
    id: 'core',
    depth: 'signals',
    job: 'understand',
    kicker: 'your core',
    headline: saved ? `${fmt(saved)} saved. You live in ${fmt(m.core.size)}.` : `You live in ${fmt(m.core.size)} tracks.`,
    lede: `${fmt(m.core.size)} tracks make up 80% of everything you played this year — ${plural(artists.size, 'artist')}${rooms.size ? `, ${plural(rooms.size, 'sound')}` : ''}.`,
    figures: [{ kind: 'counts', items: [{ value: fmt(m.core.size), label: 'tracks' }, { value: fmt(artists.size), label: 'artists' }, { value: fmt(rooms.size), label: 'sounds' }] }],
    actions: [playFor('Play the core', set, 'your core'), { kind: 'build', label: 'Explore outside it', risk: 'risky' }],
    weight: 0.6,
    share: saved ? `I have ${fmt(saved)} songs, but PartyDeck found the ${fmt(m.core.size)} I actually live in.` : undefined,
  }
}

export function secretGenre(m: Model, seed: number): Card | null {
  const room = m.rooms.find((r) => r.band && r.listens >= 20)
  if (!room) return null
  const base = room.name.replace(/^the /, '').replace(/ sound$/, '')
  // A room already named for a time of day ("night drive") doesn't need the band again.
  const name = (/morning|afternoon|evening|night|midnight|late/i.test(base) ? base : `${room.band} ${base}`).toUpperCase()
  const set = buildRiskSession(m, { minutes: 30, risk: 'curious', seed, uris: room.uris })
  if (set.length < 4) return null
  return {
    id: 'secret-genre',
    depth: 'signals',
    job: 'understand',
    kicker: 'your secret genre',
    headline: name,
    lede: `Not a Spotify genre. It's what ${room.artists.slice(0, 3).join(', ')} have in common in your listening: the same playlists, the same sessions, and ${pct(room.bandShare)} of it played in the ${room.band}.`,
    figures: [{ kind: 'formula', parts: [...room.artists.slice(0, 3), room.band ?? ''], result: name }, { kind: 'counts', items: [{ value: fmt(room.uris.length), label: 'tracks belong here' }] }],
    actions: [playFor('Play my secret genre', set, name.toLowerCase())],
    weight: 0.75,
    share: `Apparently I have a ${room.band} genre. PartyDeck calls it ${name}.`,
  }
}

/** Room shares per 30-day window, oldest first. */
function monthlyShares(m: Model, months: number) {
  const out: Array<{ start: number; total: number; share: Map<string, number> }> = []
  for (let i = months - 1; i >= 0; i--) {
    const end = m.now - i * 30 * DAY
    const start = end - 30 * DAY
    const share = new Map<string, number>()
    let total = 0
    for (const p of m.plays) {
      if (p.ts < start || p.ts >= end || p.playedMs < LISTEN_MS) continue
      const r = m.roomOf.get(lead(p.artist))
      total++
      if (r) share.set(r, (share.get(r) ?? 0) + 1)
    }
    for (const [k, v] of share) share.set(k, total ? v / total : 0)
    out.push({ start, total, share })
  }
  return out
}

export function drift(m: Model): Card | null {
  const months = monthlyShares(m, 6)
  if (months.some((x) => x.total < 15)) return null
  let best: { id: string; rise: number } | null = null
  for (const r of m.rooms) {
    const early = ((months[0].share.get(r.id) ?? 0) + (months[1].share.get(r.id) ?? 0)) / 2
    const late = ((months[4].share.get(r.id) ?? 0) + (months[5].share.get(r.id) ?? 0)) / 2
    if (late - early >= 0.12 && late >= 0.2 && (!best || late - early > best.rise)) best = { id: r.id, rise: late - early }
  }
  if (!best) return null
  const room = m.rooms.find((r) => r.id === best!.id)!
  const evolution = upTo(
    tracksOf(m, room.uris)
      .filter((t) => m.stats.get(t.uri)?.listens)
      .sort((a, b) => (m.stats.get(a.uri)!.first ?? 0) - (m.stats.get(b.uri)!.first ?? 0)),
    35,
  )
  return {
    id: 'drift',
    depth: 'signals',
    job: 'understand',
    kicker: 'accidental obsession',
    headline: `You drifted into ${room.name}.`,
    lede: `It was ${pct(months[0].share.get(room.id) ?? 0)} of your listening six months ago. Now it's ${pct(months[5].share.get(room.id) ?? 0)}. You didn't switch — you slid.`,
    figures: [{ kind: 'meter', bars: months.map((x, i) => ({ label: monthName(x.start + 15 * DAY).slice(0, 3).toLowerCase(), value: x.share.get(room.id) ?? 0, hot: i === months.length - 1 })) }],
    actions: [playFor('Follow the drift', evolution, `the drift into ${room.name}`)],
    weight: 0.7,
    share: `My listening slid into ${room.name} over six months. I didn't notice. PartyDeck did.`,
  }
}

export function tasteCliff(m: Model): Card | null {
  const L = listens(m)
  if (L.length < 120) return null
  // Room counts per week, once; each window is then a sum of four weeks.
  const WEEK = 7 * DAY
  const w0 = Math.floor(L[0].ts / WEEK)
  const weeks: Array<Map<string, number>> = []
  for (const p of L) {
    const r = m.roomOf.get(lead(p.artist))
    if (!r) continue
    const i = Math.floor(p.ts / WEEK) - w0
    while (weeks.length <= i) weeks.push(new Map())
    weeks[i].set(r, (weeks[i].get(r) ?? 0) + 1)
  }
  const sum = (from: number, to: number) => {
    const c = new Map<string, number>()
    let n = 0
    for (let i = Math.max(0, from); i < Math.min(weeks.length, to); i++)
      for (const [r, k] of weeks[i]) {
        c.set(r, (c.get(r) ?? 0) + k)
        n += k
      }
    return { c, n }
  }
  let best: { t: number; tv: number; before: string; after: string } | null = null
  for (let i = 4; i + 4 <= weeks.length; i++) {
    const a = sum(i - 4, i)
    const b = sum(i, i + 4)
    if (a.n < 25 || b.n < 25) continue
    let tv = 0
    for (const r of new Set([...a.c.keys(), ...b.c.keys()])) tv += Math.abs((a.c.get(r) ?? 0) / a.n - (b.c.get(r) ?? 0) / b.n)
    tv /= 2
    const top = (x: Map<string, number>) => [...x.entries()].sort((p, q) => q[1] - p[1])[0][0]
    if (tv >= 0.45 && (!best || tv > best.tv) && top(a.c) !== top(b.c)) best = { t: (w0 + i) * WEEK, tv, before: top(a.c), after: top(b.c) }
  }
  if (!best) return null
  const before = m.rooms.find((r) => r.id === best!.before)!
  const after = m.rooms.find((r) => r.id === best!.after)!
  const arrived = upTo(
    tracksOf(m, after.uris)
      .filter((t) => {
        const f = m.stats.get(t.uri)?.first ?? 0
        return f >= best!.t - 7 * DAY && f < best!.t + 28 * DAY
      })
      .sort(byListens(m)),
    30,
  )
  if (arrived.length < 3) return null
  return {
    id: 'cliff',
    depth: 'signals',
    job: 'understand',
    kicker: 'taste cliff',
    headline: `Something changed around ${shortDate(best.t)}.`,
    lede: `Before: mostly ${before.name}. After: mostly ${after.name}. ${pct(best.tv)} of your listening changed places in a month.`,
    figures: [{ kind: 'path', steps: [{ label: before.name, note: 'before' }, { label: after.name, note: 'after' }] }],
    actions: [playFor('Explore the cliff', arrived, 'the cliff')],
    weight: 0.8,
  }
}

export function theLoop(m: Model): Card | null {
  const recent = m.sessions.filter((s) => s.plays.filter((p) => p.playedMs >= LISTEN_MS).length >= 3).slice(-11)
  if (recent.length < 8) return null
  const inSessions = new Map<string, number>()
  for (const s of recent) for (const u of new Set(s.plays.filter((p) => p.playedMs >= LISTEN_MS).map((p) => p.uri))) inSessions.set(u, (inSessions.get(u) ?? 0) + 1)
  const loop = [...inSessions.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
  if (loop.length < 5 || loop.length > 40) return null
  const tracks = tracksOf(
    m,
    loop.map(([u]) => u),
  )
  const saved = m.library.length
  return {
    id: 'loop',
    depth: 'signals',
    job: 'understand',
    kicker: 'the loop',
    headline: saved ? `${fmt(saved)} tracks. These ${fmt(loop.length)} keep winning.` : `These ${fmt(loop.length)} keep winning.`,
    lede: `In your last ${recent.length} sessions, the same ${word(loop.length)} tracks turned up again and again. Are these your actual favourites?`,
    figures: [{ kind: 'rows', rows: tracks.slice(0, 5).map((t) => ({ title: t.title, sub: t.artist, trail: `${inSessions.get(t.uri)}/${recent.length} sessions` })) }],
    actions: [{ kind: 'save', label: 'Make them official', name: `CORE / ${new Date(m.now).getFullYear()}`, description: 'The tracks that keep winning. Found by PartyDeck.', uris: tracks.map((t) => t.uri) }, play('Play the loop', tracks, 'the loop', false)],
    weight: 0.7,
    share: saved ? `I have ${fmt(saved)} songs. Somehow these ${loop.length} keep winning.` : undefined,
  }
}

interface NewTrack {
  uri: string
  first: number
  firstBand: Band
  listens: number
  weeks: number
  saved: boolean
}

function newTracks(m: Model, sinceDays = 365, settleDays = 30): NewTrack[] {
  const out: NewTrack[] = []
  const fromLog = m.plays.length ? m.plays[0].ts + 14 * DAY : m.now // the log's first fortnight isn't "new", it's just when we started watching
  for (const s of m.stats.values()) {
    if (!s.listens || s.first < m.now - sinceDays * DAY || s.first > m.now - settleDays * DAY || s.first < fromLog) continue
    const l = m.lib.get(s.track.uri)
    out.push({ uri: s.track.uri, first: s.first, firstBand: bandOf(new Date(s.first).getHours()), listens: s.listens, weeks: new Set(s.times.map((t) => Math.floor(t / (7 * DAY)))).size, saved: Boolean(l?.liked || l?.playlists.length) })
  }
  return out
}

export function discoveryFunnel(m: Model): Card | null {
  const fresh = newTracks(m)
  if (fresh.length < 40) return null
  const replayed = fresh.filter((t) => t.listens >= 2)
  const saved = replayed.filter((t) => t.saved)
  const regular = fresh.filter((t) => t.weeks >= 3)
  const core = fresh.filter((t) => m.core.has(t.uri))
  const rate = regular.length / fresh.length
  const risk = rate < 0.05 ? 'safe' : rate < 0.15 ? 'curious' : 'risky'
  return {
    id: 'funnel',
    depth: 'signals',
    job: 'understand',
    kicker: 'discovery funnel',
    headline: `${pct(rate)} of new songs stay.`,
    lede: `Of ${fmt(fresh.length)} tracks you heard for the first time this year, ${fmt(regular.length)} became regulars. So PartyDeck won't flood you: your sessions start at ${risk.toUpperCase()}.`,
    figures: [
      {
        kind: 'path',
        steps: [
          { label: `${fmt(fresh.length)} new`, note: 'first heard this year' },
          { label: `${fmt(replayed.length)} replayed`, note: pct(replayed.length / fresh.length) },
          { label: `${fmt(saved.length)} saved`, note: pct(saved.length / fresh.length) },
          { label: `${fmt(regular.length)} regulars`, note: '3+ different weeks' },
          { label: `${fmt(core.length)} core`, note: pct(core.length / fresh.length) },
        ],
      },
    ],
    actions: [{ kind: 'build', label: `Build at ${risk}`, risk }],
    weight: 0.55,
  }
}

export function discoveryWindow(m: Model, seed: number): Card | null {
  const fresh = newTracks(m, 730)
  const by = new Map<Band, { n: number; kept: number }>()
  for (const t of fresh) {
    const e = by.get(t.firstBand) ?? { n: 0, kept: 0 }
    e.n++
    if (t.listens >= 3) e.kept++
    by.set(t.firstBand, e)
  }
  const rated = [...by.entries()].filter(([, e]) => e.n >= 10).map(([b, e]) => ({ band: b, rate: e.kept / e.n, n: e.n }))
  if (rated.length < 2) return null
  rated.sort((a, b) => b.rate - a.rate)
  const best = rated[0]
  const worst = rated[rated.length - 1]
  if (best.rate - worst.rate < 0.12) return null
  const set = buildRiskSession(m, { minutes: 30, risk: 'risky', seed })
  const now = bandOf(new Date(m.now).getHours())
  return {
    id: 'window',
    depth: 'signals',
    job: 'understand',
    kicker: 'your discovery window',
    headline: `New music works best for you in the ${best.band}.`,
    lede: `${pct(best.rate)} of songs you first hear in the ${best.band} stick, against ${pct(worst.rate)} in the ${worst.band}. You discover in the ${best.band}. You repeat in the ${worst.band}.`,
    figures: [{ kind: 'meter', bars: BANDS.filter((b) => by.has(b)).map((b) => ({ label: b, value: (by.get(b)!.kept || 0) / by.get(b)!.n, note: `${by.get(b)!.n} new`, hot: b === best.band })) }],
    actions: [now === best.band ? playFor('Start a discovery session', set, `${best.band} discovery`) : { kind: 'build', label: `Build one for the ${best.band}`, risk: 'risky' }],
    weight: 0.6,
  }
}

export function repeatThreshold(m: Model): Card | null {
  const tiers = [
    { label: '1 play', min: 1, max: 1 },
    { label: '2 plays', min: 2, max: 2 },
    { label: '3–5', min: 3, max: 5 },
    { label: '6–10', min: 6, max: 10 },
    { label: '10+', min: 11, max: Infinity },
  ]
  const stat = tiers.map(() => ({ n: 0, stuck: 0 }))
  for (const s of m.stats.values()) {
    if (!s.listens || s.first > m.now - 90 * DAY) continue
    const early = s.times.filter((t) => t < s.first + 30 * DAY).length
    const later = new Set(s.times.filter((t) => t >= s.first + 30 * DAY).map((t) => Math.floor(t / (7 * DAY)))).size
    const i = tiers.findIndex((x) => early >= x.min && early <= x.max)
    if (i < 0) continue
    stat[i].n++
    if (later >= 3) stat[i].stuck++
  }
  if (stat.filter((x) => x.n >= 5).length < 3) return null
  const at = stat.findIndex((x) => x.n >= 5 && x.stuck / x.n >= 0.5)
  if (at < 1) return null
  const need = tiers[at].min
  const candidates = [...m.stats.values()]
    .filter((s) => s.first >= m.now - 30 * DAY && s.listens >= Math.max(1, need - 2) && s.listens < need)
    .map((s) => m.track(s.track.uri))
    .filter((t): t is TrackRef => t !== null)
  return {
    id: 'threshold',
    depth: 'signals',
    job: 'understand',
    kicker: 'your repeat threshold',
    headline: `${need} ${need === 1 ? 'play' : 'plays'} in the first month, and a song is yours.`,
    lede: `Below that, most songs fade. Above it, ${pct(stat[at].stuck / stat[at].n)} of them are still in your life months later.${candidates.length ? ` ${cap(word(candidates.length))} ${candidates.length === 1 ? 'song is' : 'songs are'} one or two plays away right now.` : ''}`,
    figures: [{ kind: 'meter', bars: tiers.map((t, i) => ({ label: t.label, value: stat[i].n ? stat[i].stuck / stat[i].n : 0, note: stat[i].n ? `${stat[i].n} songs` : '—', hot: i === at })) }],
    actions: candidates.length >= 2 ? [playFor('Play the candidates', upTo(candidates, 30), 'the candidates')] : [{ kind: 'build', label: 'Build a session', risk: 'curious' }],
    weight: 0.55,
  }
}

export function antiTaste(m: Model, seed: number): Card | null {
  const P = m.plays.filter((p) => p.source !== 'recent') // recently-played can't tell skips
  if (P.length < 150) return null
  const base = P.filter((p) => p.skipped).length / P.length
  const firstPlay = new Set<Play>()
  const seen = new Set<string>()
  for (const p of P) {
    if (seen.has(p.uri)) continue
    seen.add(p.uri)
    firstPlay.add(p)
  }
  const features: Array<{ label: string; test: (p: Play) => boolean }> = [
    { label: 'songs over six minutes', test: (p) => (p.durationMs || m.track(p.uri)?.durationMs || 0) > 360_000 },
    { label: 'songs under two minutes', test: (p) => {
      const d = p.durationMs || m.track(p.uri)?.durationMs || 0
      return d > 0 && d < 120_000
    } },
    { label: 'first listens', test: (p) => firstPlay.has(p) },
    ...BANDS.map((b) => ({ label: `the ${b}`, test: (p: Play) => bandOf(new Date(p.ts).getHours()) === b })),
    ...m.rooms.slice(0, 6).map((r) => ({ label: r.name, test: (p: Play) => m.roomOf.get(lead(p.artist)) === r.id })),
  ]
  const found = features
    .map((f) => {
      const hit = P.filter(f.test)
      const rate = hit.length ? hit.filter((p) => p.skipped).length / hit.length : 0
      return { ...f, n: hit.length, rate }
    })
    .filter((f) => f.n >= 20 && f.rate >= base * 1.5 && f.rate - base >= 0.12)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
  if (!found.length) return null
  const exclude = new Set(P.filter((p) => found.some((f) => f.test(p))).map((p) => p.uri))
  const set = buildRiskSession(m, { minutes: 30, risk: 'curious', seed, exclude })
  return {
    id: 'anti-taste',
    depth: 'signals',
    job: 'understand',
    kicker: 'your anti-taste',
    headline: 'What you skip, even when you like the artist.',
    lede: `You skip ${pct(base)} of songs overall. These run much higher — across ${fmt(found.reduce((s, f) => s + f.n, 0))} plays. PartyDeck's sessions now lean away from them.`,
    figures: [{ kind: 'meter', bars: [{ label: 'everything', value: base }, ...found.map((f) => ({ label: f.label, value: f.rate, note: `${f.n} plays`, hot: true }))] }],
    actions: set.length >= 4 ? [playFor('A session without them', set, 'without the skips')] : [{ kind: 'build', label: 'Build a session', risk: 'safe' }],
    weight: 0.55,
  }
}

export function bridgeTrack(m: Model): Card | null {
  const count = new Map<string, { n: number; pairs: Map<string, number> }>()
  for (const s of m.sessions) {
    const L = s.plays.filter((p) => p.playedMs >= LISTEN_MS)
    for (let i = 1; i < L.length - 1; i++) {
      const a = m.roomOf.get(lead(L[i - 1].artist))
      const b = m.roomOf.get(lead(L[i + 1].artist))
      if (!a || !b || a === b) continue
      const e = count.get(L[i].uri) ?? { n: 0, pairs: new Map<string, number>() }
      e.n++
      e.pairs.set(`${a}>${b}`, (e.pairs.get(`${a}>${b}`) ?? 0) + 1)
      count.set(L[i].uri, e)
    }
  }
  const [uri, e] = [...count.entries()].sort((a, b) => b[1].n - a[1].n)[0] ?? []
  if (!uri || !e || e.n < 3) return null
  const t = m.track(uri)
  if (!t) return null
  const name = (id: string) => m.rooms.find((r) => r.id === id)?.name ?? '?'
  const pairs = [...e.pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  return {
    id: 'bridge-track',
    depth: 'signals',
    job: 'understand',
    kicker: 'the song you use as a bridge',
    headline: t.title,
    lede: `${plural(e.n, 'time')}, ${t.title} sat exactly between two different sounds in your sessions. It's how you change the subject.`,
    figures: [{ kind: 'rows', rows: pairs.map(([k, n]) => ({ title: `${name(k.split('>')[0])} → ${name(k.split('>')[1])}`, trail: `${n}×` })) }],
    actions: [play('Play it', [t], t.title)],
    weight: 0.7,
  }
}

export function oneNightStands(m: Model): Card | null {
  const byArtist = new Map<string, number[]>()
  for (const p of listens(m)) {
    const a = lead(p.artist)
    const list = byArtist.get(a)
    if (list) list.push(p.ts)
    else byArtist.set(a, [p.ts])
  }
  const found = [...byArtist.entries()]
    .filter(([, t]) => t.length >= 5 && t[t.length - 1] - t[0] <= 7 * DAY && m.now - t[t.length - 1] >= 30 * DAY)
    .sort((a, b) => b[1].length - a[1].length)
  if (!found.length) return null
  const tracks = found.slice(0, 5).flatMap(([a]) =>
    tracksOf(
      m,
      (m.statsByArtist.get(a) ?? []).map((s) => s.track.uri),
    )
      .sort(byListens(m))
      .slice(0, 2),
  )
  return {
    id: 'one-night',
    depth: 'signals',
    job: 'discover',
    kicker: 'one-night stands',
    headline: found.length === 1 ? `${found[0][0]}: one week, then never again.` : `${cap(word(found.length))} artists, less than a week each.`,
    lede: `You played ${found.length === 1 ? 'them' : 'each of them'} hard for a few days, then never went back. Maybe you weren’t done.`,
    figures: [{ kind: 'rows', rows: found.slice(0, 5).map(([a, t]) => ({ title: a, sub: `${shortDate(t[0])}`, trail: `${t.length} plays` })) }],
    actions: [playFor('Return', tracks, 'one-night stands')],
    weight: 0.55,
  }
}

export function disappearingArtist(m: Model): Card | null {
  const found = [...m.artistListens.entries()]
    .filter(([a, n]) => {
      if (n < 25) return false
      const last = Math.max(...(m.statsByArtist.get(a) ?? []).map((s) => s.last))
      return m.now - last >= 180 * DAY
    })
    .sort((a, b) => b[1] - a[1])[0]
  if (!found) return null
  const [artist, n] = found
  const mine = m.statsByArtist.get(artist) ?? []
  const last = Math.max(...mine.map((s) => s.last))
  const years = new Map<number, number>()
  for (const s of mine) for (const t of s.times) years.set(new Date(t).getFullYear(), (years.get(new Date(t).getFullYear()) ?? 0) + 1)
  const first = Math.min(...years.keys())
  const lastYear = new Date(m.now).getFullYear()
  const top = tracksOf(
    m,
    mine.map((s) => s.track.uri),
  )
    .sort(byListens(m))
    .slice(0, 5)
  return {
    id: 'disappearing',
    depth: 'signals',
    job: 'understand',
    kicker: 'where did they go?',
    headline: `${artist}.`,
    lede: `${plural(n, 'play')}, then nothing since ${monthName(last)} ${new Date(last).getFullYear()} — ${ago(last, m.now)}.`,
    figures: [{ kind: 'columns', bars: Array.from({ length: lastYear - first + 1 }, (_, i) => ({ label: String(first + i), value: years.get(first + i) ?? 0 })) }],
    actions: [playFor('One last listen', top, `one last listen: ${artist}`)],
    weight: 0.6,
  }
}

export function introTest(m: Model): Card | null {
  const found = [...m.stats.values()].filter((s) => {
    if (s.starts < 4) return false
    return (m.earlyExits.get(s.track.uri) ?? 0) / s.starts >= 0.75
  })
  if (found.length < 3) return null
  const tracks = tracksOf(
    m,
    found.sort((a, b) => b.starts - a.starts).map((s) => s.track.uri),
  ).slice(0, 5)
  return {
    id: 'intro-test',
    depth: 'signals',
    job: 'understand',
    kicker: 'the intro test',
    headline: 'Songs that never make it past 30 seconds.',
    lede: `You start ${word(found.length)} songs again and again and leave almost every time before the first half-minute is up. Maybe the song starts after the intro.`,
    figures: [{ kind: 'rows', rows: tracks.map((t) => ({ title: t.title, sub: t.artist, trail: `${m.stats.get(t.uri)?.starts} starts` })) }],
    actions: [play('Give them the full length', tracks, 'the intro test', false)],
    weight: 0.5,
  }
}

export function libraryFraud(m: Model, seed: number): Card | null {
  const found = m.library.filter((t) => t.liked && t.playlists.length >= 2 && t.addedAt && t.addedAt <= m.now - 365 * DAY && (m.stats.get(t.uri)?.listens ?? 0) <= 1)
  if (found.length < 20) return null
  const pick = shuffle(found, rng(seed)).slice(0, 12)
  return {
    id: 'fraud',
    depth: 'signals',
    job: 'discover',
    kicker: 'library fraud',
    headline: `${fmt(found.length)} songs collected, not listened to.`,
    lede: 'Liked, filed in two or more playlists, saved over a year ago — and played once at most. Let’s stop pretending, or start listening.',
    actions: [playFor('Rediscover twelve', pick, 'library fraud'), { kind: 'dismiss', label: 'Keep them anyway' }],
    weight: 0.6,
    share: `I've collected ${fmt(found.length)} songs I've basically never listened to.`,
  }
}

function playlistPlays(m: Model, id: string) {
  const uris = new Set(m.library.filter((t) => t.playlists.includes(id)).map((t) => t.uri))
  return { uris, plays: listens(m).filter((p) => uris.has(p.uri)) }
}

export function playlistDna(m: Model, seed: number): Card | null {
  // Which playlist gets played most: summed from per-track listens, not by rescanning plays.
  const members = new Map<string, number>()
  for (const t of m.library) for (const id of t.playlists) members.set(id, (members.get(id) ?? 0) + (m.stats.get(t.uri)?.listens ?? 0))
  const pick = m.playlists
    .filter((x) => x.count >= 20 && x.count <= 800 && (members.get(x.id) ?? 0) >= 30)
    .sort((a, b) => (members.get(b.id) ?? 0) - (members.get(a.id) ?? 0))[0]
  const p = pick ? { x: pick, ...playlistPlays(m, pick.id) } : null
  if (!p) return null
  const night = p.plays.filter((q) => bandOf(new Date(q.ts).getHours()) === 'late night').length / p.plays.length
  const perArtist = new Map<string, number>()
  for (const u of p.uris) perArtist.set(m.primary(u), (perArtist.get(m.primary(u)) ?? 0) + 1)
  const repeatArtists = [...p.uris].filter((u) => (perArtist.get(m.primary(u)) ?? 0) >= 3).length / p.uris.size
  const never = [...p.uris].filter((u) => !m.stats.get(u)?.listens).length / p.uris.size
  const roomMix = new Map<string, number>()
  for (const u of p.uris) {
    const r = m.roomOf.get(m.primary(u))
    if (r) roomMix.set(r, (roomMix.get(r) ?? 0) + 1)
  }
  const topRoom = [...roomMix.entries()].sort((a, b) => b[1] - a[1])[0]
  const roomName = topRoom ? m.rooms.find((r) => r.id === topRoom[0])?.name : null
  const bands = new Map<Band, number>()
  for (const q of p.plays) bands.set(bandOf(new Date(q.ts).getHours()), (bands.get(bandOf(new Date(q.ts).getHours())) ?? 0) + 1)
  const band = [...bands.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const set = buildRiskSession(m, { minutes: 30, risk: 'safe', seed, uris: [...p.uris] })
  const core = [...perArtist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a)
  return {
    id: 'dna',
    depth: 'signals',
    job: 'understand',
    kicker: `playlist dna · ${p.x.name.toLowerCase()}`,
    headline: `“${p.x.name}” is really ${roomName ?? 'its own thing'}${band ? `, in the ${band}` : ''}.`,
    lede: `${fmt(p.uris.size)} tracks, ${fmt(p.plays.length)} listens. Core artists: ${core.join(', ')}.`,
    figures: [
      {
        kind: 'meter',
        bars: [
          { label: 'played late at night', value: night },
          { label: 'from repeat artists', value: repeatArtists },
          { label: 'never played', value: never },
          ...(topRoom && roomName ? [{ label: roomName, value: topRoom[1] / p.uris.size, hot: true }] : []),
        ],
      },
    ],
    actions: set.length >= 4 ? [playFor('Its best 30 minutes', set, `${p.x.name}, 30 minutes`)] : [],
    weight: 0.5,
  }
}

const LABELS: Array<[RegExp, Band]> = [
  [/morning|sunrise|wake|breakfast|coffee/i, 'morning'],
  [/afternoon|lunch/i, 'afternoon'],
  [/evening|sunset|dusk/i, 'evening'],
  [/night|midnight|late|\b[1-4] ?am\b|nocturn/i, 'late night'],
]

export function wrongLabel(m: Model): Card | null {
  for (const x of m.playlists) {
    const said = LABELS.find(([re]) => re.test(x.name))?.[1]
    if (!said) continue
    const { plays } = playlistPlays(m, x.id)
    if (plays.length < 20) continue
    const bands = new Map<Band, number>()
    for (const q of plays) bands.set(bandOf(new Date(q.ts).getHours()), (bands.get(bandOf(new Date(q.ts).getHours())) ?? 0) + 1)
    const [actual, n] = [...bands.entries()].sort((a, b) => b[1] - a[1])[0]
    if (actual === said || (bands.get(said) ?? 0) / plays.length >= 0.25) continue
    const tracks = upTo(tracksOf(m, new Set(plays.map((q) => q.uri))).sort(byListens(m)), 30)
    return {
      id: 'wrong-label',
      depth: 'signals',
      job: 'understand',
      kicker: 'the wrong label',
      headline: `“${x.name}” isn't a ${said} playlist.`,
      lede: `Only ${pct((bands.get(said) ?? 0) / plays.length)} of its plays happen in the ${said}. ${pct(n / plays.length)} happen in the ${actual}. PartyDeck thinks it's a ${actual} playlist.`,
      figures: [{ kind: 'meter', bars: BANDS.map((b) => ({ label: b, value: (bands.get(b) ?? 0) / plays.length, hot: b === actual })) }],
      actions: [playFor(`Play it for the ${actual}`, tracks, `${x.name}, as it really is`)],
      weight: 0.7,
      share: `My playlist “${x.name}” is apparently a ${actual} playlist.`,
    }
  }
  return null
}

export function tasteWeather(m: Model, seed: number): Card | null {
  const week = listens(m).filter((p) => p.ts >= m.now - 7 * DAY)
  if (week.length < 20) return null
  const firstEver = new Map<string, number>()
  for (const s of m.stats.values()) firstEver.set(s.track.uri, s.first)
  const discovery = week.filter((p) => (firstEver.get(p.uri) ?? 0) >= m.now - 7 * DAY).length / week.length
  const plays = new Map<string, number>()
  for (const p of week) plays.set(p.uri, (plays.get(p.uri) ?? 0) + 1)
  const repetition = week.filter((p) => (plays.get(p.uri) ?? 0) >= 3).length / week.length
  const variety = new Set(week.map((p) => lead(p.artist))).size / week.length
  const rooms = new Map<string, number>()
  for (const p of week) {
    const r = m.roomOf.get(lead(p.artist))
    if (r) rooms.set(r, (rooms.get(r) ?? 0) + 1)
  }
  const top = [...rooms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const lvl = (x: number, lo: number, hi: number) => (x < lo ? 'low' : x > hi ? 'high' : 'medium')
  const main = top[0] ? m.rooms.find((r) => r.id === top[0][0]) : undefined
  const mood = repetition > 0.4 ? 'familiar' : discovery > 0.25 ? 'curious' : 'steady'
  const risk = discovery < 0.1 ? 'safe' : discovery > 0.25 ? 'risky' : 'curious'
  const set = buildRiskSession(m, { minutes: 30, risk, seed, uris: main?.uris })
  return {
    id: 'weather',
    depth: 'signals',
    job: 'understand',
    kicker: 'taste weather · this week',
    headline: `Tonight looks ${mood}${main ? `, with ${main.name}` : ''}.`,
    figures: [
      { kind: 'meter', bars: top.map(([id, n]) => ({ label: m.rooms.find((r) => r.id === id)?.name ?? '?', value: n / week.length })) },
      {
        kind: 'counts',
        items: [
          { value: lvl(discovery, 0.1, 0.25), label: 'visibility · discovery' },
          { value: lvl(repetition, 0.2, 0.4), label: 'pressure · repetition' },
          { value: lvl(variety, 0.15, 0.35), label: 'variety' },
        ],
      },
    ],
    actions: set.length >= 4 ? [playFor('Generate 30 min', set, 'tonight’s weather')] : [],
    weight: 0.45,
  }
}

export function yourDay(m: Model, seed: number): Card | null {
  const L = listens(m).filter((p) => p.ts >= m.now - 180 * DAY)
  if (L.length < 80) return null
  const rows: Array<{ band: Band; room: string; share: number; n: number }> = []
  for (const b of BANDS) {
    const inBand = L.filter((p) => bandOf(new Date(p.ts).getHours()) === b)
    if (inBand.length < 15) continue
    const c = new Map<string, number>()
    for (const p of inBand) {
      const r = m.roomOf.get(lead(p.artist))
      if (r) c.set(r, (c.get(r) ?? 0) + 1)
    }
    const [room, n] = [...c.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
    if (room) rows.push({ band: b, room, share: n! / inBand.length, n: inBand.length })
  }
  if (rows.length < 3 || new Set(rows.map((r) => r.room)).size < 2) return null
  const now = bandOf(new Date(m.now).getHours())
  const here = rows.find((r) => r.band === now) ?? rows[rows.length - 1]
  const room = m.rooms.find((r) => r.id === here.room)!
  const set = buildRiskSession(m, { minutes: 30, risk: 'safe', seed, uris: room.uris })
  return {
    id: 'your-day',
    depth: 'signals',
    job: 'understand',
    kicker: 'your day, in sounds',
    headline: 'Your day has territories.',
    lede: `Your listening changes with the clock. Right now, in the ${here.band}, you're usually in ${room.name}.`,
    figures: [{ kind: 'rows', rows: rows.map((r) => ({ title: r.band, sub: m.rooms.find((x) => x.id === r.room)?.name, trail: pct(r.share) })) }],
    actions: set.length >= 4 ? [playFor(`Play your ${here.band} session`, set, `your ${here.band}`)] : [],
    weight: 0.55,
  }
}

export function artistHour(m: Model, seed: number): Card | null {
  const byArtist = new Map<string, number[]>()
  for (const p of listens(m)) {
    const a = lead(p.artist)
    const h = new Date(p.ts).getHours()
    const list = byArtist.get(a)
    if (list) list.push(h)
    else byArtist.set(a, [h])
  }
  let best: { artist: string; from: number; share: number; n: number } | null = null
  for (const [artist, hours] of byArtist) {
    if (hours.length < 20) continue
    for (let h = 0; h < 24; h++) {
      const n = hours.filter((x) => x === h || x === (h + 1) % 24).length
      const share = n / hours.length
      if (share >= 0.4 && (!best || share > best.share)) best = { artist, from: h, share, n: hours.length }
    }
  }
  if (!best) return null
  const room = m.rooms.find((r) => r.id === m.roomOf.get(best!.artist))
  const set = buildRiskSession(m, { minutes: 30, risk: 'safe', seed, uris: room?.uris ?? (m.statsByArtist.get(best.artist) ?? []).map((s) => s.track.uri) })
  const label = new Date(2000, 0, 1, best.from).toLocaleTimeString('en', { hour: 'numeric' }).toLowerCase().replace(' ', '')
  return {
    id: 'artist-hour',
    depth: 'signals',
    job: 'understand',
    kicker: 'the hour that belongs to an artist',
    headline: `${best.artist} belongs to ${hh(best.from)}.`,
    lede: `${pct(best.share)} of your ${best.artist} listens happen between ${hh(best.from)} and ${hh(best.from + 2)}.`,
    actions: set.length >= 4 ? [playFor(`Play the ${label} session`, set, `the ${label} session`)] : [],
    weight: 0.6,
    share: `${pct(best.share)} of my ${best.artist} listens happen between ${hh(best.from)} and ${hh(best.from + 2)}.`,
  }
}

export function comebacks(m: Model): Card | null {
  let immediate = 0
  let later = 0
  const back = new Map<string, number>()
  for (const s of m.stats.values()) {
    for (let i = 1; i < s.times.length; i++) {
      const gap = s.times[i] - s.times[i - 1]
      if (gap < 15 * 60_000) immediate++
      else if (gap >= 7 * DAY) {
        later++
        if (gap >= 60 * DAY) back.set(s.track.uri, (back.get(s.track.uri) ?? 0) + 1)
      }
    }
  }
  if (immediate + later < 40) return null
  const songs = [...back.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])
  const tracks = upTo(
    tracksOf(
      m,
      songs.map(([u]) => u),
    ),
    30,
  )
  const style = later > immediate * 2 ? 'rediscover' : immediate > later * 2 ? 'replay' : null
  if (!style && tracks.length < 4) return null
  return {
    id: 'comebacks',
    depth: 'signals',
    job: 'understand',
    kicker: 'musical déjà vu',
    headline: style === 'rediscover' ? "You don't replay songs. You rediscover them." : style === 'replay' ? 'When you love a song, you play it again. Right away.' : 'Songs that keep finding their way back.',
    lede: `${fmt(immediate)} instant replays, ${fmt(later)} returns after a week or more.${tracks.length ? ` ${cap(word(tracks.length))} songs keep coming back after months away.` : ''}`,
    figures: [{ kind: 'counts', items: [{ value: fmt(immediate), label: 'instant replays' }, { value: fmt(later), label: 'returns after a week+' }] }],
    actions: tracks.length >= 3 ? [playFor('Play the comeback songs', tracks, 'comeback songs')] : [],
    weight: 0.5,
  }
}

/** After listening: what the last session was, what was new in it, what's one play from sticking. */
export function recap(m: Model): Card | null {
  const s = m.sessions[m.sessions.length - 1]
  if (!s || m.now - s.end > 8 * 3_600_000) return null
  const heard = s.plays.filter((p) => p.playedMs >= LISTEN_MS)
  if (heard.length < 3) return null
  const minutes = Math.round(s.heardMs / 60_000)
  const artists = [...new Set(heard.map((p) => lead(p.artist)))]
  // New to you: this session holds the first listen of the artist, and there's nothing before it.
  const firstTime = artists.filter((a) => (m.statsByArtist.get(a) ?? []).every((st) => st.first >= s.start - 60_000))
  // One play from a favourite: crossed three listens in this session (3–5 is a candidate).
  const candidates = [...new Set(heard.map((p) => p.uri))].filter((u) => m.stats.get(u)?.listens === 3 && (m.stats.get(u)?.times.filter((t) => t >= s.start).length ?? 0) >= 1)
  const candidateTracks = tracksOf(m, candidates)
  const earlier = m.sessions.slice(-31, -1).filter((x) => x.heardMs > 0)
  const usual = earlier.length >= 5 ? earlier.reduce((sum, x) => sum + x.heardMs, 0) / earlier.length / 60_000 : null
  const skipped = s.plays.filter((p) => p.skipped).length
  const said = [
    firstTime.length ? `${cap(word(firstTime.length))} ${firstTime.length === 1 ? 'artist' : 'artists'} you'd never played: ${firstTime.slice(0, 3).join(', ')}.` : '',
    candidateTracks.length ? `${cap(word(candidateTracks.length))} ${candidateTracks.length === 1 ? 'song' : 'songs'} just crossed three listens: ${candidateTracks.slice(0, 2).map((t) => t.title).join(', ')}.` : '',
    usual && minutes > usual * 1.4 ? 'Longer than your usual.' : usual && minutes < usual * 0.6 ? 'Shorter than your usual.' : '',
  ].filter(Boolean)
  return {
    id: 'recap',
    depth: 'now',
    job: 'understand',
    kicker: `session recap · ${new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`,
    headline: `You listened for ${minutes} minutes.`,
    lede: said.join(' ') || `${plural(heard.length, 'song')} by ${plural(artists.length, 'artist')}.`,
    figures: [{ kind: 'counts', items: [{ value: String(heard.length), label: 'songs' }, { value: String(artists.length), label: 'artists' }, { value: String(firstTime.length), label: 'new to you' }, { value: String(skipped), label: 'skipped' }] }],
    actions: [
      ...(candidateTracks.length ? [play('Play the near-favourites', candidateTracks, 'near-favourites'), { kind: 'crate' as const, label: 'Into a crate', tracks: candidateTracks }] : []),
      { kind: 'build', label: 'Keep it going', risk: 'curious' },
    ],
    weight: 0.45,
  }
}

export function closers(m: Model): Card | null {
  const last = new Map<string, number>()
  const first = new Map<string, number>()
  for (const s of m.sessions) {
    const L = s.plays.filter((p) => p.playedMs >= LISTEN_MS)
    if (L.length < 4) continue
    last.set(L[L.length - 1].uri, (last.get(L[L.length - 1].uri) ?? 0) + 1)
    first.set(L[0].uri, (first.get(L[0].uri) ?? 0) + 1)
  }
  const pick = (c: Map<string, number>) =>
    [...c.entries()]
      .filter(([u, n]) => n >= 3 && n / (m.stats.get(u)?.listens || 1) >= 0.3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  const ends = pick(last)
  const opens = pick(first)
  if (ends.length + opens.length < 3) return null
  const endTracks = tracksOf(
    m,
    ends.map(([u]) => u),
  )
  const openTracks = tracksOf(
    m,
    opens.map(([u]) => u),
  )
  return {
    id: 'closers',
    depth: 'signals',
    job: 'understand',
    kicker: 'openers and closers',
    headline: ends.length ? `Your sessions end on ${endTracks[0].title}.` : `Your sessions start with ${openTracks[0].title}.`,
    lede: 'Some songs are how you begin. Some are how you land. Here they are.',
    figures: [{ kind: 'rows', rows: [...openTracks.map((t) => ({ title: t.title, sub: 'opens', trail: `${first.get(t.uri)}×` })), ...endTracks.map((t) => ({ title: t.title, sub: 'closes', trail: `${last.get(t.uri)}×` }))].slice(0, 6) }],
    actions: [...(openTracks.length >= 2 ? [play('Start like you do', openTracks, 'your openers')] : []), ...(endTracks.length >= 2 ? [play('Wind down like you do', endTracks, 'your closers', !openTracks.length)] : [])],
    weight: 0.55,
  }
}

export function whatPartyDeckKnows(m: Model, seed: number): Card | null {
  const L = listens(m).filter((p) => p.ts >= m.now - 365 * DAY)
  if (L.length < 200 || m.rooms.length < 2) return null
  const bands = new Map<Band, number>()
  for (const p of L) bands.set(bandOf(new Date(p.ts).getHours()), (bands.get(bandOf(new Date(p.ts).getHours())) ?? 0) + 1)
  const [band, bn] = [...bands.entries()].sort((a, b) => b[1] - a[1])[0]
  const durations = L.map((p) => p.durationMs || m.track(p.uri)?.durationMs || 0)
    .filter(Boolean)
    .sort((a, b) => a - b)
  const median = durations[Math.floor(durations.length / 2)] ?? 0
  const coreShare = L.filter((p) => m.core.has(p.uri)).length / L.length
  const artists = new Map<string, number>()
  for (const p of L) artists.set(lead(p.artist), (artists.get(lead(p.artist)) ?? 0) + 1)
  const top10 = [...artists.values()].sort((a, b) => b - a).slice(0, 10).reduce((s, n) => s + n, 0) / L.length
  const parts = [
    bn / L.length >= 0.35 ? band : null,
    coreShare >= 0.6 ? 'heavy repetition' : coreShare <= 0.35 ? 'constant wandering' : null,
    median && median < 180_000 ? 'short songs' : median > 270_000 ? 'long songs' : null,
    top10 >= 0.5 ? 'a few artists, deeply' : top10 <= 0.2 ? 'many artists, lightly' : null,
    m.rooms[0].name,
    m.rooms[1].name,
  ].filter((x): x is string => Boolean(x))
  if (parts.length < 4) return null
  const set = buildRiskSession(m, { minutes: 30, risk: 'curious', seed, uris: [...m.rooms[0].uris, ...m.rooms[1].uris] })
  return {
    id: 'knows',
    depth: 'signals',
    job: 'understand',
    kicker: 'what partydeck knows',
    headline: "You don't listen to genres.",
    lede: 'You listen to a particular combination — and that’s why some songs feel right even when they’re technically something else.',
    figures: [{ kind: 'formula', parts, result: 'you' }],
    actions: [...(set.length >= 4 ? [playFor('Play the combination', set, 'what PartyDeck knows')] : []), { kind: 'share', label: 'Share', text: `What PartyDeck found: I don't listen to genres. I listen to ${parts.join(' + ')}.` }],
    weight: 0.8,
    share: `I don't listen to genres. I listen to ${parts.join(' + ')}.`,
  }
}
