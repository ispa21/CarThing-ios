import { useCallback, useEffect, useState, type CSSProperties, type WheelEvent } from 'react'
import type { FriendlyError } from '../spotify/errors'
import type { MediaItem } from '../spotify/normalize'
import { explainError, fetchPlaylists, playItem } from '../spotify/playbackService'
import { Artwork } from '../ui/Artwork'
import { EmptyState, ErrorState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { SpotifyLink } from '../ui/SpotifyLink'

type State = { status: 'loading' } | { status: 'ready'; items: MediaItem[] } | { status: 'error'; error: FriendlyError }

/**
 * The table: your playlists lie on one line, each cover sized by how many tracks it
 * holds (log scale, so a 2,000-song playlist doesn't dwarf the rest). Covers are whole.
 */
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

  const max = state.status === 'ready' ? Math.max(1, ...state.items.map((p) => p.count ?? 0)) : 1
  const size = (count = 0) => Math.log(count + 1) / Math.log(max + 1)

  return (
    <section aria-labelledby="playlists-title" className="table">
      <h2 id="playlists-title" className="table-head">
        <span className="label">
          the table · playlists{state.status === 'ready' && state.items.length > 0 ? ` (${state.items.length})` : ''}
        </span>
        <span className="serif table-note">Bigger means more tracks.</span>
      </h2>
      {state.status === 'loading' && (
        <ul className="tiles" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="tile" style={{ '--s': (6 - i) / 6 } as CSSProperties}>
              <span className="art skel" />
              <span className="skel skel-line" />
            </li>
          ))}
        </ul>
      )}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={retry} />}
      {state.status === 'ready' && !state.items.length && (
        <EmptyState title="No playlists yet" detail="Playlists you make or save in Spotify show up here." />
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="tiles" onWheel={onWheel}>
          {state.items.map((p) => (
            <li key={p.id} className="tile" style={{ '--s': size(p.count) } as CSSProperties}>
              {/* The cover is the playlist: it opens in the Spotify app. ▶ plays it on your device. */}
              <SpotifyLink className="tile-main" uri={p.uri} url={p.url} label={`Open ${p.title} in Spotify`}>
                <Artwork src={p.art} />
              </SpotifyLink>
              <span className="tile-sub">
                <span className="tile-title readout">
                  {p.title.toLowerCase()}
                  {p.count != null ? ` (${p.count})` : ''}
                </span>
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
