import { feedback } from '../sensory/feedback'
import { openDevices } from '../store/ui'
import { FullscreenButton } from '../ui/FullscreenButton'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { RAIL_MODES } from './nav'
import { navigate, PATHS, type Route } from './router'
import { TapKey } from '../ui/TapKey'

/**
 * Phones: the seven modes, the output and settings behind one key. Each mode is a
 * tile with its name and what it does, so nothing has to be discovered by scrolling.
 */
export function ModesSheet({ open, onClose, route, device }: { open: boolean; onClose: () => void; route: Route; device: string | null }) {
  const go = (to: Route) => {
    feedback.play('select')
    onClose()
    navigate(PATHS[to])
  }
  return (
    <Sheet open={open} onClose={onClose} title="Modes">
      <ul className="modes-grid">
        {RAIL_MODES.map((m, i) => (
          <li key={m.route}>
            <TapKey className="modes-tile" onClick={() => go(m.route)} aria-current={route === m.route ? 'page' : undefined}>
              <span className="readout modes-num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="display modes-name">{route === m.route ? `( ${m.label} )` : m.label}</span>
              <span className="serif modes-about">{m.about}</span>
            </TapKey>
          </li>
        ))}
      </ul>
      <div className="modes-tools">
        <TapKey
          className="btn modes-device"
          onClick={() => {
            feedback.play('select')
            onClose()
            openDevices()
          }}
        >
          <Icon name="speaker" size={18} />
          <span className="readout">{device ? `play on · ${device.toLowerCase()}` : 'choose a device'}</span>
        </TapKey>
        <TapKey className="btn" onClick={() => go('settings')} aria-current={route === 'settings' ? 'page' : undefined}>
          <Icon name="trim" size={18} /> Settings
        </TapKey>
        <FullscreenButton />
      </div>
    </Sheet>
  )
}
