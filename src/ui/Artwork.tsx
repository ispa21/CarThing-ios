import { useState } from 'react'
import { Icon } from './Icon'

interface Props {
  src: string | null
  alt?: string
  className?: string
  round?: boolean
}

/**
 * Spotify artwork, shown uncropped and unaltered (Spotify design guidelines).
 * It fades in once decoded, so a half-painted cover never shows.
 */
export function Artwork({ src, alt = '', className = '', round = false }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const show = src && failed !== src
  return (
    <span className={`art ${round ? 'art-round' : ''} ${className}`}>
      {show ? (
        <img
          ref={(el) => {
            if (el?.complete && el.naturalWidth) setLoaded(src) // already decoded (cache)
          }}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          data-loaded={loaded === src || undefined}
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
        />
      ) : (
        <span className="art-empty" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <Icon name="nowPlaying" />
        </span>
      )}
    </span>
  )
}
