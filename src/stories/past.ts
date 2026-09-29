// Stories from Spotify's own ranking of your past (top tracks and artists over ~4 weeks,
// ~6 months and ~a year and more). They work on day one, before PartyDeck has watched
// you listen — and before a streaming-history export arrives. Pure.

import type { TrackRef } from '../history/types'
import { play, playFor, upTo, word, type Card } from './cards'
import { lead, type Model } from './model'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const byArtist = (m: Model, artists: string[], per: number) => {
  const out: TrackRef[] = []
  for (const a of artists) {
    const fromTop = (['long', 'medium', 'short'] as const).flatMap((r) => m.top?.[r].tracks ?? []).filter((t) => lead(t.artist) === a)
    const fromLib = m.libByArtist.get(a) ?? []
    out.push(...[...new Map([...fromTop, ...fromLib].map((t) => [t.uri, t])).values()].slice(0, per))
  }
  return out
}

export function longGame(m: Model): Card | null {
  const long = m.top?.long.tracks ?? []
  if (long.length < 10) return null
  const still = new Set((m.top?.short.tracks ?? []).map((t) => t.uri))
  const kept = long.filter((t) => still.has(t.uri))
  const constants = (m.top?.long.artists ?? []).filter((a) => m.top?.short.artists.includes(a) && m.top?.medium.artists.includes(a))
  const set = upTo(long, 35)
  return {
    id: 'long-game',
    depth: 'archive',
    job: 'understand',
    kicker: 'the long game',
    headline: 'The songs that define your last years.',
    lede: `Spotify's own long view of your listening. ${kept.length ? `${cap(word(kept.length))} of them are still in your last four weeks.` : 'None of them made your last four weeks.'}${constants.length ? ` Your constants: ${constants.slice(0, 3).join(', ')}.` : ''}`,
    figures: [{ kind: 'rows', rows: long.slice(0, 5).map((t, i) => ({ title: t.title, sub: t.artist, trail: still.has(t.uri) ? 'still here' : `#${i + 1}` })) }],
    actions: [playFor('Play the long game', set, 'the long game'), { kind: 'save', label: 'Save it', name: 'The long game', description: 'The songs that define my last years. Made with PartyDeck.', uris: set.map((t) => t.uri) }],
    weight: 0.6,
    share: constants.length ? `My constants, across years: ${constants.slice(0, 3).join(', ')}.` : undefined,
  }
}

export function faded(m: Model): Card | null {
  if (!m.top) return null
  const recent = new Set([...m.top.short.artists, ...m.top.medium.artists].map(lead))
  const gone = m.top.long.artists.map(lead).filter((a) => !recent.has(a)).slice(0, 5)
  if (gone.length < 2) return null
  const tracks = byArtist(m, gone, 3)
  if (tracks.length < 3) return null
  return {
    id: 'faded',
    depth: 'signals',
    job: 'discover',
    kicker: 'where did they go?',
    headline: `You used to live with ${gone.slice(0, 2).join(' and ')}.`,
    lede: `${gone.length > 2 ? `And ${gone.slice(2).join(', ')}. ` : ''}All in your long-term top artists, none in your last six months.`,
    figures: [{ kind: 'rows', rows: gone.map((a) => ({ title: a, trail: 'long ago' })) }],
    actions: [playFor('One more listen', tracks, 'artists you used to live with')],
    weight: 0.65,
  }
}

export function rising(m: Model): Card | null {
  if (!m.top) return null
  const older = new Set([...m.top.long.artists, ...m.top.medium.artists].map(lead))
  const fresh = m.top.short.artists.map(lead).filter((a) => !older.has(a)).slice(0, 5)
  if (fresh.length < 2) return null
  const tracks = byArtist(m, fresh, 3)
  if (tracks.length < 3) return null
  return {
    id: 'rising',
    depth: 'signals',
    job: 'understand',
    kicker: 'rising',
    headline: `New in your life: ${fresh.slice(0, 2).join(' and ')}.`,
    lede: `${fresh.length > 2 ? `Also ${fresh.slice(2).join(', ')}. ` : ''}In your last four weeks, and nowhere in your longer history. The start of an era, maybe.`,
    figures: [{ kind: 'rows', rows: fresh.map((a) => ({ title: a, trail: 'new' })) }],
    actions: [play('Play what’s rising', tracks, 'what’s rising')],
    weight: 0.6,
    share: `New in my life: ${fresh.slice(0, 3).join(', ')}.`,
  }
}
