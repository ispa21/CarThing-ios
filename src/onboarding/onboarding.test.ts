import { describe, expect, it } from 'vitest'
import { initialStep, nextStep, type OnboardingContext, type OnboardingEvent, type OnboardingStep } from './flow'
import { advanceTutorial, isTutorialComplete, TUTORIAL_STEPS, type TutorialAction } from './tutorialSteps'

const ctx = (over: Partial<OnboardingContext> = {}): OnboardingContext => ({
  connected: false,
  justConnected: false,
  welcomed: false,
  onboarded: false,
  phonePortrait: false,
  ...over,
})

const walk = (start: OnboardingStep, events: OnboardingEvent[], c: OnboardingContext) =>
  events.reduce((step, e) => nextStep(step, e, c), start)

describe('onboarding flow', () => {
  it('a brand-new user starts at Welcome, then Connect', () => {
    const c = ctx()
    expect(initialStep(c)).toBe('welcome')
    expect(nextStep('welcome', 'continue', c)).toBe('connect')
  })

  it('a returning (welcomed) but disconnected user goes straight to Connect', () => {
    expect(initialStep(ctx({ welcomed: true }))).toBe('connect')
  })

  it('back from Spotify, landscape: connected → power on → tutorial → done', () => {
    const c = ctx({ connected: true, justConnected: true, welcomed: true })
    expect(initialStep(c)).toBe('connected')
    expect(walk('connected', ['power-on'], c)).toBe('tutorial')
    expect(walk('connected', ['power-on', 'tutorial-finished'], c)).toBe('done')
  })

  it('phone held upright: power on → orientation → (rotate) → tutorial', () => {
    const c = ctx({ connected: true, justConnected: true, phonePortrait: true })
    expect(walk('connected', ['power-on'], c)).toBe('orientation')
    expect(walk('connected', ['power-on', 'rotated'], c)).toBe('tutorial')
  })

  it('orientation never blocks: staying in portrait continues', () => {
    const c = ctx({ connected: true, justConnected: true, phonePortrait: true })
    expect(walk('connected', ['power-on', 'stay-portrait'], c)).toBe('tutorial')
  })

  it('reconnecting after onboarding: connected → power on → done (no tutorial again)', () => {
    const c = ctx({ connected: true, justConnected: true, welcomed: true, onboarded: true })
    expect(walk('connected', ['power-on'], c)).toBe('done')
  })

  it('an onboarded, connected user lands on the deck', () => {
    expect(initialStep(ctx({ connected: true, welcomed: true, onboarded: true }))).toBe('done')
  })

  it('a reload mid-onboarding resumes at the power-on step', () => {
    expect(initialStep(ctx({ connected: true, welcomed: true }))).toBe('connected')
  })

  it('unrelated events do not move the flow', () => {
    const c = ctx({ connected: true, justConnected: true })
    expect(nextStep('connected', 'continue', c)).toBe('connected')
    expect(nextStep('welcome', 'power-on', c)).toBe('welcome')
    expect(nextStep('done', 'continue', c)).toBe('done')
  })
})

describe('interactive tutorial', () => {
  const run = (actions: TutorialAction[]) => actions.reduce(advanceTutorial, 0)

  it('has five performed steps', () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual(['play', 'skip', 'queue', 'lyrics', 'fullscreen'])
  })

  it('advances only when you perform the step', () => {
    expect(run(['pause'])).toBe(0) // wrong action
    expect(run(['play'])).toBe(1)
    expect(run(['play', 'open-lyrics'])).toBe(1) // out of order
  })

  it('accepts next or previous for the skip step', () => {
    expect(run(['play', 'previous'])).toBe(2)
    expect(run(['play', 'next'])).toBe(2)
  })

  it('completes after all five; fullscreen can be acknowledged where unsupported', () => {
    const done = run(['play', 'next', 'open-queue', 'open-lyrics', 'acknowledge'])
    expect(isTutorialComplete(done)).toBe(true)
    expect(isTutorialComplete(run(['play', 'next', 'open-queue', 'open-lyrics', 'fullscreen']))).toBe(true)
    expect(isTutorialComplete(4)).toBe(false)
  })

  it('extra actions after completion are harmless', () => {
    expect(advanceTutorial(TUTORIAL_STEPS.length, 'play')).toBe(TUTORIAL_STEPS.length)
  })
})
