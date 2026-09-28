import { useCallback, useEffect, useState, type WheelEvent } from 'react'
import type { FriendlyError } from '../spotify/errors'
import type { MediaItem } from '../spotify/normalize'
import { explainError, fetchPlaylists, playItem } from '../spotify/playbackService'
import { Artwork } from '../ui/Artwork'
import { EmptyState, ErrorState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'

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
              <button className="tile-play" onClick={() => playItem(p)} aria-label={`Play ${p.title}`}>
                <Artwork src={p.art} />
                <span className="tile-title">{p.title}</span>
              </button>
              <span className="tile-sub">
                <span>{p.subtitle}</span>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="tile-link" aria-label={`Open ${p.title} in Spotify`}>
                    <Icon name="external" size={16} />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
