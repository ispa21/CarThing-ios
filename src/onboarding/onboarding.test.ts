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

  const ALL: TutorialAction[] = ['play', 'pause', 'next', 'open-queue', 'go-home', 'open-lyrics', 'fullscreen']

  it('teaches play/pause, next/previous, navigation, queue, lyrics and fullscreen — by doing', () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual(['play', 'pause', 'skip', 'queue', 'home', 'lyrics', 'fullscreen'])
  })

  it('advances only when you perform the step', () => {
    expect(run(['pause'])).toBe(0) // wrong action
    expect(run(['play'])).toBe(1)
    expect(run(['play', 'open-lyrics'])).toBe(1) // out of order
    expect(run(['play', 'pause'])).toBe(2)
  })

  it('accepts next or previous for the skip step', () => {
    expect(run(['play', 'pause', 'previous'])).toBe(3)
    expect(run(['play', 'pause', 'next'])).toBe(3)
  })

  it('navigation: going Home is its own step, after the queue', () => {
    expect(run(['play', 'pause', 'next', 'go-home'])).toBe(3) // Home before opening the queue doesn't count
    expect(run(['play', 'pause', 'next', 'open-queue', 'go-home'])).toBe(5)
  })

  it('completes after all seven; fullscreen can be acknowledged where unsupported', () => {
    expect(isTutorialComplete(run(ALL))).toBe(true)
    expect(isTutorialComplete(run([...ALL.slice(0, -1), 'acknowledge']))).toBe(true)
    expect(isTutorialComplete(run(ALL.slice(0, -1)))).toBe(false)
  })

  it('extra actions after completion are harmless', () => {
    expect(advanceTutorial(TUTORIAL_STEPS.length, 'play')).toBe(TUTORIAL_STEPS.length)
  })
})
