// feedback.play('next-track') — the only sensory API the app uses.
// Supplementary by design: every event is also visible on screen, and a missing
// or failing channel (no haptics, muted, blocked audio) never breaks anything.

import { triggerHaptic } from './haptics'
import { INTERACTIONS } from './interactionMap'
import { playSound } from './sounds'
import type { CueSound, FeedbackEvent, FeedbackPrefs, HapticName } from './types'

export interface FeedbackAdapters {
  haptic: (name: HapticName) => void
  sound: (name: CueSound) => void
}

/** The same event twice within this window is one interaction (e.g. click + key repeat). */
export const DEDUPE_MS = 60

export function createFeedback(adapters: FeedbackAdapters, now: () => number = () => performance.now()) {
  let prefs: FeedbackPrefs = { sound: true, haptics: true }
  const lastPlayed = new Map<FeedbackEvent, number>()

  return {
    configure(next: Partial<FeedbackPrefs>) {
      prefs = { ...prefs, ...next }
    },
    play(event: FeedbackEvent) {
      const cue = INTERACTIONS[event]
      if (!cue) return
      const t = now()
      const prev = lastPlayed.get(event)
      if (prev !== undefined && t - prev < DEDUPE_MS) return
      lastPlayed.set(event, t)
      // Haptic first: on iOS it must run synchronously inside the gesture.
      if (cue.haptic && prefs.haptics) {
        try {
          adapters.haptic(cue.haptic)
        } catch {
          // a failing channel is never an app error
        }
      }
      if (cue.sound && prefs.sound) {
        try {
          adapters.sound(cue.sound)
        } catch {
          // ditto
        }
      }
    },
  }
}

export type Feedback = ReturnType<typeof createFeedback>

export const feedback: Feedback = createFeedback({ haptic: triggerHaptic, sound: playSound })
