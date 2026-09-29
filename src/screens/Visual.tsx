import { useMemo, useRef, type CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { back, linkHandler } from '../app/router'
import { formatTime } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import { usePlayback } from '../store/playback'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockPainter, useClockValue } from '../ui/clock'
import { EmptyState } from '../ui/Feedback'
import { useRecordColours } from '../ui/useRecordColours'

const SIZE = 1000
const C = SIZE / 2

/** The world's fixed geometry: rings and a tick dial, drawn once. */
function useWorldPaths() {
  return useMemo(() => {
    const circle = (r: number) => `M ${C - r} ${C} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 `
    let thin = ''
    let thick = ''
    for (let i = 0; i < 16; i++) {
      const r = 250 + i * 34
      if (i % 5 === 0) thick += circle(r)
      else thin += circle(r)
    }
    let minor = ''
    let major = ''
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2
      const big = i % 15 === 0
      const r1 = 212
      const r2 = r1 + (big ? 24 : 11)
      const seg = `M ${(C + r1 * Math.sin(a)).toFixed(1)} ${(C - r1 * Math.cos(a)).toFixed(1)} L ${(C + r2 * Math.sin(a)).toFixed(1)} ${(C - r2 * Math.cos(a)).toFixed(1)} `
      if (big) major += seg
      else minor += seg
    }
    return { thin, thick, minor, major }
  }, [])
}

/**
 * VISUAL: the cover becomes the environment. Three colours really in the cover make
 * the world (ground, line, accent); the cover itself stays whole, as the sleeve a
 * record slides out of. Nothing here reacts to a beat — Spotify gives a remote no
 * audio — it moves with the track's time: a sweep goes round once per song, and the
 * title's tracking opens as it plays.
 */
export function Visual({ embedded = false }: { embedded?: boolean }) {
  const s = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      title: s.playback.title,
      artist: s.playback.artist,
      album: s.playback.album,
      art: s.playback.albumArt,
      durationMs: s.playback.durationMs,
      isPlaying: s.playback.isPlaying,
    })),
  )
  const colours = useRecordColours(s.art)
  const world = colours?.palette ?? { ground: '#ece6d8', line: '#151513', accent: '#8f897b' }
  const paths = useWorldPaths()

  const sweepRef = useRef<SVGGElement>(null)
  useClockPainter(spotifyClock, (ms, snap) => {
    const p = snap.durationMs ? Math.min(1, ms / snap.durationMs) : 0
    if (sweepRef.current) sweepRef.current.style.transform = `rotate(${p * 360}deg)`
  })
  // Tracking opens in steps of 5% of the song: a slow, legible change, not per-frame layout.
  const step = useClockValue(spotifyClock, (ms) => (s.durationMs ? Math.floor((ms / s.durationMs) * 20) : 0))
  const time = useClockValue(spotifyClock, (ms) => Math.floor(ms / 1000) * 1000)
  const titleLen = s.title?.length ?? 8
  const tracking = 0.01 + (step / 20) * 0.16

  const leave = () => {
    feedback.play('back')
    back('/')
  }

  if (!s.has) {
    return (
      <div className="visual visual-empty">
        <h1 className="sr-only">Visual</h1>
        <EmptyState title="Nothing playing" detail="VISUAL builds its world from the cover that's playing.">
          <a className="btn" href="/" onClick={linkHandler}>
            Back to the deck
          </a>
        </EmptyState>
      </div>
    )
  }

  return (
    <div
      className="visual"
      data-paused={!s.isPlaying || undefined}
      style={
        {
          '--ground': world.ground,
          '--line': world.line,
          '--accent': world.accent,
          '--fit': Math.min(1, 1320 / (titleLen * (0.5 + tracking) * 176)),
        } as CSSProperties
      }
    >
      <h1 className="sr-only">Visual: {s.title}</h1>
      <svg className="visual-world" viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d={paths.thin} className="visual-ring" />
        <path d={paths.thick} className="visual-ring visual-ring-thick" />
        <path d={paths.minor} className="visual-tick" />
        <path d={paths.major} className="visual-tick visual-tick-major" />
        <g ref={sweepRef} className="visual-sweep">
          <line x1={C} y1={C - 200} x2={C} y2={C - 700} />
        </g>
      </svg>

      <p className="visual-title display" style={{ letterSpacing: `${tracking}em` }} aria-hidden="true">
        {s.title}
      </p>

      <div className="visual-record">
        <div className="visual-disc" aria-hidden="true">
          <span className="visual-label" />
        </div>
        <Artwork src={s.art} alt={s.album ? `${s.album} cover` : ''} className="visual-sleeve" />
      </div>

      {!embedded && (
        <>
      <div className="visual-corner visual-tl">
        <span className="readout">visual · three colours from the cover</span>
        <span className="visual-swatches" aria-hidden="true">
          <span style={{ background: world.ground }} />
          <span style={{ background: world.line }} />
          <span style={{ background: world.accent }} />
        </span>
      </div>
      <div className="visual-corner visual-tr">
        <button className="visual-exit readout" onClick={leave}>
          ( esc ) deck
        </button>
        <span className="serif visual-artist">{s.artist}</span>
        <span className="readout">
          {formatTime(time)} / {formatTime(s.durationMs)}
        </span>
      </div>
        </>
      )}
    </div>
  )
}
