import { feedback } from '../sensory/feedback'
import { beginLogin } from '../spotify/auth'

/** Newer features need scopes older sessions weren't asked for: say so, and offer the fix. */
export function ReconnectButton({ label = 'Reconnect Spotify' }: { label?: string }) {
  return (
    <button
      className="btn"
      onClick={() => {
        feedback.play('select')
        void beginLogin(window.location.pathname)
      }}
    >
      {label}
    </button>
  )
}
