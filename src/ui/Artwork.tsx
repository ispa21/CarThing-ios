import { useState } from 'react'
import { Icon } from './Icon'

interface Props {
  src: string | null
  alt?: string
  className?: string
  round?: boolean
}

/** Spotify artwork, shown uncropped and unaltered (Spotify design guidelines). */
export function Artwork({ src, alt = '', className = '', round = false }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  const show = src && failed !== src
  return (
    <span className={`art ${round ? 'art-round' : ''} ${className}`}>
      {show ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(src)} />
      ) : (
        <span className="art-empty" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <Icon name="nowPlaying" />
        </span>
      )}
    </span>
  )
}
