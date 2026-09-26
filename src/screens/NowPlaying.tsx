import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Deck } from '../app/Deck'
import { tickLink } from '../app/router'
import { usePhonePortrait } from '../lib/orientation'
import { feedback } from '../sensory/feedback'
import { seekTo, skipNext, skipPrevious, syncNow, togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { openDevices, useUi } from '../store/ui'
import { spotifyClock } from '../ui/clock'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { PlaylistShelf } from './PlaylistShelf'

/** The deck — PartyDeck's home screen. */
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
      isPlaying: s.playback.isPlaying,
      canToggle: selectCanToggle(s),
      d: s.playback.disallows,
    })),
  )

  const chooseDevice = () => {
    feedback.play('select')
    openDevices()
  }

  return (
    <div className="np">
      <h1 className="sr-only">Now Playing</h1>
      <button
        className="icon-btn np-more"
        onClick={() => {
          feedback.play('select')
          setMenuOpen(true)
        }}
        aria-label="More options"
      >
        <Icon name="more" />
      </button>

      <RotateHint />

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
            // Nothing playing: the deck is never a dead end — your playlists are right here.
            <div className="np-idle">
              <div className="np-idle-head">
                <div>
                  <p className="np-idle-title">Nothing playing</p>
                  <p className="np-idle-sub">Pick a playlist, or choose where to play.</p>
                </div>
                <button className="btn btn-small" onClick={chooseDevice}>
                  Choose device
                </button>
              </div>
              <PlaylistShelf />
            </div>
          )}
        </div>
      ) : (
        <Deck
          trackKey={s.trackId}
          art={s.art}
          artAlt={s.album ? `${s.album} cover` : `${s.title} artwork`}
          title={s.title}
          artist={s.artist}
          album={s.album}
          clock={spotifyClock}
          durationMs={s.durationMs}
          onSeek={seekTo}
          seekDisabled={s.d.seeking}
          transport={{
            isPlaying: s.isPlaying,
            canToggle: s.canToggle,
            canPrevious: !s.d.skippingPrev,
            canNext: !s.d.skippingNext,
            onToggle: togglePlay,
            onPrevious: skipPrevious,
            onNext: skipNext,
          }}
          onSwipe={(dir) => void (dir === 'next' ? skipNext() : skipPrevious())}
          attribution={
            s.url && (
              <a className="np-attr" href={s.url} target="_blank" rel="noopener noreferrer">
                Open in Spotify
              </a>
            )
          }
          footer={
            <div className="np-foot">
              <button className="chip chip-device" onClick={chooseDevice} aria-label={`Playing on ${s.deviceName ?? 'unknown device'}. Change device`}>
                <span className="led" aria-hidden="true" />
                <span>{s.deviceName ?? 'Choose device'}</span>
              </button>
            </div>
          }
        />
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
                chooseDevice()
              }}
            >
              <Icon name="speaker" /> Choose device
            </button>
          </li>
          <li>
            <a href="/settings" onClick={tickLink}>
              <Icon name="settings" /> Settings
            </a>
          </li>
        </ul>
      </Sheet>
    </div>
  )
}

/** Phones held upright get a compact deck and a gentle nudge — never a wall. */
function RotateHint() {
  const portrait = usePhonePortrait()
  const dismissed = useUi((s) => s.rotateHintDismissed)
  if (!portrait || dismissed) return null
  return (
    <div className="rotate-hint" role="note">
      <span className="rotate-glyph" aria-hidden="true">
        <Icon name="phone" size={22} />
      </span>
      <span>Turn your phone sideways for the full deck.</span>
      <button
        className="icon-btn"
        aria-label="Dismiss"
        onClick={() => {
          feedback.play('back')
          useUi.setState({ rotateHintDismissed: true })
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
