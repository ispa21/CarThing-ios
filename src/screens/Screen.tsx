import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { resolveLyrics, type ResolvedLyrics } from '../lyrics/resolver'
import { feedback } from '../sensory/feedback'
import { usePlayback } from '../store/playback'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockPainter } from '../ui/clock'
import { Visual } from './Visual'
import { TapKey } from '../ui/TapKey'

const MODES = ['artwork', 'lyrics', 'visual', 'clock', 'now playing'] as const
type Mode = (typeof MODES)[number]
const HIDE_MS = 3500

/** The wall clock, to the minute. A timer, but it only paints — no feedback. */
function useWallClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * SCREEN: PartyDeck as a second display — open it on a TV or a spare laptop and sign
 * in there. It reads playback itself, so it needs nothing from your phone. Arrow keys
 * (or a TV remote) cycle the mode; the mode keys fade away when nobody's touching it.
 * (Picking the TV's mode from the phone needs the planned rooms link.)
 */
export function Screen() {
  const [mode, setMode] = useState<Mode>('now playing')
  const [idle, setIdle] = useState(false)
  const [poke, setPoke] = useState(0)
  const clock = useWallClock()
  const s = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      title: s.playback.title,
      artist: s.playback.artist,
      album: s.playback.album,
      art: s.playback.albumArt,
      durationMs: s.playback.durationMs,
      device: s.playback.deviceName,
    })),
  )

  useEffect(() => {
    const t = setTimeout(() => setIdle(true), HIDE_MS)
    return () => clearTimeout(t)
  }, [poke, mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault() // the global ←/→ seek shortcut steps aside on this screen
      const i = MODES.indexOf(mode)
      setMode(MODES[(i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length])
      setIdle(false)
      setPoke((p) => p + 1)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [mode])

  const progressRef = useRef<HTMLSpanElement>(null)
  useClockPainter(spotifyClock, (ms, snap) => {
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${snap.durationMs ? Math.min(1, ms / snap.durationMs) : 0})`
  })

  const lyrics = useScreenLyrics(mode === 'lyrics' && s.title ? { title: s.title, artist: s.artist ?? '', durationMs: s.durationMs } : null)

  return (
    <div
      className="tv"
      data-mode={mode}
      data-idle={idle || undefined}
      onPointerMove={() => {
        setIdle(false)
        setPoke((p) => p + 1)
      }}
    >
      <h1 className="sr-only">Screen: {mode}</h1>
      <p className="tv-corner tv-tl readout">
        <span className="lamp" data-live={s.has || undefined} aria-hidden="true" />
        partydeck screen{s.device ? ` · ${s.device.toLowerCase()}` : ''}
      </p>
      <p className="tv-corner tv-tr readout">{clock}</p>

      {!s.has ? (
        <div className="tv-now">
          <p className="display tv-title">Standby</p>
          <p className="serif tv-sub">Nothing is playing on this account.</p>
        </div>
      ) : mode === 'now playing' ? (
        <div className="tv-now">
          <Artwork src={s.art} alt={s.album ? `${s.album} cover` : ''} className="tv-now-art" />
          <p className="display tv-title">{s.title}</p>
          <p className="serif tv-sub">{s.artist}</p>
        </div>
      ) : mode === 'artwork' ? (
        <figure className="tv-art">
          <Artwork src={s.art} alt={s.album ? `${s.album} cover` : ''} />
          <figcaption className="readout">
            {s.title?.toLowerCase()} — {s.artist?.toLowerCase()}
          </figcaption>
        </figure>
      ) : mode === 'clock' ? (
        <div className="tv-now">
          <p className="display tv-clock">{clock}</p>
          <p className="serif tv-sub">
            {s.title}, by {s.artist}
          </p>
        </div>
      ) : mode === 'visual' ? (
        <div className="tv-visual">
          <Visual embedded />
        </div>
      ) : (
        <div className="tv-lyrics">
          {lyrics === 'loading' ? null : lyrics ? (
            <ol>
              {lyrics.lines
                .filter((l) => l.text)
                .slice(0, 6)
                .map((l, i) => (
                  <li key={i}>{l.text}</li>
                ))}
            </ol>
          ) : (
            <p className="serif tv-sub">Lyrics unavailable for this song.</p>
          )}
          <p className="readout">untimed · line sync is off for spotify playback</p>
        </div>
      )}

      {s.has && mode !== 'visual' && (
        <span className="tv-progress" aria-hidden="true">
          <span ref={progressRef} />
        </span>
      )}

      <div className="tv-modes" role="group" aria-label="Screen mode">
        {MODES.map((m) => (
          <TapKey
            key={m}
            className="tv-mode readout"
            aria-pressed={mode === m}
            onClick={() => {
              if (m === mode) return
              feedback.play('select')
              setMode(m)
            }}
            onFocus={() => setIdle(false)}
          >
            {m}
          </TapKey>
        ))}
      </div>
    </div>
  )
}

/** Lyrics for the TV's lyrics mode: the first lines, untimed (lyrics/policy.ts). */
function useScreenLyrics(query: { title: string; artist: string; durationMs: number } | null): ResolvedLyrics | null | 'loading' {
  const key = query ? `${query.title}\u0000${query.artist}` : null
  const [got, setGot] = useState<{ key: string; lyrics: ResolvedLyrics | null } | null>(null)
  const { title = '', artist = '', durationMs } = query ?? {}
  useEffect(() => {
    if (!key) return
    let cancelled = false
    void resolveLyrics({ title, artist, durationMs }).then((lyrics) => {
      if (!cancelled) setGot({ key, lyrics })
    })
    return () => {
      cancelled = true
    }
  }, [key, title, artist, durationMs])
  if (!key) return null
  return got?.key === key ? got.lyrics : 'loading'
}
