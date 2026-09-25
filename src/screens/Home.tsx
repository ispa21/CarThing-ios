import { useCallback, useEffect, useState } from 'react'
import { linkHandler } from '../app/router'
import type { FriendlyError } from '../spotify/errors'
import type { MediaItem } from '../spotify/normalize'
import { explainError, fetchPlaylists, playItem } from '../spotify/playbackService'
import { Artwork } from '../ui/Artwork'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'

type State = { status: 'loading' } | { status: 'ready'; items: MediaItem[] } | { status: 'error'; error: FriendlyError }

export function Home() {
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

  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="wordmark wordmark-sm">
          <span className="led" aria-hidden="true" />
          PartyDeck
        </h1>
        <a className="icon-btn" href="/settings" onClick={linkHandler} aria-label="Settings">
          <Icon name="settings" />
        </a>
      </header>

      <section aria-labelledby="playlists-title">
        <h2 id="playlists-title" className="section-title">
          Your playlists
        </h2>
        {state.status === 'loading' && (
          <ul className="tiles" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="tile">
                <span className="art skel" />
                <span className="skel skel-line" />
              </li>
            ))}
          </ul>
        )}
        {state.status === 'error' && (
          <EmptyState title={state.error.title} detail={state.error.detail}>
            <button className="btn" onClick={retry}>
              Try again
            </button>
          </EmptyState>
        )}
        {state.status === 'ready' && !state.items.length && (
          <EmptyState title="No playlists yet" detail="Playlists you make or save in Spotify show up here.">
            <a className="btn" href="/search" onClick={linkHandler}>
              Search Spotify
            </a>
          </EmptyState>
        )}
        {state.status === 'ready' && state.items.length > 0 && (
          <ul className="tiles">
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
    </div>
  )
}
