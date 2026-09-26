import { canOfferFullscreen, toggleFullscreen, useIsFullscreen } from '../lib/fullscreen'
import { feedback } from '../sensory/feedback'
import { Icon } from './Icon'

/** Full-screen key. Rendered only where the browser can do it (not iPhone Safari, not installed apps). */
export function FullscreenButton({ coach, onEntered }: { coach?: boolean; onEntered?: () => void }) {
  const active = useIsFullscreen()
  if (!canOfferFullscreen()) return null
  return (
    <button
      className="icon-btn"
      data-coach={coach || undefined}
      aria-label="Full screen"
      aria-pressed={active}
      onClick={async () => {
        feedback.play('select')
        if (await toggleFullscreen()) onEntered?.()
      }}
    >
      <Icon name={active ? 'collapse' : 'expand'} />
    </button>
  )
}
