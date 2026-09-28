import type { ReactNode } from 'react'
import { feedback } from '../sensory/feedback'
import { safeSpotifyUri } from '../spotify/normalize'
import { notify } from '../store/ui'

/** How long the Spotify app has to take over before we say it didn't open. */
const APP_OPEN_MS = 2500

let watching = false

/**
 * After a tap on a spotify: link, the app should take the screen (the page is hidden or
 * loses focus). If nothing happened, the app isn't installed here: say so, rather than
 * leave a tap that silently did nothing. A toast, not a feedback cue: this is a timer.
 */
function expectAppToOpen() {
  if (watching || typeof window === 'undefined') return
  watching = true
  let left = false
  const leave = () => {
    left = true
  }
  document.addEventListener('visibilitychange', leave)
  window.addEventListener('pagehide', leave)
  window.addEventListener('blur', leave)
  setTimeout(() => {
    watching = false
    document.removeEventListener('visibilitychange', leave)
    window.removeEventListener('pagehide', leave)
    window.removeEventListener('blur', leave)
    if (!left && document.visibilityState === 'visible' && document.hasFocus()) {
      notify("Spotify didn't open. Is the app installed on this device?", 'error')
    }
  }, APP_OPEN_MS)
}

/**
 * Opens an item in the Spotify app, straight to it (playlist, song, album, artist,
 * episode). Uses the item's validated spotify: URI; without one, the https page in a new
 * tab. This is also PartyDeck's link-back to Spotify (attribution).
 */
export function SpotifyLink({
  uri,
  url,
  className,
  label,
  children,
}: {
  uri: string | null | undefined
  url: string | null | undefined
  className?: string
  /** Accessible name, when the visible content isn't one ("Open Midnight City in Spotify"). */
  label?: string
  children: ReactNode
}) {
  const app = safeSpotifyUri(uri)
  const href = app ?? url
  if (!href) return <span className={className}>{children}</span>
  return (
    <a
      className={className}
      href={href}
      aria-label={label}
      target={app ? undefined : '_blank'}
      rel={app ? undefined : 'noopener noreferrer'}
      draggable={false}
      onClick={() => {
        feedback.play('select')
        if (app) expectAppToOpen()
      }}
    >
      {children}
    </a>
  )
}
