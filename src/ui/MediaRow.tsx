import { useEffect, useState, type ReactNode } from 'react'
import { formatTime } from '../lib/progress'
import type { MediaItem, MediaKind } from '../spotify/normalize'
import { Artwork } from './Artwork'
import { Icon } from './Icon'
import { PressKey } from './PressKey'

const KIND_LABEL: Record<MediaKind, string> = {
  track: 'Song',
  episode: 'Episode',
  album: 'Album',
  artist: 'Artist',
  playlist: 'Playlist',
}

interface Props {
  item: MediaItem
  /** Tapping the row plays it. Omit for display-only rows (queue). */
  onPlay?: (item: MediaItem) => void
  /** Resolves true once Spotify accepted it; the row then confirms. */
  onQueue?: (item: MediaItem) => Promise<boolean>
  lead?: ReactNode
  showKind?: boolean
}

export function MediaRow({ item, onPlay, onQueue, lead, showKind = false }: Props) {
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
  return (
    <li className="row">
      {onPlay ? (
        <button className="row-main" onClick={() => onPlay(item)} aria-label={`Play ${item.title}${item.subtitle && item.kind !== 'artist' ? `, ${item.subtitle}` : ''}`}>
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
      {item.url && (
        <a className="icon-btn icon-btn-quiet" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} in Spotify`}>
          <Icon name="external" size={20} />
        </a>
      )}
    </li>
  )
}
