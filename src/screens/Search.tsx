import { useEffect, useRef, useState } from 'react'
import { createLatestRunner } from '../lib/latest'
import type { FriendlyError } from '../spotify/errors'
import { isSearchEmpty, type SearchView } from '../spotify/normalize'
import { explainError, playItem, queueItem, searchCatalog } from '../spotify/playbackService'
import { EmptyState, SkeletonRows } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { MediaRow } from '../ui/MediaRow'

type State =
  | { status: 'idle' }
  | { status: 'searching'; previous?: SearchView }
  | { status: 'results'; results: SearchView }
  | { status: 'empty'; query: string }
  | { status: 'error'; error: FriendlyError }

const SECTIONS: Array<{ key: keyof SearchView; title: string; max: number }> = [
  { key: 'tracks', title: 'Songs', max: 8 },
  { key: 'artists', title: 'Artists', max: 4 },
  { key: 'albums', title: 'Albums', max: 4 },
  { key: 'playlists', title: 'Playlists', max: 4 },
]

export function Search() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  // Newest query wins: older in-flight requests are aborted, late responses dropped.
  const [runner] = useState(() =>
    createLatestRunner(searchCatalog, 250, {
      onResult: (results, q: string) => setState(isSearchEmpty(results) ? { status: 'empty', query: q } : { status: 'results', results }),
      onError: (e) => {
        const error = explainError(e)
        if (error) setState({ status: 'error', error })
      },
    }),
  )

  useEffect(() => runner.stop, [runner])

  const onChange = (value: string) => {
    setQuery(value)
    const q = value.trim()
    if (!q) {
      runner.stop()
      setState({ status: 'idle' })
      return
    }
    // Keep the previous results on screen while typing — it feels instant.
    setState((s) => ({ status: 'searching', previous: s.status === 'results' ? s.results : s.status === 'searching' ? s.previous : undefined }))
    runner.run(q)
  }

  const results = state.status === 'results' ? state.results : state.status === 'searching' ? state.previous : undefined

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Search</h1>
      </header>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          runner.flush()
          inputRef.current?.blur() // hide the mobile keyboard
        }}
      >
        <label className="field" data-busy={state.status === 'searching' || undefined}>
          <Icon name="search" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Songs, artists, albums, playlists"
            aria-label="Search Spotify"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
          />
        </label>
      </form>

      <p className="sr-only" aria-live="polite">
        {state.status === 'searching' ? 'Searching' : state.status === 'empty' ? 'No results' : state.status === 'results' ? 'Results updated' : ''}
      </p>

      {state.status === 'idle' && <p className="hint">Find something to play or queue.</p>}
      {state.status === 'searching' && !results && <SkeletonRows count={6} />}
      {state.status === 'empty' && <EmptyState title={`Nothing found for “${state.query}”`} detail="Check the spelling or try fewer words." />}
      {state.status === 'error' && (
        <EmptyState title={state.error.title} detail={state.error.detail}>
          <button className="btn" onClick={() => onChange(query)}>
            Try again
          </button>
        </EmptyState>
      )}

      {results && (
        <div className="results" data-stale={state.status === 'searching' || undefined}>
          {SECTIONS.map(({ key, title, max }) =>
            results[key].length ? (
              <section key={key} aria-label={title}>
                <h2 className="section-title">{title}</h2>
                <ul className="rows">
                  {results[key].slice(0, max).map((item) => (
                    <MediaRow key={item.uri} item={item} onPlay={playItem} onQueue={item.kind === 'track' ? queueItem : undefined} showKind />
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
