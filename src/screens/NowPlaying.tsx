import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { back, linkHandler } from '../app/router'
import { Transport } from '../app/Transport'
import { seekTo, syncNow } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { openDevices } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { spotifyClock } from '../ui/clock'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Scrubber } from '../ui/Scrubber'
import { Sheet } from '../ui/Sheet'

const ease = [0.23, 1, 0.32, 1] as const

export function NowPlaying() {
  const [menuOpen, setMenuOpen] = useState(false)
  const s = usePlayback(
    useShallow((s) => ({
      loaded: s.loaded,
      has: s.hasPlayback,
      error: s.syncError,
      trackId: s.playback.trackId,
      title: s.playback.title,
      artist: s.playback.artist,
      album: s.playback.album,
      art: s.playback.albumArt,
      url: s.playback.url,
      durationMs: s.playback.durationMs,
      deviceName: s.playback.deviceName,
      cantSeek: s.playback.disallows.seeking,
    })),
  )

  return (
    <div className="np">
      <header className="np-bar">
        <button className="icon-btn" onClick={() => back('/')} aria-label="Back">
          <Icon name="back" />
        </button>
        <h1 className="sr-only">Now Playing</h1>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="More options">
          <Icon name="more" />
        </button>
      </header>

      {s.error && s.has && (
        <p className="np-status" role="status">
          {s.error.title}. Showing the last known state.
        </p>
      )}

      {!s.loaded ? (
        <div className="np-body" aria-busy="true">
          <div className="np-art skel" />
          <div className="np-panel">
            <span className="skel skel-line skel-title" />
            <span className="skel skel-line skel-short" />
          </div>
        </div>
      ) : !s.has ? (
        <div className="np-empty">
          {s.error ? (
            <EmptyState title={s.error.title} detail={s.error.detail}>
              <button className="btn" onClick={() => void syncNow()}>
                Try again
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="Nothing playing" detail="Start something in Spotify, or pick a device and play from Search.">
              <button className="btn btn-primary" onClick={openDevices}>
                Choose device
              </button>
              <a className="btn" href="/search" onClick={linkHandler}>
                Search
              </a>
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="np-body">
          <div className="np-art">
            <AnimatePresence initial={false}>
              <m.div
                key={s.art ?? 'none'}
                className="np-art-layer"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease }}
              >
                <Artwork src={s.art} alt={s.album ? `${s.album} cover` : `${s.title} artwork`} />
              </m.div>
            </AnimatePresence>
          </div>

          <div className="np-panel">
            <div className="np-meta">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={s.trackId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease }}
                >
                  <h2 className="np-title">{s.title}</h2>
                  <p className="np-artist">{s.artist}</p>
                  {s.album && <p className="np-album">{s.album}</p>}
                </m.div>
              </AnimatePresence>
              {s.url && (
                <a className="np-attr" href={s.url} target="_blank" rel="noopener noreferrer">
                  Open in Spotify
                </a>
              )}
            </div>

            <Scrubber clock={spotifyClock} durationMs={s.durationMs} onSeek={seekTo} disabled={s.cantSeek} label="Song position" />
            <Transport />

            <div className="np-foot">
              <a className="chip" href="/queue" onClick={linkHandler}>
                <Icon name="queue" size={20} />
                Queue
              </a>
              <button className="chip chip-device" onClick={openDevices} aria-label={`Playing on ${s.deviceName ?? 'unknown device'}. Change device`}>
                <Icon name="speaker" size={18} />
                <span>{s.deviceName ?? 'Choose device'}</span>
              </button>
              <a className="chip" href="/lyrics" onClick={linkHandler}>
                <Icon name="lyrics" size={20} />
                Lyrics
              </a>
            </div>
          </div>
        </div>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options">
        <ul className="menu">
          {s.url && (
            <li>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                <Icon name="external" /> Open in Spotify
              </a>
            </li>
          )}
          <li>
            <button
              onClick={() => {
                setMenuOpen(false)
                openDevices()
              }}
            >
              <Icon name="speaker" /> Choose device
            </button>
          </li>
          <li>
            <a href="/settings" onClick={linkHandler}>
              <Icon name="settings" /> Settings
            </a>
          </li>
        </ul>
      </Sheet>
    </div>
  )
}
