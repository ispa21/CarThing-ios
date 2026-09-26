import { AnimatePresence, m } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { swipeDirection, SWIPE_COMMIT_PX, type SwipeDirection } from '../lib/gesture'
import { feedback } from '../sensory/feedback'
import { Artwork } from '../ui/Artwork'
import type { Clock } from '../ui/clock'
import { Scrubber } from '../ui/Scrubber'
import { TransportKeys, type TransportKeysProps } from './Transport'

const ease = [0.23, 1, 0.32, 1] as const

export interface DeckProps {
  trackKey: string | null
  art: string | null
  artAlt: string
  title: string | null
  artist: string | null
  album?: string | null
  clock: Clock
  durationMs: number
  onSeek: (ms: number) => void
  seekDisabled?: boolean
  transport: TransportKeysProps
  onSwipe?: (direction: SwipeDirection) => void
  /** Under the metadata: Spotify link-back or a practice label. */
  attribution?: ReactNode
  footer?: ReactNode
}

/**
 * The deck: artwork on the left, the instrument panel on the right (landscape),
 * stacked on phones held upright. Shared by Now Playing and the tutorial so
 * people practise on the real controls.
 */
export function Deck(p: DeckProps) {
  return (
    <div className="np-body">
      <SwipeArt art={p.art} alt={p.artAlt} onSwipe={p.onSwipe} />
      <div className="np-panel">
        <div className="np-meta">
          {/* Outgoing and incoming titles share one grid cell. (Not mode="popLayout":
              it injects a <style> element, which our CSP rightly blocks.) */}
          <div className="np-meta-stack">
            <AnimatePresence initial={false}>
              <m.div
                key={p.trackKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease }}
              >
                <h2 className="np-title">{p.title}</h2>
                <p className="np-artist">{p.artist}</p>
                {p.album && <p className="np-album">{p.album}</p>}
              </m.div>
            </AnimatePresence>
          </div>
          {p.attribution}
        </div>
        <Scrubber clock={p.clock} durationMs={p.durationMs} onSeek={p.onSeek} disabled={p.seekDisabled} label="Song position" />
        <TransportKeys {...p.transport} />
        {p.footer}
      </div>
    </div>
  )
}

/** Drag the artwork sideways to skip. 1:1 with the finger, rubber-banded, one tick at the commit point. */
function SwipeArt({ art, alt, onSwipe }: { art: string | null; alt: string; onSwipe?: (d: SwipeDirection) => void }) {
  const armed = useRef(false)
  return (
    <m.div
      className="np-art"
      drag={onSwipe ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragSnapToOrigin
      onDrag={(_, info) => {
        const past = Math.abs(info.offset.x) >= SWIPE_COMMIT_PX
        if (past !== armed.current) {
          armed.current = past
          if (past) feedback.play('tick') // one tick at the threshold, never continuous
        }
      }}
      onDragEnd={(_, info) => {
        armed.current = false
        const dir = swipeDirection(info.offset.x, info.velocity.x)
        if (dir) onSwipe?.(dir)
      }}
    >
      <AnimatePresence initial={false}>
        <m.div
          key={art ?? 'none'}
          className="np-art-layer"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <Artwork src={art} alt={alt} />
        </m.div>
      </AnimatePresence>
    </m.div>
  )
}
