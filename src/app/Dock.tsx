import { useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { openDevices } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { spotifyClock, useClockPainter } from '../ui/clock'
import { Icon, type IconName } from '../ui/Icon'
import { linkHandler, PATHS, type Route } from './router'

const TABS: Array<{ route: Route; label: string; icon: IconName }> = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'search', label: 'Search', icon: 'search' },
  { route: 'queue', label: 'Queue', icon: 'queue' },
  { route: 'now', label: 'Now Playing', icon: 'nowPlaying' },
  { route: 'lyrics', label: 'Lyrics', icon: 'lyrics' },
]

export function Dock({ route }: { route: Route }) {
  return (
    <nav className="dock" aria-label="Main">
      <ul>
        {TABS.map((t) => (
          <li key={t.route}>
            <a className="dock-item" href={PATHS[t.route]} onClick={linkHandler} aria-current={route === t.route ? 'page' : undefined}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function MiniPlayer() {
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
        <button className="btn btn-small" onClick={openDevices}>
          Choose device
        </button>
      </div>
    )
  }
  return (
    <div className="mini">
      <a className="mini-main" href="/now" onClick={linkHandler} aria-label={`Open player: ${s.title}${s.artist ? ` by ${s.artist}` : ''}`}>
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
