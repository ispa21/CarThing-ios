// NOW: stories you can act on tonight — rediscover what you own, make it listenable,
// and take a controlled step outside. Pure.

import type { TrackRef } from '../history/types'
import { ago, fmt, play, playFor, plural, upTo, word, type Card } from './cards'
import type { Model, Room } from './model'
import { buildRiskSession, bucketCounts } from './session'
import { DAY, rng, shuffle } from './stats'

const byListens = (m: Model) => (a: TrackRef, b: TrackRef) => (m.stats.get(b.uri)?.listens ?? 0) - (m.stats.get(a.uri)?.listens ?? 0)
const tracksOf = (m: Model, uris: Iterable<string>) => [...uris].map((u) => m.track(u)).filter((t): t is TrackRef => t !== null)

function members(m: Model) {
  const out = new Map<string, string[]>()
  for (const t of m.library)
    for (const p of t.playlists) {
      const list = out.get(p)
      if (list) list.push(t.uri)
      else out.set(p, [t.uri])
    }
  return out
}

/** A revival: the tracks you loved most from it, then a few you never gave a chance. */
function revive(m: Model, uris: string[], seed: number) {
  const played = tracksOf(
    m,
    uris.filter((u) => (m.stats.get(u)?.listens ?? 0) > 0),
  ).sort(byListens(m))
  const never = shuffle(
    tracksOf(
      m,
      uris.filter((u) => !m.stats.get(u)?.listens),
    ),
    rng(seed),
  )
  return upTo([...played.slice(0, 6), ...never.slice(0, 3), ...played.slice(6)], 32)
}

export function forgottenPlaylist(m: Model, seed: number): Card | null {
  const all = members(m)
  let best: { name: string; id: string; uris: string[]; year: number; ever: number; last: number } | null = null
  for (const p of m.playlists) {
    const uris = all.get(p.id) ?? []
    if (uris.length < 10 || uris.length > 600) continue
    const ever = uris.filter((u) => (m.stats.get(u)?.listens ?? 0) > 0).length
    const year = uris.filter((u) => {
      const st = m.stats.get(u)
      return st ? m.recent(st, 365) > 0 : false
    }).length
    const last = Math.max(0, ...uris.map((u) => m.stats.get(u)?.last ?? 0))
    if (ever < 3 || year / uris.length > 0.3 || m.now - last < 120 * DAY) continue
    if (!best || ever > best.ever) best = { name: p.name, id: p.id, uris, year, ever, last }
  }
  if (!best) return null
  const set = revive(m, best.uris, seed)
  return {
    id: 'forgotten-playlist',
    depth: 'now',
    job: 'curate',
    kicker: 'forgotten playlist',
    headline: `“${best.name}”`,
    lede: `You've heard ${best.year} of its ${best.uris.length} tracks in the last year. Last played ${ago(best.last, m.now)}.`,
    why: `Not the whole thing: the ${Math.min(6, best.ever)} you played most, and a few you never gave a chance.`,
    figures: [{ kind: 'counts', items: [{ value: fmt(best.uris.length), label: 'tracks' }, { value: fmt(best.ever), label: 'ever played' }, { value: fmt(best.year), label: 'this year' }] }],
    actions: [playFor('Revive', set, `${best.name}, revived`), { kind: 'save', label: 'Save the revival', name: `${best.name} — revived`, description: 'The best of an old playlist, revived by PartyDeck.', uris: set.map((t) => t.uri) }],
    weight: 0.55,
  }
}

