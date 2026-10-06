import { canOfferFullscreen, toggleFullscreen, useIsFullscreen } from '../lib/fullscreen'
import { feedback } from '../sensory/feedback'
import { Icon } from './Icon'
import { TapKey } from './TapKey'

/** Full-screen key. Rendered only where the browser can do it (not iPhone Safari, not installed apps). */
export function FullscreenButton({ coach, onEntered }: { coach?: boolean; onEntered?: () => void }) {
  const active = useIsFullscreen()
  if (!canOfferFullscreen()) return null
  return (
    <TapKey
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
    </TapKey>
  )
}
