import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../app/router'
import { usePhonePortrait } from '../lib/orientation'
import { useSession } from '../store/session'
import { useSettings } from '../store/settings'
import { nextStep, type OnboardingEvent, type OnboardingStep } from './flow'
import { Orientation } from './Orientation'
import { PowerOn } from './PowerOn'
import { Tutorial } from './Tutorial'

/** Connected, not yet on the deck: power on → (rotate) → (tutorial) → deck. */
export function Onboarding() {
  const phonePortrait = usePhonePortrait()
  const onboarded = useSettings((s) => s.onboarded)
  const welcomed = useSettings((s) => s.welcomed)
  const justConnected = useSession((s) => s.justConnected)
  const [step, setStep] = useState<OnboardingStep>('connected')
  const ref = useRef<HTMLDivElement>(null)

  // Each step replaces the last: move focus to its heading so it's announced.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-step-focus]')?.focus({ preventScroll: true })
  }, [step])

  const finish = useCallback(() => {
    useSettings.setState({ onboarded: true, welcomed: true })
    useSession.setState({ justConnected: false })
    navigate('/', { replace: true }) // the deck wakes with your music
  }, [])

  const go = useCallback(
    (event: OnboardingEvent) => {
      const next = nextStep(step, event, { connected: true, justConnected, welcomed, onboarded, phonePortrait })
      if (next === 'done') finish()
      else setStep(next)
    },
    [step, justConnected, welcomed, onboarded, phonePortrait, finish],
  )

  return (
    <div ref={ref} className="screen" data-immersive key={step}>
      {step === 'connected' && <PowerOn onDone={() => go('power-on')} />}
      {step === 'orientation' && <Orientation onDone={go} />}
      {step === 'tutorial' && <Tutorial onFinish={() => go('tutorial-finished')} />}
    </div>
  )
}
