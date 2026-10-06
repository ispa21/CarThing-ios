import { describe, expect, it } from 'vitest'
import { isExportPlaylist, mergeExportLibrary, newAcc, readLibraryFile } from './exportLibrary'
import type { LibraryIndex } from './library'

const U = (c: string) => `spotify:track:${c.repeat(22)}`
const playlistFile = { playlists: [{ name: 'Night Drive', lastModifiedDate: '2025-02-01', collaborators: [], numberOfFollowers: 0, items: [{ track: { trackName: 'A', artistName: 'X', albumName: 'LP', trackUri: U('a') }, addedDate: '2023-05-12' }, { track: { trackName: 'B', artistName: 'Y', albumName: '', trackUri: U('b') }, addedDate: '2024-01-01' }, { track: null, episode: { name: 'pod' } }, { track: { trackName: 'local', artistName: 'Z', albumName: '', trackUri: 'spotify:local:::' } }] }] }
const libraryFile = { tracks: [{ artist: 'X', album: 'LP', track: 'A', uri: U('a') }, { artist: 'W', album: 'W', track: 'W', uri: U('c') }], albums: [], artists: [{ name: 'X', uri: 'spotify:artist:1' }] }

describe('the library inside Spotify’s account export', () => {
  it('reads playlists: tracks with links and the day each was added, not episodes or local files', () => {
    const acc = newAcc()
    expect(readLibraryFile(playlistFile, acc)).toBe('playlists')
    expect(acc.playlists).toHaveLength(1)
    expect(acc.playlists[0]).toMatchObject({ name: 'Night Drive', count: 2, readable: true })
    expect(isExportPlaylist(acc.playlists[0].id)).toBe(true)
    expect(acc.map.get(U('a'))).toMatchObject({ title: 'A', artist: 'X', album: 'LP', addedAt: Date.parse('2023-05-12'), liked: false })
    expect(acc.map.size).toBe(2)
  })

  it('reads liked songs and followed artists', () => {
    const acc = newAcc()
    expect(readLibraryFile(libraryFile, acc)).toBe('library')
    expect(acc.liked).toBe(2)
    expect(acc.followed).toEqual(['X'])
    expect(acc.map.get(U('c'))?.liked).toBe(true)
  })

  it('ignores everything else', () => {
    const acc = newAcc()
    expect(readLibraryFile({ email: 'x@example.com' }, acc)).toBeNull()
    expect(readLibraryFile([{ endTime: 'x' }], acc)).toBeNull()
    expect(acc.map.size).toBe(0)
  })

  it('merges: a track liked and in a playlist is one track in both places', () => {
    const acc = newAcc()
    readLibraryFile(playlistFile, acc)
    readLibraryFile(libraryFile, acc)
    const { index } = mergeExportLibrary(null, acc)
    const a = index.tracks.find((t) => t.uri === U('a'))!
    expect(a.liked).toBe(true)
    expect(a.playlists).toHaveLength(1)
    expect(index.tracks).toHaveLength(3)
    expect(index.followed).toEqual(['X'])
  })

  it('prefers a playlist the API already read (it has art); a second import does not double', () => {
    const prev: LibraryIndex = {
      tracks: [{ uri: U('a'), title: 'A', artist: 'X', album: 'LP', art: 'https://i.scdn.co/a', durationMs: 200_000, addedAt: null, liked: false, playlists: ['api1'] }],
      playlists: [{ id: 'api1', name: 'Night Drive', count: 2, readable: true, snapshot: 's' }],
      scannedAt: 1,
    }
    const acc = newAcc()
    readLibraryFile(playlistFile, acc)
    const r = mergeExportLibrary(prev, acc)
    expect(r.covered).toBe(1)
    expect(r.index.playlists.map((p) => p.id)).toEqual(['api1'])
    expect(r.index.tracks.find((t) => t.uri === U('a'))).toMatchObject({ art: 'https://i.scdn.co/a', playlists: ['api1'] })

    const again = newAcc()
    readLibraryFile(playlistFile, again)
    const once = mergeExportLibrary(null, acc).index
    const twice = mergeExportLibrary(once, again).index
    expect(twice.playlists).toHaveLength(1)
    expect(twice.tracks.find((t) => t.uri === U('a'))!.playlists).toHaveLength(1)
  })
})
