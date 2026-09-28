import { useEffect, useState, type ReactNode } from 'react'
import { formatTime } from '../lib/progress'
import { safeSpotifyUri, type MediaItem, type MediaKind } from '../spotify/normalize'
import { Artwork } from './Artwork'
import { Icon } from './Icon'
import { PressKey } from './PressKey'
import { SpotifyLink } from './SpotifyLink'

const KIND_LABEL: Record<MediaKind, string> = {
  track: 'Song',
  episode: 'Episode',
  album: 'Album',
  artist: 'Artist',
  playlist: 'Playlist',
}

interface Props {
  item: MediaItem
  /** The ▶ key plays it on the current device. Omit for rows you can't play from (queue). */
  onPlay?: (item: MediaItem) => void
  /** Resolves true once Spotify accepted it; the row then confirms. */
  onQueue?: (item: MediaItem) => Promise<boolean>
  lead?: ReactNode
  showKind?: boolean
  /** This is what's playing: a lamp in the gutter (doesn't shift the row). */
  live?: boolean
}

export function MediaRow({ item, onPlay, onQueue, lead, showKind = false, live = false }: Props) {
  const [added, setAdded] = useState(false)
  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1800)
    return () => clearTimeout(t)
  }, [added])

  const body = (
    <>
      {lead}
      <Artwork src={item.art} round={item.kind === 'artist'} className="art-row" />
      <span className="row-text">
        <span className="row-title">{item.title}</span>
        <span className="row-sub">
          {showKind && <span className="row-kind">{KIND_LABEL[item.kind]}</span>}
          {item.kind !== 'artist' && item.subtitle}
        </span>
      </span>
    </>
  )
  const playLabel = `Play ${item.title}${item.subtitle && item.kind !== 'artist' ? `, ${item.subtitle}` : ''}${live ? ', playing now' : ''}`
  const linked = Boolean(safeSpotifyUri(item.uri) ?? item.url)

  return (
    <li className="row" data-live={live || undefined}>
      {/* The row is the item: tapping it opens it in the Spotify app. Keys on the right act here. */}
      {linked ? (
        <SpotifyLink className="row-main" uri={item.uri} url={item.url} label={`Open ${item.title} in Spotify`}>
          {body}
        </SpotifyLink>
      ) : onPlay ? (
        <button className="row-main" onClick={() => onPlay(item)} aria-label={playLabel}>
          {body}
        </button>
      ) : (
        <div className="row-main">{body}</div>
      )}
      {item.durationMs ? (
        <span className="row-time readout" aria-hidden="true">
          {formatTime(item.durationMs)}
        </span>
      ) : null}
      {onQueue && (
        <PressKey
          className="icon-btn"
          data-added={added || undefined}
          depth={0.9}
          onClick={async () => {
            if (await onQueue(item)) setAdded(true)
          }}
          aria-label={added ? `${item.title} added to queue` : `Add ${item.title} to queue`}
        >
          <Icon name={added ? 'check' : 'add'} />
        </PressKey>
      )}
      {onPlay && linked && (
        <PressKey className="icon-btn row-play" depth={0.9} onClick={() => onPlay(item)} aria-label={playLabel}>
          <Icon name="play" size={20} />
        </PressKey>
      )}
    </li>
  )
}
