import { AnimatePresence, m, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEventHandler, type ReactNode } from 'react'
import { swipeDirection, SWIPE_COMMIT_PX, type SwipeDirection } from '../lib/gesture'
import { feedback } from '../sensory/feedback'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import type { Clock } from '../ui/clock'
import { EASE_EXPO, EASE_OUT } from '../ui/motion'
import { Scrubber } from '../ui/Scrubber'
import { useArtColor } from '../ui/useArtColor'
import { TransportKeys, type TransportKeysProps } from './Transport'

/** +1: the next track arrives from the right (like a swipe left). −1: from the left. */
type Dir = 1 | -1

const artMotion: Variants = {
  enter: (d: Dir) => ({ opacity: 0, x: 56 * d, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.46, ease: EASE_EXPO } },
  exit: (d: Dir) => ({ opacity: 0, x: -40 * d, scale: 0.985, transition: { duration: 0.2, ease: EASE_OUT } }),
}

/** Line-mask change, like a marquee flipping: the old line leaves upward, the new one rises in. */
const lineMotion: Variants = {
  enter: { opacity: 0, y: '100%' },
  center: (i: number) => ({ opacity: 1, y: '0%', transition: { duration: 0.5, ease: EASE_EXPO, delay: 0.05 + i * 0.045 } }),
  exit: { opacity: 0, y: '-70%', transition: { duration: 0.18, ease: EASE_OUT } },
}

/** Title length decides its size tier: the marquee fits its words. */
const titleFit = (t: string | null) => (!t || t.length <= 16 ? undefined : t.length <= 34 ? 'm' : 'l')

export interface DeckProps {
  trackKey: string | null
  art: string | null
  artAlt: string
  title: string | null
  artist: string | null
  album?: string | null
  clock: Clock
  durationMs: number
  onSeek: (ms: number, opts?: { silent?: boolean }) => void
  seekDisabled?: boolean
  transport: TransportKeysProps
  onSwipe?: (direction: SwipeDirection) => void
  /** The faceplate readout above the title: what the deck is doing. */
  status?: { text: string; live: boolean }
  /** In the status row: the Spotify link-back. */
  attribution?: ReactNode
  /** Beside the keys: the output (device) selector. */
  footer?: ReactNode
  /** End of the status row (the ⋮ menu). */
  menu?: ReactNode
  /** Above the dial, beside the next key: what's coming. */
  next?: ReactNode
  /** The mixer channel (modes, level), bolted to the console's side. */
  channel?: ReactNode
}

/**
 * The deck: artwork on the left, the instrument panel on the right (landscape),
 * stacked on phones held upright. The panel spans the artwork's height — what's
 * playing at the top, the controls at the bottom. Shared by Now Playing and the
 * tutorial so people practise on the real controls.
 */
export function Deck(p: DeckProps) {
  // The direction of the last skip, consumed by the next track change (state adjusted during render).
  const [pending, setPending] = useState<Dir>(1)
  const [shown, setShown] = useState<{ key: string | null; dir: Dir }>({ key: p.trackKey, dir: 1 })
  // Between pressing skip and Spotify reporting the new track, the old title dims:
  // honest "working" feedback instead of stale metadata beside a reset clock.
  const [skipping, setSkipping] = useState(false)
  if (shown.key !== p.trackKey) {
    setShown({ key: p.trackKey, dir: pending })
    setPending(1)
    setSkipping(false)
  }
  useEffect(() => {
    if (!skipping) return
    const t = setTimeout(() => setSkipping(false), 3000) // the skip failed or was ignored
    return () => clearTimeout(t)
  }, [skipping])

  const transport: TransportKeysProps = {
    ...p.transport,
    onNext: () => {
      setPending(1)
      setSkipping(true)
      p.transport.onNext()
    },
    onPrevious: () => {
      setPending(-1) // no dimming: "previous" usually restarts the same song
      p.transport.onPrevious()
    },
  }
  const onSwipe =
    p.onSwipe &&
    ((d: SwipeDirection) => {
      setPending(d === 'next' ? 1 : -1)
      setSkipping(d === 'next')
      p.onSwipe?.(d)
    })

  const ambient = useArtColor(p.art)

  return (
    <>
      {/* The room's light: a glow behind the art in the cover's own colour. Dims when paused. */}
      <div
        className="np-ambient"
        data-dim={!p.transport.isPlaying || undefined}
        style={ambient ? ({ '--ambient': ambient } as CSSProperties) : undefined}
        aria-hidden="true"
      />
      <div className="np-body">
        <SwipeArt art={p.art} alt={p.artAlt} dir={shown.dir} onSwipe={onSwipe} />
        {/* The console: a display bay (what's playing, the dial) over the keys, the channel strip bolted on the side. */}
        <div className="np-console">
          <div className="np-panel">
            <div className="np-display">
              {(p.status || p.menu || p.attribution) && (
                <div className="np-status-row">
                  {p.status && (
                    <p className="np-status label">
                      <span className="led" data-off={!p.status.live || undefined} aria-hidden="true" />
                      <StatusText text={p.status.text} />
                    </p>
                  )}
                  <div className="np-status-tools">
                    {p.attribution}
                    {p.menu}
                  </div>
                </div>
              )}
              {/* Outgoing and incoming lines share one grid cell. (Not mode="popLayout":
                  it injects a <style> element, which our CSP rightly blocks.) */}
              <div className="np-meta-stack" data-pending={skipping || undefined}>
                <AnimatePresence initial={false}>
                  <m.div key={p.trackKey} initial="enter" animate="center" exit="exit">
                    <h2 className="np-mask">
                      <m.span className="np-title" data-fit={titleFit(p.title)} variants={lineMotion} custom={0}>
                        {p.title}
                      </m.span>
                    </h2>
                    <p className="np-mask">
                      <m.span className="np-artist" variants={lineMotion} custom={1}>
                        {p.artist}
                        {p.album && <span className="np-album"> — {p.album}</span>}
                      </m.span>
                    </p>
                  </m.div>
                </AnimatePresence>
              </div>
              {p.next}
              <Scrubber clock={p.clock} durationMs={p.durationMs} onSeek={p.onSeek} disabled={p.seekDisabled} label="Song position" />
            </div>
            <div className="np-keys">
              <TransportKeys {...transport} />
              {p.footer}
            </div>
          </div>
          {p.channel && <div className="np-channel">{p.channel}</div>}
        </div>
      </div>
    </>
  )
}

