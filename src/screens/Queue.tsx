import { useEffect } from 'react'
import { linkHandler } from '../app/router'
import { feedback } from '../sensory/feedback'
import { refreshQueue } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { EmptyState, SkeletonRows } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { MediaRow } from '../ui/MediaRow'

/**
 * GET /me/player/queue. Spotify's Web API can add to the queue but can't
 * reorder, remove or jump to queue items, so rows here are read-only.
 */
export function Queue() {
  const { data, loading, error } = usePlayback((s) => s.queue)

  useEffect(() => {
    void refreshQueue()
  }, [])

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Queue</h1>
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
        <EmptyState title={error.title} detail={error.detail}>
          <button className="btn" onClick={refreshQueue}>
            Try again
          </button>
        </EmptyState>
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
            <h2 id="q-now" className="section-title">
              Now playing
            </h2>
            <ul className="rows">
              <MediaRow item={data.current} lead={<span className="led row-led" aria-hidden="true" />} />
            </ul>
          </section>
          <section aria-labelledby="q-next" className="queue-next">
            <h2 id="q-next" className="section-title">
              Up next
            </h2>
            {data.upNext.length ? (
              <ol className="rows">
                {data.upNext.map((item, i) => (
                  <MediaRow key={`${item.uri}-${i}`} item={item} lead={<span className="row-num">{String(i + 1).padStart(2, '0')}</span>} />
                ))}
              </ol>
            ) : (
              <EmptyState title="Nothing queued" detail="Add songs from Search with the + button." />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
