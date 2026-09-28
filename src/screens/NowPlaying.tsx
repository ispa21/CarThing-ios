import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChannelStrip } from '../app/ChannelStrip'
import { Deck, UpNextList } from '../app/Deck'
import { tickLink } from '../app/router'
import { usePhonePortrait } from '../lib/orientation'
import { feedback } from '../sensory/feedback'
import type { MediaItem } from '../spotify/normalize'
import { refreshQueue, seekTo, skipNext, skipPrevious, syncNow, togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { useSettings } from '../store/settings'
import { openDevices } from '../store/ui'
import { spotifyClock } from '../ui/clock'
import { ErrorState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { SpotifyLink } from '../ui/SpotifyLink'
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
      uri: s.playback.uri,
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

  const more = (
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
  )
  const onDeck = s.loaded && s.has

  return (
    <div className="np">
      <h1 className="sr-only">Now Playing</h1>
      {!onDeck && more}

      <RotateHint />

      {s.error && s.has && (
        <p className="np-sync readout" role="status">
          {s.error.title}. Showing the last known state.
        </p>
      )}

      {!s.loaded ? (
        <div className="np-body" aria-busy="true">
          <div className="np-art skel" />
          <div className="np-console">
            <div className="np-panel">
              <div className="np-display">
                <span className="skel skel-line skel-label" />
                <span className="skel skel-line skel-title" />
                <span className="skel skel-line skel-short" />
                <span className="skel skel-line skel-dial" />
              </div>
              <div className="np-keys">
                <span className="skel-keys">
                  <span className="skel skel-key" />
                  <span className="skel skel-key" />
                  <span className="skel skel-key" />
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : !s.has ? (
        <div className="np-empty">
          {s.error ? (
            <ErrorState error={s.error} onRetry={() => void syncNow()} />
          ) : (
            // Nothing playing: the deck is never a dead end — your playlists are right here.
            <div className="np-idle">
              <div className="np-idle-head">
                <p className="label np-idle-status">
                  <span className="led" data-off aria-hidden="true" />
                  Standby
                </p>
                <p className="np-idle-title">Nothing playing.</p>
                <p className="np-idle-sub">Open a playlist in Spotify, or press ▶ to play it right here.</p>
                <button className="chip np-device" onClick={chooseDevice}>
                  <Icon name="speaker" size={18} />
                  <span>Choose device</span>
                  <Icon name="down" size={16} />
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
          status={{ text: s.isPlaying ? 'Now playing' : 'Paused', live: s.isPlaying }}
          menu={more}
          next={<UpNext uri={s.uri} />}
          channel={<ChannelStrip />}
          attribution={
            (s.uri || s.url) && (
              <SpotifyLink className="np-attr label" uri={s.uri} url={s.url} label="Open in Spotify">
                Spotify
                <Icon name="external" size={13} />
              </SpotifyLink>
            )
          }
          footer={
            <button className="chip np-device" onClick={chooseDevice} aria-label={`Playing on ${s.deviceName ?? 'unknown device'}. Change device`}>
              <Icon name="speaker" size={18} />
              <span>{s.deviceName ?? 'Choose device'}</span>
              <Icon name="down" size={16} />
            </button>
          }
        />
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options">
        <ul className="menu">
          {(s.uri || s.url) && (
            <li>
              <SpotifyLink uri={s.uri} url={s.url}>
                <Icon name="external" /> Open in Spotify
              </SpotifyLink>
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
              <Icon name="gear" /> Settings
            </a>
          </li>
        </ul>
      </Sheet>
    </div>
  )
}

/**
 * The next track, beside the next key. Fetched once per song (one request, silent on
 * failure); hidden when the queue isn't about the current song yet, or there's no room.
 */
function UpNext({ uri }: { uri: string | null }) {
  const next = usePlayback((st) => (st.queue.data?.current?.uri === uri ? st.queue.data.upNext : NO_ITEMS))
  useEffect(() => {
    if (uri) void refreshQueue()
  }, [uri])
  return <UpNextList items={next} href="/queue" onClick={tickLink} />
}

const NO_ITEMS: MediaItem[] = []

/** Phones held upright get a compact deck and a gentle nudge — never a wall. */
function RotateHint() {
  const portrait = usePhonePortrait()
  const dismissed = useSettings((s) => s.rotateHintDismissed)
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
          useSettings.setState({ rotateHintDismissed: true })
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
