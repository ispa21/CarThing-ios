import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { feedback } from '../sensory/feedback'
import { togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { openDevices } from '../store/ui'
import { FullscreenButton } from '../ui/FullscreenButton'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { ModesSheet } from './ModesSheet'
import { RAIL_MODES, RAIL_TABS } from './nav'
import { linkHandler, PATHS, tickLink, type Route } from './router'

/** Opening the reader is its own (same-sounding) event, so it can diverge later. */
const openLyrics = (e: MouseEvent<HTMLAnchorElement>) => {
  feedback.play('lyrics-open')
  linkHandler(e)
}

/**
 * The top of the plate: the wordmark, one fused black shape holding the four keys
 * (brackets mark where you are), the modes as printed words, and the output route.
 * Off the deck, a now-line keeps what's playing (and its play key) in reach.
 */
export function Rail({ route }: { route: Route }) {
  // On narrow plates the modes scroll: keep the one you're in visible.
  const modesRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const el = modesRef.current?.querySelector<HTMLElement>('[aria-current]')
    const list = modesRef.current
    if (el && list) list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2
  }, [route])
  const [modesOpen, setModesOpen] = useState(false)
  const mode = RAIL_MODES.find((m) => m.route === route)
  const device = usePlayback((s) => s.playback.deviceName)
  return (
    <header className="rail" data-route={route}>
      <a className="wordmark-link" href="/" onClick={tickLink} aria-label="PartyDeck, go to the deck">
        <span className="rail-wordmark">partydeck</span>
        <span className="rail-serial readout" aria-hidden="true">
          pd—01
        </span>
      </a>
      <nav className="rail-nav" aria-label="Main">
        <ul className="rail-tabs">
          {RAIL_TABS.map((t) => (
            <li key={t.route}>
              <a
                className="rail-tab"
                href={PATHS[t.route]}
                onClick={t.route === 'lyrics' ? openLyrics : tickLink}
                aria-current={route === t.route ? 'page' : undefined}
              >
                {t.label}
              </a>
            </li>
          ))}
          {/* Phones: the fifth key. It names the mode you're in, and opens all of them. */}
          <li className="rail-more-item">
            <button
              className="rail-tab rail-more"
              aria-haspopup="dialog"
              aria-expanded={modesOpen}
              aria-current={mode || route === 'settings' ? 'page' : undefined}
              aria-label={mode ? `Modes, in ${mode.label}` : 'Modes'}
              onClick={() => {
                feedback.play('select')
                setModesOpen(true)
              }}
            >
              {mode ? (mode.short ?? mode.label) : route === 'settings' ? 'settings' : 'modes'}
            </button>
          </li>
        </ul>
        {RAIL_MODES.length > 0 && (
          <ul ref={modesRef} className="rail-modes" aria-label="Modes">
            {RAIL_MODES.map((m) => (
              <li key={m.route}>
                <a className="rail-mode" href={PATHS[m.route]} onClick={tickLink} aria-current={route === m.route ? 'page' : undefined}>
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="rail-tools">
        {route !== 'now' && <NowLine />}
        <RouteButton />
        <FullscreenButton />
        <a className="icon-btn" href={PATHS.settings} onClick={tickLink} aria-label="Settings" aria-current={route === 'settings' ? 'page' : undefined}>
          <Icon name="trim" />
        </a>
      </div>
      <ModesSheet open={modesOpen} onClose={() => setModesOpen(false)} route={route} device={device} />
    </header>
  )
}

/** Where the sound comes out. The lamp is the record's colour while it plays. */
function RouteButton() {
  const s = usePlayback(useShallow((s) => ({ has: s.hasPlayback, name: s.playback.deviceName, playing: s.playback.isPlaying })))
  return (
    <button
      className="rail-route"
      onClick={() => {
        feedback.play('select')
        openDevices()
      }}
      aria-label={s.name ? `Playing on ${s.name}. Change device` : 'Choose a device'}
    >
      <span className="lamp" data-live={(s.has && s.playing) || undefined} aria-hidden="true" />
      <span className="rail-route-name readout">{s.name ? s.name.toLowerCase() : 'no device'}</span>
    </button>
  )
}

/** Off the deck: what's playing, as one printed line, with its play key. */
function NowLine() {
  const s = usePlayback(
    useShallow((s) => ({
      loaded: s.loaded,
      has: s.hasPlayback,
      title: s.playback.title,
      artist: s.playback.artist,
      isPlaying: s.playback.isPlaying,
      canToggle: selectCanToggle(s),
    })),
  )
  if (!s.loaded || !s.has) return null
  return (
    <span className="nowline">
      <a className="nowline-text readout" href="/" onClick={tickLink} aria-label={`Open the deck: ${s.title}${s.artist ? ` by ${s.artist}` : ''}`}>
        {s.title?.toLowerCase()}
      </a>
      <PressKey className="icon-btn nowline-key" onClick={togglePlay} disabled={!s.canToggle} aria-label={s.isPlaying ? 'Pause' : 'Play'} depth={0.9}>
        <Icon name={s.isPlaying ? 'pause' : 'play'} size={18} />
      </PressKey>
    </span>
  )
}
