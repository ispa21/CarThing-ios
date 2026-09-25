import { useCallback, useState } from 'react'
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
  const [step, setStep] = useState<OnboardingStep>('connected')

  const finish = useCallback(() => {
    useSettings.setState({ onboarded: true, welcomed: true })
    useSession.setState({ justConnected: false })
    navigate('/', { replace: true }) // the deck wakes with your music
  }, [])

  const go = useCallback(
    (event: OnboardingEvent) => {
      const next = nextStep(step, event, { connected: true, justConnected: true, welcomed: true, onboarded, phonePortrait })
      if (next === 'done') finish()
      else setStep(next)
    },
    [step, onboarded, phonePortrait, finish],
  )

  const onRotateDone = useCallback((how: 'rotated' | 'stay-portrait') => go(how), [go])

  return (
    <main className="screen" data-immersive key={step}>
      {step === 'connected' && <PowerOn onDone={() => go('power-on')} />}
      {step === 'orientation' && <Orientation onDone={onRotateDone} />}
      {step === 'tutorial' && <Tutorial onFinish={() => go('tutorial-finished')} />}
    </main>
  )
}
