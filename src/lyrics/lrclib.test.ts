import { describe, expect, it, vi } from 'vitest'
import { createLrclibProvider, pickRecord, plainLines, searchTitle, toResolved, type LrclibRecord } from './lrclib'

const record = (over: Partial<LrclibRecord> = {}): LrclibRecord => ({
  trackName: 'Night Drive',
  artistName: 'PartyDeck Demo',
  duration: 200,
  instrumental: false,
  plainLyrics: 'one\ntwo',
  syncedLyrics: '[00:01.00]one\n[00:02.50]two',
  ...over,
})

const query = { title: 'Night Drive', artist: 'PartyDeck Demo, Guest', durationMs: 200_900 }

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })))

describe('searchTitle', () => {
  it.each([
    ['Night Drive - 2020 Remaster', 'Night Drive'],
    ['Night Drive (feat. Someone)', 'Night Drive'],
    ["Don't Stop", "Don't Stop"],
    ['(Intro)', '(Intro)'],
  ])('%s → %s', (a, b) => expect(searchTitle(a)).toBe(b))
})

describe('plainLines', () => {
  it('keeps one gap between verses and trims the ends', () => {
    expect(plainLines('\nA\nB\n\n\nC\n\n').map((l) => l.text)).toEqual(['A', 'B', '', 'C'])
  })
})

describe('toResolved', () => {
  it('prefers synced lyrics', () => {
    expect(toResolved(record())).toEqual({
      lines: [
        { startMs: 1000, text: 'one' },
        { startMs: 2500, text: 'two' },
      ],
      synced: true,
      providerName: 'LRCLIB',
    })
  })

  it('falls back to plain lyrics, untimed', () => {
    const r = toResolved(record({ syncedLyrics: null }))
    expect(r?.synced).toBe(false)
    expect(r?.lines.map((l) => l.text)).toEqual(['one', 'two'])
  })

  it('has nothing for instrumentals or empty records', () => {
    expect(toResolved(record({ instrumental: true }))).toBeNull()
    expect(toResolved(record({ syncedLyrics: null, plainLyrics: '  ' }))).toBeNull()
  })
})

describe('pickRecord', () => {
  it('matches title, first artist and duration within 2s', () => {
    expect(pickRecord([record()], query)).not.toBeNull()
    expect(pickRecord([record({ duration: 230 })], query)).toBeNull()
    expect(pickRecord([record({ trackName: 'Night Drive Home' })], query)).toBeNull()
    expect(pickRecord([record({ artistName: 'Someone Else' })], query)).toBeNull()
  })

  it('prefers a synced record over a plain one', () => {
    const plain = record({ syncedLyrics: null })
    const synced = record()
    expect(pickRecord([plain, synced], query)).toBe(synced)
  })

  it('skips instrumentals', () => {
    expect(pickRecord([record({ instrumental: true })], query)).toBeNull()
  })

  it('ignores duration when unknown', () => {
    expect(pickRecord([record({ duration: 999 })], { title: 'Night Drive', artist: 'PartyDeck Demo' })).not.toBeNull()
  })
})

describe('createLrclibProvider', () => {
  it('searches by cleaned title and first artist', async () => {
    const f = respond([record()])
    const r = await createLrclibProvider(f).find({ ...query, title: 'Night Drive - Remastered' })
    expect(r?.providerName).toBe('LRCLIB')
    const url = new URL(String(f.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://lrclib.net/api/search')
    expect(url.searchParams.get('track_name')).toBe('Night Drive')
    expect(url.searchParams.get('artist_name')).toBe('PartyDeck Demo')
  })

  it('asks once per track', async () => {
    const f = respond([record()])
    const p = createLrclibProvider(f)
    await p.find(query)
    await p.find(query)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('returns null when nothing matches', async () => {
    expect(await createLrclibProvider(respond([])).find(query)).toBeNull()
    expect(await createLrclibProvider(respond({ weird: true })).find(query)).toBeNull()
  })

  it('throws on HTTP errors, and retries next time', async () => {
    const f = respond({}, 500)
    const p = createLrclibProvider(f)
    await expect(p.find(query)).rejects.toThrow()
    await expect(p.find(query)).rejects.toThrow()
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('skips the network for empty metadata', async () => {
    const f = respond([record()])
    expect(await createLrclibProvider(f).find({ title: '', artist: 'X' })).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })
})
