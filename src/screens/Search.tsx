import { useEffect, useRef, useState } from 'react'
import { createLatestRunner } from '../lib/latest'
import type { FriendlyError } from '../spotify/errors'
import { isSearchEmpty, type SearchView } from '../spotify/normalize'
import { explainError, playItem, queueItem, searchCatalog } from '../spotify/playbackService'
import { feedback } from '../sensory/feedback'
import { usePlayback } from '../store/playback'
import { EmptyState, ErrorState, SkeletonRows } from '../ui/Feedback'
import { MediaRow } from '../ui/MediaRow'
import { useCrate } from '../ui/useCrate'
import { PlaylistShelf } from './PlaylistShelf'

type State =
  | { status: 'idle' }
  | { status: 'searching'; previous?: SearchView }
  | { status: 'results'; results: SearchView }
  | { status: 'empty'; query: string }
  | { status: 'error'; error: FriendlyError }

const KINDS: Array<{ key: keyof SearchView; title: string }> = [
  { key: 'tracks', title: 'tracks' },
  { key: 'albums', title: 'albums' },
  { key: 'artists', title: 'artists' },
  { key: 'playlists', title: 'playlists' },
]

export function Search() {
  const [query, setQuery] = useState('')
  const playingUri = usePlayback((s) => s.playback.uri)
  const [state, setState] = useState<State>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<keyof SearchView>('tracks')
  const crate = useCrate()

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

  const list = results?.[kind] ?? []

  return (
    <div className="lib" data-state={state.status}>
      <h1 className="sr-only">Library</h1>
      <div className="lib-tuner">
        <form
          role="search"
          className="lib-form"
          onSubmit={(e) => {
            e.preventDefault()
            runner.flush()
            inputRef.current?.blur() // hide the mobile keyboard
          }}
        >
          <label className="label lib-tune-label" htmlFor="lib-q">
            tune to
          </label>
          <span className="lib-query" data-busy={state.status === 'searching' || undefined}>
            {/* The input sizes to its text (via this mirror), so the caret sits right after the query. */}
            <span className="lib-field">
              <span className="lib-mirror" aria-hidden="true">
                {query || 'search'}
              </span>
              <input
              id="lib-q"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              placeholder="search"
              aria-label="Search Spotify"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus={window.matchMedia('(pointer: fine)').matches}
              />
            </span>
            <span className="lib-caret" aria-hidden="true" />
          </span>
        </form>
        <div className="lib-kinds" role="tablist" aria-label="Result type">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="tab"
              className="lib-kind"
              aria-selected={kind === k.key}
              onClick={() => {
                feedback.play('select')
                setKind(k.key)
              }}
            >
              {k.title}
              {results ? <span className="lib-count"> ({results[k.key].length})</span> : null}
            </button>
          ))}
        </div>
        <p className="lib-hint serif">
          Ten stations at a time. <span>Tap one to open it in Spotify, ▶ to play it here, + to queue it.</span>
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {state.status === 'searching' ? 'Searching' : state.status === 'empty' ? 'No results' : state.status === 'results' ? 'Results updated' : ''}
      </p>

      <div className="lib-results">
        {state.status === 'searching' && !results && <SkeletonRows count={6} />}
        {state.status === 'empty' && (
          <EmptyState title={`Nothing found for “${state.query}”`} detail="Check the spelling or try fewer words.">
            <button
              className="btn"
              onClick={() => {
                feedback.play('back')
                onChange('')
                inputRef.current?.focus()
              }}
            >
              Clear search
            </button>
          </EmptyState>
        )}
        {state.status === 'error' && <ErrorState error={state.error} onRetry={() => onChange(query)} />}
        {results && (
          <div className="results" data-stale={state.status === 'searching' || undefined}>
            {list.length ? (
              <ol className="rows lib-rows" aria-label={kind}>
                {list.map((item, i) => (
                  <MediaRow
                    key={item.uri}
                    item={item}
                    lead={<span className="row-num">{String(i + 1).padStart(2, '0')}</span>}
                    onPlay={playItem}
                    onQueue={item.kind === 'track' ? queueItem : undefined}
                    onCrate={item.kind === 'track' ? crate.toggle : undefined}
                    crated={crate.has(item.uri)}
                    live={item.uri === playingUri}
                  />
                ))}
              </ol>
            ) : (
              <EmptyState title={`No ${kind} for this search`} detail="Try another tab." />
            )}
          </div>
        )}
      </div>

      <div className="lib-table">
        <PlaylistShelf />
      </div>
    </div>
  )
}
