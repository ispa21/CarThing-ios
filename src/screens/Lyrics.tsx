import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { back, linkHandler } from '../app/router'
import { FullscreenButton } from '../ui/FullscreenButton'
import { SOURCES } from '../app/sources'
import { PlayKey } from '../app/Transport'
import { DEMO_TRACK } from '../lyrics/demo'
import { toggleDemo, useDemoClock } from '../lyrics/demoClock'
import { lyricsEngine } from '../lyrics/engine'
import { followReducer, isScrollKey, shouldAutoScroll, showJumpButton } from '../lyrics/follow'
import { canTimeSync, type PlaybackSource } from '../lyrics/policy'
import { resolveLyrics, type ResolvedLyrics, type TrackQuery } from '../lyrics/resolver'
import { feedback } from '../sensory/feedback'
import { selectCanToggle, usePlayback } from '../store/playback'
import { LYRIC_SIZES, useSettings } from '../store/settings'
import { useClockValue } from '../ui/clock'
import { Artwork } from '../ui/Artwork'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Scrubber } from '../ui/Scrubber'

type LyricsState = { status: 'loading' } | { status: 'none' } | { status: 'ready'; lyrics: ResolvedLyrics }

const HIDE_CONTROLS_MS = 3200
const NO_LINES: never[] = []
/** Where the current line rests, as a fraction of the reader's height. */
const FOCUS_LINE = 0.36

/** Lyrics for a track. `loading` is derived from which track the result belongs to, not stored. */
function useResolvedLyrics(query: TrackQuery | null): LyricsState {
  const key = query ? `${query.title}\u0000${query.artist}` : null
  const [resolved, setResolved] = useState<{ key: string; lyrics: ResolvedLyrics | null } | null>(null)
  const { title = '', artist = '', durationMs } = query ?? {}
  useEffect(() => {
    if (!key) return
    let cancelled = false
    resolveLyrics({ title, artist, durationMs }).then((lyrics) => {
      if (!cancelled) setResolved({ key, lyrics })
    })
    return () => {
      cancelled = true
    }
  }, [key, title, artist, durationMs])

  if (!key) return { status: 'none' }
  if (resolved?.key !== key) return { status: 'loading' }
  return resolved.lyrics ? { status: 'ready', lyrics: resolved.lyrics } : { status: 'none' }
}

/**
 * Controls fade away while reading. Any interaction reveals them; they only hide
 * while playing, and never while pressed or while one of them has focus.
 */
function useAutoHide(playing: boolean) {
  const [idle, setIdle] = useState(false)
  const [activity, setActivity] = useState(0)
  const lastPoke = useRef(0)
  const pressing = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const poke = useCallback(() => {
    const now = performance.now()
    if (now - lastPoke.current < 400) return // pointermove fires constantly; don't re-render on each
    lastPoke.current = now
    setIdle(false)
    setActivity((a) => a + 1)
  }, [])

  useEffect(() => {
    if (!playing) return
    // Keyboard focus only: a mouse click on the scrubber also focuses it, and shouldn't pin the controls.
    const busy = () => {
      const el = document.activeElement as HTMLElement | null
      return pressing.current || (!!el?.closest('.lyrics-aside, .lyrics-dock') && el.matches(':focus-visible'))
    }
    let t = setTimeout(function tick() {
      if (busy()) t = setTimeout(tick, HIDE_CONTROLS_MS)
      else setIdle(true)
    }, HIDE_CONTROLS_MS)
    return () => clearTimeout(t)
  }, [playing, activity])

  const handlers = {
    ref: rootRef,
    onPointerMove: poke,
    onKeyDown: poke,
    onPointerDown: () => {
      pressing.current = true
      poke()
    },
    onPointerUp: () => {
      pressing.current = false
    },
    onPointerCancel: () => {
      pressing.current = false
    },
  }
  return { visible: !playing || !idle, handlers }
}

