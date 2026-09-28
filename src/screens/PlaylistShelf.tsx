import { useCallback, useEffect, useState, type WheelEvent } from 'react'
import type { FriendlyError } from '../spotify/errors'
import type { MediaItem } from '../spotify/normalize'
import { explainError, fetchPlaylists, playItem } from '../spotify/playbackService'
import { Artwork } from '../ui/Artwork'
import { EmptyState, ErrorState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { SpotifyLink } from '../ui/SpotifyLink'

type State = { status: 'loading' } | { status: 'ready'; items: MediaItem[] } | { status: 'error'; error: FriendlyError }

/** Your playlists as a shelf of presets. Horizontal on landscape phones, a grid elsewhere. */
export function PlaylistShelf() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(() => {
    fetchPlaylists()
      .then((items) => setState({ status: 'ready', items }))
      .catch((e: unknown) => {
        const error = explainError(e)
        if (error) setState({ status: 'error', error })
      })
  }, [])

  useEffect(load, [load])

  const retry = () => {
    setState({ status: 'loading' })
    load()
  }

  // A mouse wheel scrolls a horizontal shelf sideways (it's vertical otherwise).
  const onWheel = (e: WheelEvent<HTMLUListElement>) => {
    const el = e.currentTarget
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY
  }

  return (
    <section aria-labelledby="playlists-title">
      <h2 id="playlists-title" className="section-title label">
        Your playlists
        {state.status === 'ready' && state.items.length > 0 && <span className="readout">{state.items.length}</span>}
      </h2>
      {state.status === 'loading' && (
        <ul className="tiles" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="tile">
              <span className="art skel" />
              <span className="skel skel-line" />
            </li>
          ))}
        </ul>
      )}
      {state.status === 'error' && (
        <ErrorState error={state.error} onRetry={retry} />
      )}
      {state.status === 'ready' && !state.items.length && (
        <EmptyState title="No playlists yet" detail="Playlists you make or save in Spotify show up here." />
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="tiles" onWheel={onWheel}>
          {state.items.map((p) => (
            <li key={p.id} className="tile">
              {/* The tile is the playlist: it opens in the Spotify app. ▶ plays it on your device. */}
              <SpotifyLink className="tile-main" uri={p.uri} url={p.url} label={`Open ${p.title} in Spotify`}>
                <Artwork src={p.art} />
                <span className="tile-title">{p.title}</span>
              </SpotifyLink>
              <span className="tile-sub">
                <span>{p.subtitle}</span>
                <PressKey className="icon-btn tile-key" depth={0.9} onClick={() => void playItem(p)} aria-label={`Play ${p.title}`}>
                  <Icon name="play" size={16} />
                </PressKey>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
