import type { ReactNode } from 'react'
import type { MediaItem, MediaKind } from '../spotify/normalize'
import { Artwork } from './Artwork'
import { Icon } from './Icon'

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
  onQueue?: (item: MediaItem) => void
  lead?: ReactNode
  showKind?: boolean
}

export function MediaRow({ item, onPlay, onQueue, lead, showKind = false }: Props) {
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
      {onQueue && (
        <button className="icon-btn" onClick={() => onQueue(item)} aria-label={`Add ${item.title} to queue`}>
          <Icon name="add" />
        </button>
      )}
      {item.url && (
        <a className="icon-btn icon-btn-quiet" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} in Spotify`}>
          <Icon name="external" size={20} />
        </a>
      )}
    </li>
  )
}