export function LyricsScreen({ source }: { source: PlaybackSource }) {
  const demo = source === 'demo'
  const src = SOURCES[source]

  const spotify = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      trackId: s.playback.trackId,
      title: s.playback.title,
      artist: s.playback.artist,
      art: s.playback.albumArt,
      album: s.playback.album,
      durationMs: s.playback.durationMs,
      isPlaying: s.playback.isPlaying,
      canToggle: selectCanToggle(s),
      cantSeek: s.playback.disallows.seeking,
    })),
  )
  const demoPlaying = useDemoClock((s) => s.isPlaying)
  const track = demo
    ? { id: 'demo', title: DEMO_TRACK.title, artist: DEMO_TRACK.artist, durationMs: DEMO_TRACK.durationMs, isPlaying: demoPlaying }
    : { id: spotify.trackId, title: spotify.title, artist: spotify.artist, durationMs: spotify.durationMs, isPlaying: spotify.isPlaying }

  const state = useResolvedLyrics(track.title ? { title: track.title, artist: track.artist ?? '', durationMs: track.durationMs } : null)

  const lines = state.status === 'ready' ? state.lyrics.lines : NO_LINES
  // Timed follow only when the lyrics have stamps AND the clock isn't Spotify audio (policy.ts).
  const timed = state.status === 'ready' && state.lyrics.synced && canTimeSync(source)

  const deriveIndex = useCallback(
    (ms: number, isPlaying: boolean) => (timed ? lyricsEngine({ lyrics: lines, playbackPositionMs: ms, isPlaying }).currentIndex : -1),
    [timed, lines],
  )
  const current = useClockValue(src.clock, deriveIndex, timed)

  // ── Follow / manual scroll ──
  const autoScroll = useSettings((s) => s.autoScroll)
  const [mode, dispatch] = useReducer(followReducer, 'following')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => dispatch({ type: 'trackChange' }), [track.id])

  const scrollToCurrent = useCallback(
    (smooth: boolean) => {
      const scroller = scrollerRef.current
      const line = scroller?.querySelector<HTMLElement>(`[data-index="${Math.max(0, current)}"]`)
      if (!scroller || !line) return
      scroller.scrollTo({
        top: line.offsetTop - scroller.clientHeight * FOCUS_LINE,
        behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
      })
    },
    [current, reduceMotion],
  )

  useEffect(() => {
    if (shouldAutoScroll(mode, { timed, autoScroll })) scrollToCurrent(true)
  }, [mode, timed, autoScroll, scrollToCurrent])

  const userScrolled = () => dispatch({ type: 'userScroll' }) // silent on purpose: reading shouldn't be noisy
  const jump = () => {
    feedback.play('jump-to-current')
    dispatch({ type: 'jump' })
    scrollToCurrent(true)
  }

  // Only hide the controls when there's something to read ("Lyrics unavailable" keeps its way out visible).
  const { visible: controls, handlers } = useAutoHide(track.isPlaying && lines.length > 0)

  // The demo clock runs by itself; start it when the demo opens, pause on leave.
  useEffect(() => {
    if (!demo) return
    if (!useDemoClock.getState().isPlaying) toggleDemo()
    return () => {
      if (useDemoClock.getState().isPlaying) toggleDemo()
    }
  }, [demo])

  const sizeIndex = useSettings((s) => s.lyricSize)
  const size = LYRIC_SIZES[sizeIndex]
  const pickSize = (i: number) => {
    if (i === sizeIndex) return
    feedback.play('select')
    useSettings.setState({ lyricSize: i })
  }

  const showJump = showJumpButton(mode, { timed, autoScroll, hasCurrent: current >= 0 })
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }

  return (
    <div className="lyrics" {...handlers} data-controls={controls || undefined} data-demo={demo || undefined}>
      <h1 className="sr-only">Lyrics{track.title ? `: ${track.title}` : ''}</h1>

      {!demo && !spotify.has ? (
        <div className="lyrics-empty">
          <EmptyState title="Nothing playing" detail="Lyrics show up here for the song that's playing.">
            <a className="btn" href="/lyrics/demo" onClick={linkHandler}>
              See the demo
            </a>
          </EmptyState>
        </div>
      ) : state.status === 'none' ? (
        <div className="lyrics-empty">
          <EmptyState
            title="Lyrics unavailable"
            detail="PartyDeck doesn't have a licensed lyrics source for this song yet. The demo shows how the reader works."
          >
            <a className="btn" href="/lyrics/demo" onClick={linkHandler}>
              See the demo
            </a>
          </EmptyState>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="lyrics-scroll"
          tabIndex={0}
          aria-label="Lyrics"
          aria-busy={state.status === 'loading'}
          onWheel={userScrolled}
          onTouchMove={userScrolled}
          onKeyDown={(e) => isScrollKey(e.key) && userScrolled()}
        >
          <ol className="lyrics-lines" data-timed={timed || undefined} style={{ '--lyrics-scale': size.scale } as CSSProperties}>
            {lines.map((l, i) => (
              <li
                key={i}
                data-index={i}
                data-state={timed ? (i === current ? 'current' : i < current ? 'past' : 'next') : undefined}
                aria-current={i === current || undefined}
                className={l.text ? undefined : 'gap'}
                aria-hidden={l.text ? undefined : true}
              >
                {l.text}
              </li>
            ))}
          </ol>
          {state.status === 'ready' && <p className="lyrics-credit readout">text · {state.lyrics.providerName.toLowerCase()}</p>}
        </div>
      )}

      {/* The instrument column: size detents, and the sync state said plainly. */}
      <AnimatePresence>
        {controls && (
          <m.aside key="aside" className="lyrics-aside" aria-label="Reader" {...fade}>
            {demo && (
              <button
                className="btn btn-small"
                onClick={() => {
                  feedback.play('back')
                  back(src.backTo)
                }}
              >
                Back
              </button>
            )}
            <span className="label">text size</span>
            <div className="lyrics-sizes" role="radiogroup" aria-label="Text size">
              {LYRIC_SIZES.map((z, i) => (
                <button key={z.label} className="key lyrics-size" role="radio" aria-checked={i === sizeIndex} aria-label={z.label} onClick={() => pickSize(i)}>
                  <span className="readout">{['s', 'm', 'l', 'xl'][i]}</span>
                </button>
              ))}
            </div>
            <span className="lyrics-aside-rule" aria-hidden="true" />
            <FullscreenButton />
            <p className="readout lyrics-sync">
              {timed ? (
                <>
                  line sync · on
                  <br />
                  (demo clock)
                </>
              ) : (
                <>
                  untimed —<br />
                  line sync is off
                  <br />
                  for spotify
                  <br />
                  playback
                </>
              )}
            </p>
          </m.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJump && (
          <m.button
            key="jump"
            className="jump"
            onClick={jump}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Icon name="target" size={18} />
            Jump to current
          </m.button>
        )}
      </AnimatePresence>

      {/* The record docks bottom-left, whole and unaltered. */}
      <AnimatePresence>
        {controls && (demo || spotify.has) && (
          <m.footer key="dock" className="lyrics-dock" {...fade}>
            <Artwork src={demo ? null : spotify.art} alt={demo ? '' : spotify.album ? `${spotify.album} cover` : ''} className="lyrics-dock-art" />
            <div className="lyrics-dock-text">
              <span className="lyrics-track-title display">{track.title ?? 'Lyrics'}</span>
              <span className="lyrics-track-artist serif">{demo ? 'Demo · no audio' : track.artist}</span>
              <div className="lyrics-scrub">
                <Scrubber clock={src.clock} durationMs={track.durationMs} onSeek={src.seek} disabled={!demo && spotify.cantSeek} label="Song position" />
              </div>
            </div>
            <PlayKey small isPlaying={track.isPlaying} onPress={src.toggle} disabled={!demo && !spotify.canToggle} />
          </m.footer>
        )}
      </AnimatePresence>
    </div>
  )
}
