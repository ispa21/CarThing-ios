import { m } from 'motion/react'
import { useRef, type MouseEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { feedback } from '../sensory/feedback'
import { togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { openDevices } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { FullscreenButton } from '../ui/FullscreenButton'
import { spotifyClock, useClockPainter } from '../ui/clock'
import { Icon, type IconName } from '../ui/Icon'
import { SPRING_TRAVEL } from '../ui/motion'
import { PressKey } from '../ui/PressKey'
import { linkHandler, PATHS, tickLink, type Route } from './router'

const TABS: Array<{ route: Route; label: string; icon: IconName }> = [
  { route: 'now', label: 'Deck', icon: 'deck' },
  { route: 'search', label: 'Search', icon: 'search' },
  { route: 'queue', label: 'Queue', icon: 'queue' },
  { route: 'lyrics', label: 'Lyrics', icon: 'lyrics' },
]

/** Opening the reader is its own (same-sounding) event, so it can diverge later. */
const openLyrics = (e: MouseEvent<HTMLAnchorElement>) => {
  feedback.play('lyrics-open')
  linkHandler(e)
}

/**
 * The appliance's control strip. Landscape: one row — the mini deck on the left,
 * tabs centred, tools on the right. Phones upright: mini deck above the tabs.
 * Same DOM; CSS grid areas rearrange it.
 */
export function Rail({ route }: { route: Route }) {
  return (
    <nav className="rail" aria-label="Main" data-route={route}>
      <div className="rail-deck">{route !== 'now' && <MiniDeck />}</div>
      <ul className="rail-tabs">
        {TABS.map((t) => (
          <li key={t.route}>
            <a
              className="rail-tab"
              href={PATHS[t.route]}
              onClick={t.route === 'lyrics' ? openLyrics : tickLink}
              aria-current={route === t.route ? 'page' : undefined}
            >
              {route === t.route && <RailLamp />}
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="rail-tools">
        <FullscreenButton />
        <a
          className="icon-btn"
          href={PATHS.settings}
          onClick={tickLink}
          aria-label="Settings"
          aria-current={route === 'settings' ? 'page' : undefined}
        >
          <Icon name="gear" />
        </a>
      </div>
    </nav>
  )
}

/** The lit indicator on the rail's top edge. One per rail; it travels to the active tab. */
export function RailLamp({ id = 'rail-lamp' }: { id?: string }) {
  return <m.span layoutId={id} className="rail-lamp" aria-hidden="true" transition={SPRING_TRAVEL} />
}

function MiniDeck() {
  const s = usePlayback(
    useShallow((s) => ({
      loaded: s.loaded,
      has: s.hasPlayback,
      title: s.playback.title,
      artist: s.playback.artist,
      art: s.playback.albumArt,
      isPlaying: s.playback.isPlaying,
      canToggle: selectCanToggle(s),
    })),
  )
  const lineRef = useRef<HTMLSpanElement>(null)
  useClockPainter(spotifyClock, (ms, snap) => {
    if (lineRef.current) lineRef.current.style.transform = `scaleX(${snap.durationMs ? ms / snap.durationMs : 0})`
  })

  if (!s.loaded) return null
  if (!s.has) {
    return (
      <div className="mini mini-idle">
        <span className="mini-idle-text label">
          <span className="led" data-off aria-hidden="true" />
          Nothing playing
        </span>
        <button
          className="btn btn-small"
          onClick={() => {
            feedback.play('select')
            openDevices()
          }}
        >
          Choose device
        </button>
      </div>
    )
  }
  return (
    <div className="mini">
      <a className="mini-main" href="/" onClick={tickLink} aria-label={`Open the deck: ${s.title}${s.artist ? ` by ${s.artist}` : ''}`}>
        <Artwork src={s.art} className="art-sm" />
        <span className="mini-text">
          <span className="mini-title">{s.title}</span>
          <span className="mini-sub">{s.artist}</span>
        </span>
      </a>
      <PressKey className="icon-btn icon-btn-strong" onClick={togglePlay} disabled={!s.canToggle} aria-label={s.isPlaying ? 'Pause' : 'Play'} depth={0.9}>
        <Icon name={s.isPlaying ? 'pause' : 'play'} />
      </PressKey>
      <span className="mini-line" aria-hidden="true">
        <span ref={lineRef} />
      </span>
    </div>
  )
}
