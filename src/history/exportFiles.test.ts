import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { HISTORY_FILE, unzipHistory } from './exportFiles'

describe('opening Spotify’s export', () => {
  it('knows the history files by name', () => {
    for (const n of ['Spotify Extended Streaming History/Streaming_History_Audio_2019-2021_0.json', 'MyData/StreamingHistory_music_0.json', 'endsong_3.json']) expect(HISTORY_FILE.test(n)).toBe(true)
    for (const n of ['Spotify Extended Streaming History/ReadMeFirst_ExtendedStreamingHistory.pdf', 'MyData/Userdata.json', 'MyData/Playlist1.json']) expect(HISTORY_FILE.test(n)).toBe(false)
  })

  it('takes only the history out of the ZIP', () => {
    const zip = zipSync({
      'Spotify Extended Streaming History/Streaming_History_Audio_2024_1.json': strToU8('[{"ts":"2024-01-01T00:00:00Z"}]'),
      'Spotify Extended Streaming History/ReadMeFirst.pdf': strToU8('pdf'),
      'Spotify Account Data/Userdata.json': strToU8('{"email":"x"}'),
    })
    const out = unzipHistory(zip)
    expect(out.map((f) => f.name)).toEqual(['Spotify Extended Streaming History/Streaming_History_Audio_2024_1.json'])
    expect(JSON.parse(out[0].text)).toHaveLength(1)
  })
})
