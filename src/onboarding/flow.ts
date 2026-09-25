// "Powering on the device" — the onboarding path as a pure state machine.
//
//   not connected:      welcome ─continue─► connect ─► (Spotify sign-in)
//   back from Spotify:  connected ─power-on─► [orientation] ─► [tutorial] ─► done
//
// Orientation only for phones held upright; the tutorial only until finished once.

export type OnboardingStep = 'welcome' | 'connect' | 'connected' | 'orientation' | 'tutorial' | 'done'

export type OnboardingEvent = 'continue' | 'power-on' | 'rotated' | 'stay-portrait' | 'tutorial-finished'

export interface OnboardingContext {
  connected: boolean
  justConnected: boolean
  welcomed: boolean
  onboarded: boolean
  phonePortrait: boolean
}

export function initialStep(c: OnboardingContext): OnboardingStep {
  if (!c.connected) return c.welcomed ? 'connect' : 'welcome'
  if (c.justConnected || !c.onboarded) return 'connected'
  return 'done'
}

const afterOrientation = (c: OnboardingContext): OnboardingStep => (c.onboarded ? 'done' : 'tutorial')

export function nextStep(step: OnboardingStep, event: OnboardingEvent, c: OnboardingContext): OnboardingStep {
  switch (step) {
    case 'welcome':
      return event === 'continue' ? 'connect' : step
    case 'connected':
      if (event !== 'power-on') return step
      return c.phonePortrait ? 'orientation' : afterOrientation(c)
    case 'orientation':
      return event === 'rotated' || event === 'stay-portrait' ? afterOrientation(c) : step
    case 'tutorial':
      return event === 'tutorial-finished' ? 'done' : step
    default:
      return step
  }
}
