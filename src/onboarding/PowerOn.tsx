import { useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { feedback } from '../sensory/feedback'
import { useSession } from '../store/session'
import { Icon } from '../ui/Icon'
import { PowerKey } from './PowerKey'

/**
 * Back from Spotify. A fresh page after a redirect has no user activation, so
 * the browser would block sound and iOS haptics — the boot starts with *your*
 * press instead of pretending.
 */
export function PowerOn({ onDone }: { onDone: () => void }) {
  const name = useSession((s) => s.displayName)
  const [booting, setBooting] = useState(false)
  const reduce = useReducedMotion()

  const press = () => {
    if (booting) return
    feedback.play('power-on')
    setBooting(true)
    setTimeout(onDone, reduce ? 120 : 640) // the ring sweep, then the deck
  }

  return (
    <main className="onboard onboard-boot" data-lit={booting || undefined}>
      <div className="onboard-mark">
        <p className="onboard-status">
          <Icon name="check" size={18} /> Spotify connected
        </p>
        <h1 className="onboard-title">Ready when you are.</h1>
        <p className="onboard-sub">{name ? `Signed in as ${name}.` : 'Signed in.'}</p>
      </div>
      <div className="onboard-action">
        <PowerKey label="Power on" icon="power" lit={booting} onPress={press} />
      </div>
    </main>
  )
}
