// The interactive tutorial: you perform each action; reading is optional.

export type TutorialAction = 'play' | 'pause' | 'next' | 'previous' | 'open-queue' | 'open-lyrics' | 'fullscreen' | 'acknowledge'

export interface TutorialStep {
  id: 'play' | 'skip' | 'queue' | 'lyrics' | 'fullscreen'
  title: string
  hint: string
  accepts: readonly TutorialAction[]
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'play', title: 'Press play.', hint: 'The big key starts and stops the music.', accepts: ['play'] },
  { id: 'skip', title: 'Skip ahead.', hint: 'Press next, or swipe the artwork sideways.', accepts: ['next', 'previous'] },
  { id: 'queue', title: 'Open the queue.', hint: 'Everything up next lives here.', accepts: ['open-queue'] },
  { id: 'lyrics', title: 'Open the lyrics.', hint: 'A big, calm reader for the song.', accepts: ['open-lyrics'] },
  { id: 'fullscreen', title: 'Take the whole screen.', hint: 'Fullscreen gives PartyDeck the complete display.', accepts: ['fullscreen', 'acknowledge'] },
]

/** Index of the step to show after `action` at step `index`. Unrelated actions don't advance. */
export function advanceTutorial(index: number, action: TutorialAction): number {
  const step = TUTORIAL_STEPS[index]
  return step && step.accepts.includes(action) ? index + 1 : index
}

export const isTutorialComplete = (index: number) => index >= TUTORIAL_STEPS.length
