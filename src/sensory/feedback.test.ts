import { sounds as cuelumeSounds } from 'cuelume'
import { describe, expect, it, vi } from 'vitest'
import { createFeedback, DEDUPE_MS } from './feedback'
import { triggerHaptic, VIBRATION } from './haptics'
import { INTERACTIONS } from './interactionMap'
import { playSound } from './sounds'
import type { FeedbackEvent } from './types'

function setup() {
  let t = 1000
  const haptic = vi.fn()
  const sound = vi.fn()
  const fb = createFeedback({ haptic, sound }, () => t)
  return { fb, haptic, sound, advance: (ms: number) => (t += ms) }
}

describe('interaction map', () => {
  const events = Object.keys(INTERACTIONS) as FeedbackEvent[]

  it('maps only to haptic levels the adapter can render and to real Cuelume cues', () => {
    for (const e of events) {
      const { haptic, sound } = INTERACTIONS[e]
      if (haptic) expect(Object.keys(VIBRATION), `${e} haptic`).toContain(haptic)
      if (sound) expect(cuelumeSounds, `${e} sound`).toContain(sound)
    }
  })

  it('keeps the vocabulary small (consistency over variety)', () => {
    const haptics = new Set(events.map((e) => INTERACTIONS[e].haptic).filter(Boolean))
    const cues = new Set(events.map((e) => INTERACTIONS[e].sound).filter(Boolean))
    expect(haptics.size).toBeLessThanOrEqual(7)
    expect(cues.size).toBeLessThanOrEqual(11)
  })

  it('is proportional: navigation is lighter than confirmation; keyboard focus is silent', () => {
    expect(INTERACTIONS.select).toEqual({ haptic: 'selection', sound: 'tick' })
    expect(INTERACTIONS['queue-add'].haptic).toBe('success')
    expect(INTERACTIONS.focus).toEqual({ haptic: null, sound: null })
    expect(INTERACTIONS['lyrics-manual-scroll']).toEqual({ haptic: null, sound: null })
  })

  it('next and previous share one decisive cue; play and pause differ', () => {
    expect(INTERACTIONS['next-track']).toEqual(INTERACTIONS['previous-track'])
    expect(INTERACTIONS.play.sound).not.toBe(INTERACTIONS.pause.sound)
  })
})

describe('feedback.play', () => {
  it('fires the mapped haptic and sound', () => {
    const { fb, haptic, sound } = setup()
    fb.play('next-track')
    expect(haptic).toHaveBeenCalledWith('medium')
    expect(sound).toHaveBeenCalledWith('page')
  })

  it('events mapped to nothing do nothing', () => {
    const { fb, haptic, sound } = setup()
    fb.play('focus')
    fb.play('reaction')
    expect(haptic).not.toHaveBeenCalled()
    expect(sound).not.toHaveBeenCalled()
  })

  it('respects the Sound and Haptics settings independently', () => {
    const { fb, haptic, sound, advance } = setup()
    fb.configure({ sound: false })
    fb.play('play')
    expect(haptic).toHaveBeenCalledTimes(1)
    expect(sound).not.toHaveBeenCalled()
    advance(100)
    fb.configure({ sound: true, haptics: false })
    fb.play('play')
    expect(haptic).toHaveBeenCalledTimes(1)
    expect(sound).toHaveBeenCalledTimes(1)
  })

  it('does not double-fire the same event within the dedupe window', () => {
    const { fb, sound, advance } = setup()
    fb.play('select')
    fb.play('select')
    advance(DEDUPE_MS - 1)
    fb.play('select')
    expect(sound).toHaveBeenCalledTimes(1)
    advance(2)
    fb.play('select')
    expect(sound).toHaveBeenCalledTimes(2)
  })

  it('different events in quick succession both play (press, then confirmation)', () => {
    const { fb, sound } = setup()
    fb.play('select')
    fb.play('queue-add')
    expect(sound.mock.calls).toEqual([['tick'], ['success']])
  })

  it('a throwing channel never breaks the app or the other channel', () => {
    let t = 0
    const sound = vi.fn()
    const fb = createFeedback(
      {
        haptic: () => {
          throw new Error('no vibrator')
        },
        sound,
      },
      () => (t += 1000),
    )
    expect(() => fb.play('play')).not.toThrow()
    expect(sound).toHaveBeenCalledWith('pulse')
  })

  it('ignores unknown events at runtime', () => {
    const { fb, haptic } = setup()
    expect(() => fb.play('not-an-event' as FeedbackEvent)).not.toThrow()
    expect(haptic).not.toHaveBeenCalled()
  })
})

describe('real adapters without hardware (node: no window, no Web Audio, no vibrate)', () => {
  it('unsupported haptics are a no-op', () => {
    expect(() => triggerHaptic('success')).not.toThrow()
  })
  it('unavailable audio is a no-op', () => {
    expect(() => playSound('tick')).not.toThrow()
  })
})
