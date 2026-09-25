import { describe, expect, it } from 'vitest'
import { DEMO_LRC, DEMO_TRACK } from './demo'
import { parseLRC } from './lrc'
import { createMockProvider, matchKey, resolveLyrics, type LyricsProvider } from './resolver'

describe('matchKey', () => {
  it.each([
    ['Night Drive', 'night drive'],
    ['Night Drive - 2020 Remaster', 'night drive'],
    ['Night Drive (feat. Someone)', 'night drive'],
    ['Nïght  Drívé!', 'night drive'],
  ])('%s → %s', (a, b) => expect(matchKey(a)).toBe(b))
})

describe('resolveLyrics', () => {
  it('finds the demo track, matching on first artist', async () => {
    const r = await resolveLyrics({ title: 'Night Drive', artist: 'PartyDeck Demo, Guest' })
    expect(r?.synced).toBe(true)
    expect(r?.providerName).toBe('PartyDeck demo library')
    expect(r?.lines.find((l) => l.text)?.text).toBe('Streetlights counting down the avenue')
  })

  it('returns null for unknown tracks (→ "Lyrics unavailable")', async () => {
    expect(await resolveLyrics({ title: 'Some Other Song', artist: 'Someone' })).toBeNull()
  })

  it('treats malformed LRC as unavailable', async () => {
    const p = createMockProvider([{ title: 'X', artist: 'Y', lrc: 'garbage\n[bad]' }])
    expect(await resolveLyrics({ title: 'X', artist: 'Y' }, [p])).toBeNull()
  })

  it('falls through a throwing provider to the next', async () => {
    const broken: LyricsProvider = { id: 'b', name: 'Broken', find: () => Promise.reject(new Error('down')) }
    const good = createMockProvider([{ title: 'X', artist: 'Y', lrc: '[00:01.00]hi' }])
    expect((await resolveLyrics({ title: 'X', artist: 'Y' }, [broken, good]))?.lines).toEqual([{ startMs: 1000, text: 'hi' }])
  })
})

describe('demo lyrics', () => {
  it('parse cleanly and fit inside the demo duration', () => {
    const lines = parseLRC(DEMO_LRC)
    expect(lines.length).toBeGreaterThan(20)
    expect(lines.at(-1)!.startMs).toBeLessThan(DEMO_TRACK.durationMs)
    // chorus uses multiple timestamps per line
    expect(lines.filter((l) => l.text === 'So turn it up, turn it up')).toHaveLength(3)
  })
})
