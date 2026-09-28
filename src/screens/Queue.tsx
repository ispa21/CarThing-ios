import { useEffect } from 'react'
import { linkHandler } from '../app/router'
import { formatTime } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import type { MediaItem } from '../spotify/normalize'
import { refreshQueue } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Artwork } from '../ui/Artwork'
import { EmptyState, ErrorState, SkeletonRows } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { MediaRow } from '../ui/MediaRow'

/**
 * GET /me/player/queue. Spotify's Web API can add to the queue but can't
 * reorder, remove or jump to queue items, so rows here are read-only.
 * Stepped depth: what's playing is the largest thing on the page, then the tracklist.
 */
export function Queue() {
  const { data, loading, error } = usePlayback((s) => s.queue)

  useEffect(() => {
    void refreshQueue()
  }, [])

  const count = data?.upNext.length ?? 0
  const totalMs = data?.upNext.reduce((sum, i) => sum + (i.durationMs ?? 0), 0) ?? 0

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Queue</h1>
        {data?.current && (
          <p className="page-meta readout">
            {count} up next{totalMs >= 60_000 ? ` · ${Math.round(totalMs / 60_000)} min` : ''}
          </p>
        )}
        <button
          className="icon-btn"
          onClick={() => {
            feedback.play('select')
            void refreshQueue()
          }}
          disabled={loading}
          aria-label="Refresh queue"
          data-spin={loading || undefined}
        >
          <Icon name="refresh" />
        </button>
      </header>

      {!data && loading && <SkeletonRows count={6} />}
      {!data && error && (
        <ErrorState error={error} onRetry={() => void refreshQueue()} />
      )}
      {data && !data.current && (
        <EmptyState title="Nothing playing" detail="Your queue appears here once something is playing.">
          <a className="btn" href="/search" onClick={linkHandler}>
            Search
          </a>
        </EmptyState>
      )}

      {data?.current && (
        <div className="queue-layout">
          <section aria-labelledby="q-now" className="queue-now">
            <h2 id="q-now" className="section-title label">
              <span className="queue-now-label">
                <span className="led" aria-hidden="true" />
                Now playing
              </span>
            </h2>
            <NowCard item={data.current} />
          </section>
          <section aria-labelledby="q-next" className="queue-next">
            <h2 id="q-next" className="section-title label">
              Up next
            </h2>
            {data.upNext.length ? (
              <ol className="rows">
                {data.upNext.map((item, i) => (
                  <MediaRow key={`${item.uri}-${i}`} item={item} lead={<span className="row-num">{String(i + 1).padStart(2, '0')}</span>} />
                ))}
              </ol>
            ) : (
              <EmptyState title="Nothing queued" detail="Add songs from Search with the + key.">
                <a className="btn" href="/search" onClick={linkHandler}>
                  Search
                </a>
              </EmptyState>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/** The live item at hero scale: big art, marquee title. */
function NowCard({ item }: { item: MediaItem }) {
  return (
    <div className="queue-hero">
      <Artwork src={item.art} alt={`${item.title} artwork`} className="queue-hero-art" />
      <div className="queue-hero-text">
        <p className="queue-hero-title">{item.title}</p>
        <p className="queue-hero-sub">{item.subtitle}</p>
        <p className="queue-hero-meta">
          {item.durationMs ? <span className="readout">{formatTime(item.durationMs)}</span> : null}
          {item.url && (
            <a className="np-attr" href={item.url} target="_blank" rel="noopener noreferrer">
              Open in Spotify
              <Icon name="external" size={14} />
            </a>
          )}
        </p>
      </div>
    </div>
  )
}
