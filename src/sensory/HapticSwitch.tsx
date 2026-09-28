import type { CSSProperties } from 'react'
import { mechanism, onSwitchTap } from './haptics'

// Inline styles are set through the CSSOM, which the CSP (style-src 'self') allows.
const LABEL: CSSProperties = { position: 'absolute', inset: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }
const SWITCH: CSSProperties = { position: 'absolute', width: 1, height: 1, margin: 0, opacity: 0, visibility: 'hidden' }

/** The label is absolutely positioned: make sure it covers its host, not some ancestor. */
function coverHost(label: HTMLLabelElement | null) {
  const host = label?.parentElement
  if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative'
}

/**
 * iPhone haptics for a control. Put it inside a <button> (not a link or submit button: the
 * label becomes the click's activation target) and not on drag surfaces.
 *
 * An invisible label covers the button, wired to a hidden switch. The finger's tap is a real
 * click on the label, so the button's onClick runs as usual; afterwards the label forwards a
 * trusted click to the switch and iOS ticks, but only if that onClick asked for a haptic
 * through feedback.play (see onSwitchTap). Renders nothing where this mechanism doesn't apply,
 * or while the host is disabled (a disabled button's click never reaches React to be vetoed).
 * Same approach as ios-haptics' hapticTrigger, which is confirmed working on iOS 27.
 */
export function HapticSwitch({ disabled }: { disabled?: boolean }) {
  if (disabled || mechanism !== 'ios-switch') return null
  return (
    <label aria-hidden="true" ref={coverHost} style={LABEL} onClick={(e) => onSwitchTap(e.nativeEvent)}>
      <input
        type="checkbox"
        ref={(el) => el?.setAttribute('switch', '')}
        tabIndex={-1}
        style={SWITCH}
        // The forwarded click would otherwise bubble to the button and run its onClick twice.
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  )
}
