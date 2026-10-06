import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { linkHandler, tickLink } from '../app/router'
import { TransportKeys } from '../app/Transport'
import { formatTime } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import type { MediaItem } from '../spotify/normalize'
import { refreshQueue, seekTo, skipNext, skipPrevious, togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockValue } from '../ui/clock'
import { EmptyState, ErrorState, SkeletonRows } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { MediaRow } from '../ui/MediaRow'
import { useCrate } from '../ui/useCrate'
import { Scrubber } from '../ui/Scrubber'
import { TapKey } from '../ui/TapKey'

/** "27 min 40" — how much music is ahead. */
function ahead(ms: number) {
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return m ? `${m} min ${String(s).padStart(2, '0')}` : `${s} s`
}

/**
 * The queue rises from the handle as a drawer; the deck compresses into the band
 * above it (the same title, cover and scrub line — one machine, moved). Spotify's
 * Web API can add to the queue but can't reorder, remove or jump, so rows are read-only.
 */
export function Queue() {
  const { data, loading, error } = usePlayback((s) => s.queue)
  const crate = useCrate()
  const deck = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      title: s.playback.title,
      art: s.playback.albumArt,
      album: s.playback.album,
      durationMs: s.playback.durationMs,
      isPlaying: s.playback.isPlaying,
      canToggle: selectCanToggle(s),
      d: s.playback.disallows,
    })),
  )

  useEffect(() => {
    void refreshQueue()
  }, [])

  const upNext = data?.upNext ?? []
  const [next, ...rest] = upNext
  const totalMs = upNext.reduce((sum, i) => sum + (i.durationMs ?? 0), 0)
  // When each track starts: the rest of this one, then every track before it.
  // The position comes from the playback clock, rounded to 5 s so this re-renders rarely.
  const positionMs = useClockValue(spotifyClock, (ms) => Math.floor(ms / 5000) * 5000)
  const left = Math.max(0, deck.durationMs - positionMs)
  const startsIn = upNext.map((_, i) => left + upNext.slice(0, i).reduce((sum, t) => sum + (t.durationMs ?? 0), 0))

  return (
    <div className="qd">
      <h1 className="sr-only">Queue</h1>
      {deck.has && (
        <div className="qd-deck" data-paused={!deck.isPlaying || undefined}>
          <div className="qd-lockup">
            <p className="qd-title display">{deck.title}</p>
            <span className="qd-art">
              <Artwork src={deck.art} alt={deck.album ? `${deck.album} cover` : ''} />
            </span>
          </div>
          <div className="qd-keys">
            <TransportKeys
              isPlaying={deck.isPlaying}
              canToggle={deck.canToggle}
              canPrevious={!deck.d.skippingPrev}
              canNext={!deck.d.skippingNext}
              onToggle={togglePlay}
              onPrevious={skipPrevious}
              onNext={skipNext}
            />
          </div>
          <div className="qd-scrub">
            <Scrubber clock={spotifyClock} durationMs={deck.durationMs} onSeek={seekTo} disabled={deck.d.seeking} label="Song position" />
          </div>
        </div>
      )}

      <section className="qd-drawer" aria-label="Queue">
        <a className="qd-close" href="/" onClick={tickLink}>
          <span aria-hidden="true">﹀</span>
          <span className="label">close queue</span>
          <span aria-hidden="true">﹀</span>
        </a>

        <header className="qd-head">
          <span className="label">queue{data?.current ? ` (${upNext.length})` : ''}</span>
          {data?.current && totalMs >= 1000 && <span className="serif qd-ahead">{ahead(totalMs)} of music ahead.</span>}
          <TapKey
            className="qd-rescan"
            onClick={() => {
              feedback.play('select')
              void refreshQueue()
            }}
            disabled={loading}
            aria-label="Refresh queue"
            data-spin={loading || undefined}
          >
            <Icon name="refresh" size={18} />
            <span className="label">rescan</span>
          </TapKey>
        </header>

        {!data && loading && <SkeletonRows count={6} />}
        {!data && error && <ErrorState error={error} onRetry={() => void refreshQueue()} />}
        {data && !data.current && (
          <EmptyState title="Nothing playing" detail="Your queue appears here once something is playing.">
            <a className="btn" href="/search" onClick={linkHandler}>
              Library
            </a>
          </EmptyState>
        )}
        {data?.current && !next && (
          <EmptyState title="Nothing queued" detail="Add songs from the library with the + key.">
            <a className="btn" href="/search" onClick={linkHandler}>
              Library
            </a>
          </EmptyState>
        )}

        {next && <NextUp item={next} startsInMs={startsIn[0]} />}
        {rest.length > 0 && (
          <ol className="rows qd-rows">
            {rest.map((item, i) => (
              <MediaRow
                key={`${item.uri}-${i}`}
                item={item}
                lead={<span className="row-num">{String(i + 2).padStart(2, '0')}</span>}
                trail={<span className="row-when readout">in {formatTime(startsIn[i + 1])}</span>}
                onCrate={item.kind === 'track' ? crate.toggle : undefined}
                crated={crate.has(item.uri)}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

/** The big step of the staircase: what plays next, at scale. */
function NextUp({ item, startsInMs }: { item: MediaItem; startsInMs: number }) {
  return (
    <div className="qd-next">
      <span className="readout qd-next-num">01</span>
      <Artwork src={item.art} alt={`${item.title} artwork`} className="qd-next-art" />
      <div className="qd-next-text">
        <span className="label">next</span>
        <span className="qd-next-title display">{item.title}</span>
        <span className="serif qd-next-sub">{item.subtitle}</span>
      </div>
      <span className="readout qd-next-when">in {formatTime(startsInMs)}</span>
      <span className="readout qd-next-time">{item.durationMs ? formatTime(item.durationMs) : ''}</span>
    </div>
  )
}
