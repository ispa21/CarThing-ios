import { Icon, type IconName } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'

/**
 * The showcase control: one large physical key with an LED ring. Pressing it
 * compresses the key (spring), and `lit` sweeps the ring and wakes the screen.
 * The sensory cue is fired by the caller, synchronously in the click.
 */
export function PowerKey({ label, icon, lit, onPress }: { label: string; icon: IconName; lit: boolean; onPress: () => void }) {
  return (
    <div className="power" data-lit={lit || undefined}>
      <div className="power-housing">
        <svg className="power-ring" viewBox="0 0 132 132" aria-hidden="true">
          <circle className="power-ring-track" cx="66" cy="66" r="62" />
          <circle className="power-ring-light" cx="66" cy="66" r="62" pathLength={100} />
        </svg>
        <PressKey className="power-key" depth={0.92} onClick={onPress} aria-label={label}>
          <Icon name={icon} size={34} />
        </PressKey>
      </div>
      <span className="power-label" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}
