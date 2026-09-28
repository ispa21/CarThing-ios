import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
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

  // Always call the latest onDone (it knows the current orientation), and clean up on unmount.
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    if (!booting) return
    const t = setTimeout(() => done.current(), reduce ? 120 : 640) // the ring sweep, then the next step
    return () => clearTimeout(t)
  }, [booting, reduce])

  const press = () => {
    if (booting) return
    feedback.play('power-on')
    setBooting(true)
  }

  return (
    <main className="onboard onboard-boot" data-lit={booting || undefined}>
      <header className="onboard-top">
        <p className="onboard-state label">
          <Icon name="check" size={14} />
          Spotify connected
        </p>
      </header>
      <div className="onboard-action">
        <PowerKey label="Power on" icon="power" lit={booting} onPress={press} />
      </div>
      <div className="onboard-mark">
        <h1 className="onboard-title" tabIndex={-1} data-step-focus>
          Ready when you are.
        </h1>
        <p className="onboard-sub">{name ? `Signed in as ${name}.` : 'Signed in.'}</p>
      </div>
    </main>
  )
}
