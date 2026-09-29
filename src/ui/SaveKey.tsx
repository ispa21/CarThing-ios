import { useState } from 'react'
import { hasScope } from '../spotify/auth'
import { saveAsPlaylist } from '../spotify/playbackService'
import { PressKey } from './PressKey'
import { ReconnectButton } from './ReconnectButton'
import { SpotifyLink } from './SpotifyLink'

/** Saves a set as a private Spotify playlist, then becomes the link to it. */
export function SaveKey({ name, description, uris, label = 'Save as playlist' }: { name: string; description: string; uris: string[]; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<{ uri: string; url: string | null; for: string } | null>(null)
  const key = uris.join(' ')
  if (saved && saved.for === key)
    return (
      <SpotifyLink className="btn" uri={saved.uri} url={saved.url} label={`Open ${name} in Spotify`}>
        Saved — open in Spotify
      </SpotifyLink>
    )
  if (!hasScope('playlist-modify-private')) return <ReconnectButton label="Reconnect to save playlists" />
  return (
    <PressKey
      className="btn"
      depth={1}
      disabled={busy || !uris.length}
      onClick={async () => {
        setBusy(true)
        const r = await saveAsPlaylist(name, description, uris)
        setBusy(false)
        if (r) setSaved({ ...r, for: key })
      }}
    >
      {busy ? 'Saving…' : label}
    </PressKey>
  )
}
