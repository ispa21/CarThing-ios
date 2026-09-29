import type { MouseEvent } from 'react'
import { feedback } from '../sensory/feedback'
import { openDevices } from '../store/ui'
import { FullscreenButton } from '../ui/FullscreenButton'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { RAIL_MODES } from './nav'
import { linkHandler, PATHS, type Route } from './router'

/**
 * Phones: the seven modes, the output and settings behind one key. Each mode is a
 * tile with its name and what it does, so nothing has to be discovered by scrolling.
 */
export function ModesSheet({ open, onClose, route, device }: { open: boolean; onClose: () => void; route: Route; device: string | null }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    feedback.play('select')
    onClose()
    linkHandler(e)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Modes">
      <ul className="modes-grid">
        {RAIL_MODES.map((m, i) => (
          <li key={m.route}>
            <a className="modes-tile" href={PATHS[m.route]} onClick={go} aria-current={route === m.route ? 'page' : undefined}>
              <span className="readout modes-num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="display modes-name">{route === m.route ? `( ${m.label} )` : m.label}</span>
              <span className="serif modes-about">{m.about}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="modes-tools">
        <button
          className="btn modes-device"
          onClick={() => {
            feedback.play('select')
            onClose()
            openDevices()
          }}
        >
          <Icon name="speaker" size={18} />
          <span className="readout">{device ? `play on · ${device.toLowerCase()}` : 'choose a device'}</span>
        </button>
        <a className="btn" href={PATHS.settings} onClick={go} aria-current={route === 'settings' ? 'page' : undefined}>
          <Icon name="trim" size={18} /> Settings
        </a>
        <FullscreenButton />
      </div>
    </Sheet>
  )
}