export function graveyard(m: Model): Card | null {
  const all = members(m)
  const lists = m.playlists.filter((p) => (all.get(p.id)?.length ?? 0) >= 5)
  if (lists.length < 5) return null
  const dormant = lists.filter((p) => (all.get(p.id) ?? []).every((u) => !m.stats.get(u) || m.now - m.stats.get(u)!.last > 180 * DAY))
  if (dormant.length < 2) return null
  const gems = dormant.filter((p) => (all.get(p.id) ?? []).some((u) => (m.stats.get(u)?.listens ?? 0) >= 5))
  const rescue = tracksOf(m, new Set(dormant.flatMap((p) => all.get(p.id) ?? [])))
    .filter((t) => (m.stats.get(t.uri)?.listens ?? 0) >= 2)
    .sort(byListens(m))
  const set = upTo(rescue, 30)
  if (set.length < 4) return null
  return {
    id: 'graveyard',
    depth: 'now',
    job: 'discover',
    kicker: 'playlist graveyard',
    headline: `${plural(dormant.length, 'playlist')} gone quiet.`,
    lede: `Of your ${lists.length} playlists, ${dormant.length} haven't been played in six months. ${gems.length ? `${word(gems.length)[0].toUpperCase() + word(gems.length).slice(1)} of them still hold songs you once played over and over.` : ''}`,
    why: `We found ${plural(rescue.length, 'track')} worth rescuing: ones you played at least twice before the playlists went quiet.`,
    figures: [
      { kind: 'counts', items: [{ value: fmt(lists.length), label: 'playlists' }, { value: fmt(dormant.length), label: 'dormant' }, { value: fmt(gems.length), label: 'with gems' }] },
      { kind: 'rows', rows: dormant.slice(0, 4).map((p) => ({ title: p.name, trail: `${all.get(p.id)?.length ?? 0} tracks` })) },
    ],
    actions: [playFor('Revive the graveyard', set, 'the graveyard')],
    weight: 0.5,
  }
}

export function outsideTheCore(m: Model, seed: number): Card | null {
  if (m.core.size < 20) return null
  const set = buildRiskSession(m, { minutes: 30, risk: 'risky', seed })
  const c = bucketCounts(set)
  const fresh = c.adjacent + c.experiment + c.wild
  if (set.length < 5 || fresh < 2) return null
  return {
    id: 'outside-core',
    depth: 'now',
    job: 'explore',
    kicker: 'outside the core',
    headline: "You've been here a while.",
    lede: `Most of your listening comes from ${plural(m.core.size, 'track')}. Here's 30 minutes that steps outside — ${word(fresh)} you've never played, held together by ${word(c.core + c.familiar + c.rediscovery)} you know.`,
    why: 'Every new track here comes from your own library, from artists that share your playlists or sessions with ones you love.',
    figures: [
      {
        kind: 'meter',
        bars: [
          { label: 'your usual', value: (c.core + c.familiar) / set.length },
          { label: 'rediscovery', value: c.rediscovery / set.length },
          { label: 'new to you', value: fresh / set.length, hot: true },
        ],
      },
    ],
    actions: [playFor('Try something new', set, 'outside the core'), { kind: 'build', label: 'Set the risk', risk: 'risky' }],
    weight: 0.5,
  }
}

export function followTheThread(m: Model): Card | null {
  for (const room of m.rooms.slice(0, 3)) {
    const start = room.artists[0]
    if (!start || (m.artistListens.get(start) ?? 0) < 5) continue
    const path = [start]
    const seen = new Set(path)
    for (let step = 0; step < 5; step++) {
      const here = path[path.length - 1]
      const here_n = m.artistListens.get(here) ?? 0
      const next = [...(m.graph.get(here)?.entries() ?? [])]
        .filter(([a]) => !seen.has(a) && (m.artistListens.get(a) ?? 0) < here_n)
        .sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!next) break
      path.push(next)
      seen.add(next)
      if ((m.artistListens.get(next) ?? 0) === 0) break
    }
    const end = path[path.length - 1]
    if (path.length < 3 || (m.artistListens.get(end) ?? 0) > 2) continue
    const tracks = path.flatMap((a) =>
      [...(m.libByArtist.get(a) ?? [])].sort(byListens(m)).slice(0, 2),
    )
    if (tracks.length < 4) continue
    return {
      id: 'thread',
      depth: 'now',
      job: 'explore',
      kicker: `follow the thread · ${room.name}`,
      headline: `From ${start} to someone you've never played.`,
      lede: 'Each step is an artist that keeps turning up next to the last one — in your playlists, in your sessions — and a little less familiar.',
      figures: [{ kind: 'path', steps: path.map((a) => ({ label: a, note: m.artistListens.get(a) ? plural(m.artistListens.get(a)!, 'play') : 'never played' })) }],
      actions: [playFor('Follow the thread', tracks, `the thread from ${start}`)],
      weight: 0.6,
      share: `PartyDeck found a thread from ${start} to ${end} — an artist I'd saved and never played.`,
    }
  }
  return null
}

