import { useRef, type MouseEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fullscreenSupported, isStandalone, toggleFullscreen, useIsFullscreen } from '../lib/fullscreen'
import { feedback } from '../sensory/feedback'
import { togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { openDevices } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockPainter } from '../ui/clock'
import { Icon, type IconName } from '../ui/Icon'
import { linkHandler, PATHS, type Route } from './router'

const TABS: Array<{ route: Route; label: string; icon: IconName }> = [
  { route: 'now', label: 'Home', icon: 'nowPlaying' },
  { route: 'search', label: 'Search', icon: 'search' },
  { route: 'queue', label: 'Queue', icon: 'queue' },
  { route: 'lyrics', label: 'Lyrics', icon: 'lyrics' },
]

const navigateWithTick = (e: MouseEvent<HTMLAnchorElement>) => {
  feedback.play('select')
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
            <a className="rail-tab" href={PATHS[t.route]} onClick={navigateWithTick} aria-current={route === t.route ? 'page' : undefined}>
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
          onClick={navigateWithTick}
          aria-label="Settings"
          aria-current={route === 'settings' ? 'page' : undefined}
        >
          <Icon name="settings" />
        </a>
      </div>
    </nav>
  )
}

export function FullscreenButton({ coach, onEntered }: { coach?: boolean; onEntered?: () => void }) {
  const active = useIsFullscreen()
  if (!fullscreenSupported() || isStandalone()) return null
  return (
    <button
      className="icon-btn"
      data-coach={coach || undefined}
      aria-label={active ? 'Exit full screen' : 'Full screen'}
      aria-pressed={active}
      onClick={async () => {
        feedback.play('select')
        if (await toggleFullscreen()) onEntered?.()
      }}
    >
      <Icon name={active ? 'collapse' : 'expand'} />
    </button>
  )
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
        <span className="mini-idle-text">Nothing playing</span>
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
      <a className="mini-main" href="/" onClick={navigateWithTick} aria-label={`Open the deck: ${s.title}${s.artist ? ` by ${s.artist}` : ''}`}>
        <Artwork src={s.art} className="art-sm" />
        <span className="mini-text">
          <span className="mini-title">{s.title}</span>
          <span className="mini-sub">{s.artist}</span>
        </span>
      </a>
      <button className="icon-btn icon-btn-strong" onClick={togglePlay} disabled={!s.canToggle} aria-label={s.isPlaying ? 'Pause' : 'Play'}>
        <Icon name={s.isPlaying ? 'pause' : 'play'} />
      </button>
      <span className="mini-line" aria-hidden="true">
        <span ref={lineRef} />
      </span>
    </div>
  )
}