/**
 * What's coming, on the display beside the next key: up to three tracks with their
 * queue numbers (CSS shows as many as the display has room for). A link to the Queue on
 * the real deck; plain text in the tutorial.
 */
export function UpNextList({ items, href, onClick }: { items: { title: string; subtitle: string }[]; href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  if (!items.length) return null
  const body = (
    <>
      <span className="np-next-head">
        <span className="label">Up next</span>
        {href && <Icon name="forward" size={16} />}
      </span>
      <ol className="np-next-list">
        {items.slice(0, 3).map((t, i) => (
          <li key={i}>
            <span className="readout np-next-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="np-next-title">{t.title}</span>
            <span className="np-next-sub">{t.subtitle}</span>
          </li>
        ))}
      </ol>
    </>
  )
  return href ? (
    <a className="np-next" href={href} onClick={onClick} aria-label={`Up next: ${items[0].title}. Open the queue`}>
      {body}
    </a>
  ) : (
    <div className="np-next">{body}</div>
  )
}

/** State words roll rather than swap: the old word leaves upward, the new one rises in. */
function StatusText({ text }: { text: string }) {
  return (
    <span className="roll">
      <AnimatePresence initial={false}>
        <m.span
          key={text}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1, transition: { duration: 0.32, ease: EASE_EXPO } }}
          exit={{ y: '-100%', opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
        >
          {text}
        </m.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * Drag the artwork sideways to skip. The art is anchored, so it follows the finger
 * with rubber-band resistance; one tick when the commit point is crossed.
 * The skip itself commits on the native pointerup — inside the user gesture, so
 * iOS haptics work (Motion's drag callbacks run in a later animation frame) — and
 * a pointercancel (the browser took over to scroll) never skips.
 */
function SwipeArt({ art, alt, dir, onSwipe }: { art: string | null; alt: string; dir: Dir; onSwipe?: (d: SwipeDirection) => void }) {
  const drag = useRef<{ x: number; v: number } | null>(null)
  const armed = useRef(false)
  return (
    <m.div
      className="np-art"
      drag={onSwipe ? 'x' : false}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35}
      dragSnapToOrigin
      onDrag={(_, info) => {
        drag.current = { x: info.offset.x, v: info.velocity.x }
        const past = Math.abs(info.offset.x) >= SWIPE_COMMIT_PX
        if (past !== armed.current) {
          armed.current = past
          if (past) feedback.play('tick') // best effort (not a gesture event on iOS); never continuous
        }
      }}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)} // a mouse released off the art still commits
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        armed.current = false
        const direction = d && swipeDirection(d.x, d.v)
        if (direction) onSwipe?.(direction)
      }}
      onPointerCancel={() => {
        drag.current = null
        armed.current = false
      }}
    >
      {/* Same album, same art: no transition. A new cover arrives from the side you skipped toward. */}
      <AnimatePresence initial={false} custom={dir}>
        <m.div key={art ?? 'none'} className="np-art-layer" custom={dir} variants={artMotion} initial="enter" animate="center" exit="exit">
          <Artwork src={art} alt={alt} />
        </m.div>
      </AnimatePresence>
    </m.div>
  )
}