export function theBridge(m: Model): Card | null {
  const [a, b] = m.rooms
  if (!a || !b || a.listens < 10 || b.listens < 10) return null
  const inA = new Set(a.artists)
  const inB = new Set(b.artists)
  const pull = (artist: string, side: Set<string>) => [...(m.graph.get(artist)?.entries() ?? [])].filter(([n]) => side.has(n)).reduce((s, [, w]) => s + w, 0)
  const bridges = [...m.graph.keys()]
    .map((artist) => ({ artist, score: Math.min(pull(artist, inA), pull(artist, inB)) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
  if (!bridges.length) return null
  const libOf = (artist: string) => [...(m.libByArtist.get(artist) ?? [])].sort(byListens(m))
  const sideA = tracksOf(m, a.uris).sort(byListens(m)).slice(0, 2)
  const sideB = tracksOf(m, b.uris).sort(byListens(m)).slice(0, 2)
  const middle = bridges.flatMap((x) => libOf(x.artist).slice(0, 3))
  const set = [...sideA, ...middle, ...sideB]
  if (middle.length < 2) return null
  return {
    id: 'bridge',
    depth: 'now',
    job: 'explore',
    kicker: 'the bridge',
    headline: `${a.name} × ${b.name}`,
    lede: `You might like what's between these two. ${bridges.map((x) => x.artist).join(', ')} ${bridges.length === 1 ? 'sits' : 'sit'} in both worlds in your listening.`,
    figures: [{ kind: 'path', steps: [{ label: a.name, note: 'familiar territory' }, ...bridges.map((x) => ({ label: x.artist, note: m.artistListens.get(x.artist) ? plural(m.artistListens.get(x.artist)!, 'play') : 'never played' })), { label: b.name, note: 'familiar territory' }] }],
    actions: [playFor('Explore the bridge', set, `between ${a.name} and ${b.name}`)],
    weight: 0.65,
    share: `PartyDeck found the sound between ${a.name} and ${b.name} that I keep returning to.`,
  }
}

export function discoveryDebt(m: Model, followed: string[], seed: number): Card | null {
  const liked = m.library.filter((t) => t.liked)
  if (liked.length < 50) return null
  const never = liked.filter((t) => !m.stats.get(t.uri)?.starts)
  const barely = liked.filter((t) => {
    const n = m.stats.get(t.uri)?.listens ?? 0
    return n > 0 && n <= 2
  })
  const unknownFollowed = followed.filter((a) => (m.artistListens.get(a) ?? 0) < 3)
  if (never.length + barely.length < 30) return null
  const pool = shuffle([...never, ...barely], rng(seed))
  return {
    id: 'debt',
    depth: 'now',
    job: 'discover',
    kicker: 'discovery debt',
    headline: `${fmt(never.length + barely.length)} songs you meant to get to.`,
    lede: 'Library clutter is just curiosity you haven’t spent yet. Pay it down in small sessions.',
    figures: [
      {
        kind: 'counts',
        items: [
          { value: fmt(liked.length), label: 'saved' },
          { value: fmt(never.length), label: 'never played' },
          { value: fmt(barely.length), label: 'barely played' },
          ...(followed.length ? [{ value: fmt(unknownFollowed.length), label: `of ${followed.length} followed artists, barely heard` }] : []),
        ],
      },
    ],
    actions: [play('15 min', upTo(pool, 15), 'discovery debt, 15 minutes'), play('30 min', upTo(pool, 30), 'discovery debt, 30 minutes', false), play('1 hour', upTo(pool, 60), 'discovery debt, an hour', false)],
    weight: 0.45,
    share: `I have ${fmt(never.length)} songs saved that I've never heard.`,
  }
}

export function almostFans(m: Model): Card | null {
  const byArtist = new Map<string, { weeks: Set<number>; tracks: Set<string>; listens: number }>()
  for (const s of m.stats.values()) {
    if (!s.listens) continue
    const a = m.primary(s.track.uri)
    const e = byArtist.get(a) ?? { weeks: new Set<number>(), tracks: new Set<string>(), listens: 0 }
    for (const t of s.times) e.weeks.add(Math.floor(t / (7 * DAY)))
    e.tracks.add(s.track.uri)
    e.listens += s.listens
    byArtist.set(a, e)
  }
  const found = [...byArtist.entries()]
    .filter(([a, e]) => e.listens >= 3 && e.listens <= 12 && e.weeks.size >= 3 && e.tracks.size <= 2 && (m.libByArtist.get(a) ?? []).filter((t) => !e.tracks.has(t.uri)).length >= 2)
    .sort((x, y) => y[1].weeks.size - x[1].weeks.size)
    .slice(0, 3)
  if (!found.length) return null
  const tracks = found.flatMap(([a, e]) => [...tracksOf(m, e.tracks), ...(m.libByArtist.get(a) ?? []).filter((t) => !e.tracks.has(t.uri)).slice(0, 4)])
  return {
    id: 'almost-fans',
    depth: 'now',
    job: 'discover',
    kicker: 'you keep checking this artist',
    headline: found.length === 1 ? `${found[0][0]}: one or two songs from being a fan.` : 'A song or two from becoming a fan.',
    lede: `You keep coming back to the same ${found[0][1].tracks.size === 1 ? 'track' : 'tracks'}, across ${found[0][1].weeks.size} different weeks, but never go deeper — and there's more of them already in your library.`,
    figures: [{ kind: 'rows', rows: found.map(([a, e]) => ({ title: a, sub: `${plural(e.tracks.size, 'track')} played`, trail: `${e.weeks.size} weeks` })) }],
    actions: [playFor('Go deeper', tracks, 'going deeper')],
    weight: 0.55,
  }
}

export function duplicateTaste(m: Model): Card | null {
  const all = members(m)
  const lists = m.playlists.filter((p) => (all.get(p.id)?.length ?? 0) >= 10 && (all.get(p.id)?.length ?? 0) <= 800)
  const parent = new Map(lists.map((p) => [p.id, p.id]))
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!))
  for (let i = 0; i < lists.length; i++)
    for (let j = i + 1; j < lists.length; j++) {
      const A = new Set(all.get(lists[i].id))
      const B = all.get(lists[j].id)!
      const shared = B.filter((u) => A.has(u)).length
      if (shared / Math.min(A.size, B.length) >= 0.7) parent.set(find(lists[i].id), find(lists[j].id))
    }
  const groups = new Map<string, string[]>()
  for (const p of lists) groups.set(find(p.id), [...(groups.get(find(p.id)) ?? []), p.id])
  const group = [...groups.values()].filter((g) => g.length >= 2).sort((a, b) => b.length - a.length)[0]
  if (!group) return null
  const total = group.reduce((s, id) => s + (all.get(id)?.length ?? 0), 0)
  const count = new Map<string, number>()
  for (const id of group) for (const u of all.get(id) ?? []) count.set(u, (count.get(u) ?? 0) + 1)
  const unique = count.size
  const canonical = upTo(
    tracksOf(
      m,
      [...count.entries()].filter(([, n]) => n >= 2).map(([u]) => u),
    ).sort(byListens(m)),
    45,
  )
  if (canonical.length < 5) return null
  const names = group.map((id) => m.playlists.find((p) => p.id === id)?.name ?? '')
  return {
    id: 'duplicates',
    depth: 'now',
    job: 'curate',
    kicker: 'the duplicate taste',
    headline: `${word(group.length)[0].toUpperCase() + word(group.length).slice(1)} playlists, one idea.`,
    lede: `${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''} are mostly the same songs: ${fmt(total)} entries, ${fmt(unique)} unique tracks.`,
    why: 'This doesn’t touch your playlists. It builds the cleaner version: the tracks they agree on.',
    figures: [{ kind: 'counts', items: [{ value: fmt(total), label: 'entries' }, { value: fmt(unique), label: 'unique' }, { value: fmt(canonical.length), label: 'they agree on' }] }],
    actions: [playFor('Merge the idea', canonical, 'the merged idea'), { kind: 'save', label: 'Save the merge', name: `${names[0]} — merged`, description: `What ${names.length} of my playlists agree on. Made with PartyDeck.`, uris: canonical.map((t) => t.uri) }],
    weight: 0.6,
  }
}

/** Playlist compression: a huge playlist, kept in character, in under two hours. */
export function compression(m: Model, rooms: Room[]): Card | null {
  const all = members(m)
  const big = m.playlists.filter((p) => (all.get(p.id)?.length ?? 0) >= 150).sort((a, b) => (all.get(b.id)?.length ?? 0) - (all.get(a.id)?.length ?? 0))[0]
  if (!big) return null
  const uris = all.get(big.id)!
  const total = tracksOf(m, uris)
  // Keep its character: take from each room in proportion to how much of the playlist it is.
  const share = new Map<string, string[]>()
  for (const u of uris) {
    const r = m.roomOf.get(m.primary(u)) ?? 'none'
    share.set(r, [...(share.get(r) ?? []), u])
  }
  const target = 30
  const picked: TrackRef[] = []
  for (const [, list] of [...share.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const n = Math.max(1, Math.round((list.length / uris.length) * target))
    picked.push(...tracksOf(m, list).sort(byListens(m)).slice(0, n))
  }
  const set = picked.slice(0, target)
  const hours = (ms: number) => `${Math.floor(ms / 3_600_000)}h ${String(Math.round((ms % 3_600_000) / 60_000)).padStart(2, '0')}m`
  const allMs = total.reduce((s, t) => s + (t.durationMs || 210_000), 0)
  const setMs = set.reduce((s, t) => s + (t.durationMs || 210_000), 0)
  const roomsIn = [...share.keys()].map((id) => rooms.find((r) => r.id === id)?.name).filter(Boolean)
  return {
    id: 'compression',
    depth: 'now',
    job: 'curate',
    kicker: `playlist compression · ${big.name.toLowerCase()}`,
    headline: `${fmt(uris.length)} tracks, in ${hours(setMs)}.`,
    lede: `“${big.name}” runs ${hours(allMs)}. This keeps its character — ${roomsIn.length ? `the same mix of ${roomsIn.slice(0, 3).join(', ')}` : 'the same mix of sounds'} — and the tracks you actually played most.`,
    figures: [{ kind: 'counts', items: [{ value: fmt(uris.length), label: 'tracks' }, { value: hours(allMs), label: 'original' }, { value: fmt(set.length), label: 'kept' }, { value: hours(setMs), label: 'compressed' }] }],
    actions: [play('Play the compression', set, `${big.name}, compressed`), { kind: 'save', label: 'Save it', name: `${big.name} — compressed`, description: 'A compressed version made with PartyDeck.', uris: set.map((t) => t.uri) }],
    weight: 0.45,
  }
}

export function albumNeglect(m: Model): Card | null {
  const albums = new Map<string, string[]>()
  for (const t of m.library) {
    if (!t.album) continue
    const k = `${t.album}\u0000${m.primary(t.uri)}`
    albums.set(k, [...(albums.get(k) ?? []), t.uri])
  }
  const found = [...albums.entries()]
    .map(([k, uris]) => {
      const played = uris.filter((u) => (m.stats.get(u)?.listens ?? 0) > 0)
      const listens = played.reduce((s, u) => s + (m.stats.get(u)?.listens ?? 0), 0)
      return { k, uris, played, listens }
    })
    .filter((a) => a.uris.length >= 6 && a.played.length >= 1 && a.played.length <= 2 && a.listens >= 5)
    .sort((a, b) => b.listens - a.listens)[0]
  if (!found) return null
  const [album, artist] = found.k.split('\u0000')
  const rest = tracksOf(
    m,
    found.uris.filter((u) => !found.played.includes(u)),
  )
  return {
    id: 'album-neglect',
    depth: 'now',
    job: 'discover',
    kicker: `album neglect · ${artist.toLowerCase()}`,
    headline: `${fmt(found.listens)} plays of ${album}. ${word(found.played.length)[0].toUpperCase() + word(found.played.length).slice(1)} ${found.played.length === 1 ? 'song' : 'songs'}.`,
    lede: `You saved ${found.uris.length} tracks from it and only ever play ${word(found.played.length)}. The other ${rest.length} are right there.`,
    actions: [playFor('Play the rest', rest, `the rest of ${album}`)],
    weight: 0.5,
  }
}

