import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { linkHandler } from '../app/router'
import { formatTime } from '../lib/progress'
import { mixHex } from '../lib/record'
import { feedback } from '../sensory/feedback'
import { crossfadeToNext, refreshQueue, seekBy } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockPainter, useClockValue } from '../ui/clock'
import { EmptyState } from '../ui/Feedback'
import { PressKey } from '../ui/PressKey'
import { useRecordColours } from '../ui/useRecordColours'

const PRINT = '#8f897b'

/**
 * MIX: two decks. A is what's playing, B is next in the queue. Dragging the crossfader
 * moves the records, their light and the on-air lamp between them; let go past the middle
 * and the move is real — the level dips, Spotify skips to B, seeks it to B's in-cue, and
 * the level comes back. Spotify plays one track at a time, so there is no EQ and no blend:
 * nothing here pretends otherwise.
 */
export function Mix() {
  const a = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      trackId: s.playback.trackId,
      uri: s.playback.uri,
      title: s.playback.title,
      artist: s.playback.artist,
      album: s.playback.album,
      art: s.playback.albumArt,
      durationMs: s.playback.durationMs,
      canNext: !s.playback.disallows.skippingNext,
      canSeek: !s.playback.disallows.seeking,
    })),
  )
  const b = usePlayback((s) => (s.queue.data?.current?.uri === s.playback.uri ? (s.queue.data.upNext[0] ?? null) : null))
  useEffect(() => {
    if (a.uri) void refreshQueue()
  }, [a.uri])

  const colourA = useRecordColours(a.art)?.record ?? PRINT
  const colourB = useRecordColours(b?.art ?? null)?.record ?? PRINT

  const [x, setX] = useState(0)
  const [moving, setMoving] = useState(false)
  const [outCue, setOutCue] = useState<number | null>(null)
  const [inCue, setInCue] = useState(0)
  const [auto, setAuto] = useState(false)

  // A new track on deck A: its cues belong to the old one.
  const [cuesFor, setCuesFor] = useState(a.trackId)
  if (cuesFor !== a.trackId) {
    setCuesFor(a.trackId)
    setOutCue(null)
    setInCue(0)
    setX(0)
  }

  const positionMs = useClockValue(spotifyClock, (ms) => Math.floor(ms / 1000) * 1000)
  const ready = a.has && Boolean(b) && a.canNext && !moving

  const perform = (silent: boolean) => {
    setMoving(true)
    setX(100)
    void crossfadeToNext({ inMs: inCue, silent }).finally(() => {
      setMoving(false)
      setX(0)
    })
  }

  // AUTO: at A's out-cue, the machine makes the move itself (while MIX is open). A timer,
  // not a gesture, so it's silent.
  const fired = useRef<string | null>(null)
  useClockPainter(
    spotifyClock,
    (ms) => {
      if (!auto || outCue === null || !ready || ms < outCue || fired.current === a.trackId) return
      fired.current = a.trackId
      perform(true)
    },
    auto && outCue !== null,
  )

  const release = () => {
    if (!ready) return setX(0)
    if (x >= 50) perform(false)
    else setX(0)
  }

  const t = x / 100
  const live = mixHex(colourA, colourB, t)
  const onAirB = t >= 0.5

  if (!a.has) {
    return (
      <div className="page">
        <h1 className="sr-only">Mix</h1>
        <EmptyState title="Nothing playing" detail="MIX needs a record on deck A. Start something, and whatever's next in the queue loads onto B.">
          <a className="btn" href="/search" onClick={linkHandler}>
            Library
          </a>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mix" style={{ '--mix': live, '--a': colourA, '--b': colourB, '--t': t } as CSSProperties}>
      <h1 className="sr-only">Mix</h1>

      <section className="mix-deck mix-a" aria-label={`Deck A: ${a.title}, playing`}>
        <p className="mix-deck-head">
          <span className="display mix-letter">A</span>
          <span className="readout">{onAirB ? 'fading out' : 'playing'}</span>
        </p>
        <div className="mix-rec" style={{ scale: 1 - 0.3 * t, opacity: 1 - 0.55 * t } as CSSProperties}>
          <Artwork src={a.art} alt={a.album ? `${a.album} cover` : ''} />
        </div>
        <p className="display mix-title" style={{ opacity: 1 - 0.55 * t }}>
          {a.title}
        </p>
        <p className="serif mix-sub">
          {a.artist}
          <span className="readout">
            {' '}
            · {formatTime(positionMs)} / {formatTime(a.durationMs)}
          </span>
        </p>
        <div className="mix-keys">
          <PressKey
            className="key key-word"
            depth={1}
            aria-pressed={outCue !== null}
            onClick={() => {
              feedback.play('toggle')
              setOutCue(outCue === null ? positionMs : null)
            }}
            aria-label={outCue === null ? 'Set the out-cue here' : `Out-cue at ${formatTime(outCue)}. Clear`}
          >
            <span className="label">out cue</span>
            <span className="readout">{outCue === null ? 'set' : formatTime(outCue)}</span>
          </PressKey>
          <PressKey className="key key-trim" depth={1} disabled={!a.canSeek} onClick={() => void seekBy(-5000)} aria-label="Back 5 seconds">
            <span className="readout">−5s</span>
          </PressKey>
          <PressKey className="key key-trim" depth={1} disabled={!a.canSeek} onClick={() => void seekBy(5000)} aria-label="Forward 5 seconds">
            <span className="readout">+5s</span>
          </PressKey>
        </div>
      </section>

      <div className="mix-air" aria-live="polite">
        <span className="label">on air</span>
        <span className="mix-lamp" aria-hidden="true" />
        <span className="display mix-onair">{onAirB ? 'B' : 'A'}</span>
        <span className="readout">
          a {Math.round((1 - t) * 100)} · b {Math.round(t * 100)}
        </span>
      </div>

      <section className="mix-deck mix-b" aria-label={b ? `Deck B: ${b.title}, cued from the queue` : 'Deck B: empty'}>
        <p className="mix-deck-head">
          <span className="readout">{b ? (onAirB ? `playing from ${formatTime(inCue)}` : 'cued') : 'empty'}</span>
          <span className="display mix-letter">B</span>
        </p>
        {b ? (
          <>
            <div className="mix-rec" style={{ scale: 0.7 + 0.3 * t, opacity: 0.45 + 0.55 * t } as CSSProperties}>
              <Artwork src={b.art} alt={`${b.title} artwork`} />
            </div>
            <p className="display mix-title" style={{ opacity: 0.45 + 0.55 * t }}>
              {b.title}
            </p>
            <p className="serif mix-sub">
              from the queue
              <span className="readout"> · in at {formatTime(inCue)}</span>
            </p>
            <div className="mix-keys">
              <PressKey className="key key-trim" depth={1} disabled={inCue === 0} onClick={() => setInCue(Math.max(0, inCue - 5000))} aria-label="Move B's in-cue 5 seconds earlier">
                <span className="readout">−5s</span>
              </PressKey>
              <PressKey className="key key-trim" depth={1} onClick={() => setInCue(Math.min((b.durationMs ?? 60_000) - 10_000, inCue + 5000))} aria-label="Move B's in-cue 5 seconds later">
                <span className="readout">+5s</span>
              </PressKey>
              <span className="key key-word mix-cue-plate" aria-hidden="true">
                <span className="label">in cue</span>
                <span className="readout">{formatTime(inCue)}</span>
              </span>
            </div>
          </>
        ) : (
          <EmptyState title="Nothing queued" detail="Queue a track from the library and it loads onto B.">
            <a className="btn" href="/search" onClick={linkHandler}>
              Library
            </a>
          </EmptyState>
        )}
      </section>

      <div className="mix-fader">
        <div className="mix-fader-legend" aria-hidden="true">
          <span className="label">◄ a</span>
          <span className="label">crossfade</span>
          <span className="label">b ►</span>
        </div>
        <input
          className="crossfader"
          type="range"
          min={0}
          max={100}
          value={x}
          disabled={!ready}
          aria-label="Crossfader, A to B. Release past the middle to move to B."
          aria-valuetext={`${Math.round((1 - t) * 100)}% A, ${Math.round(t * 100)}% B`}
          onChange={(e) => setX(Number(e.target.value))}
          onPointerUp={release}
          onKeyUp={(e) => {
            if (e.key === 'Enter' || e.key === 'End') release() // arrows only preview; Enter or End commits
          }}
        />
        <span className="mix-fader-scale" aria-hidden="true" />
      </div>

      <p className="serif mix-note">Spotify plays one track at a time. Past the middle, A dips out and B starts at its cue — a real move, not a blend.</p>
      <div className="mix-auto">
        <PressKey
          className="key key-word"
          depth={1}
          aria-pressed={auto}
          disabled={outCue === null || !b}
          onClick={() => {
            feedback.play('toggle')
            setAuto(!auto)
          }}
          aria-label={auto ? 'Auto move at the out-cue: on' : 'Auto move at the out-cue: off'}
        >
          <span className="label">auto</span>
          <span className="readout">{auto && outCue !== null ? `(at ${formatTime(outCue)})` : 'off'}</span>
        </PressKey>
      </div>
    </div>
  )
}
