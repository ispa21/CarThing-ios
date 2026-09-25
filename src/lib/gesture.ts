/** Swipe the artwork to skip: commit on distance OR a quick flick (apple-design §6). */
export const SWIPE_COMMIT_PX = 80
export const SWIPE_FLICK_PX_S = 500

export type SwipeDirection = 'next' | 'previous'

export function swipeDirection(offsetX: number, velocityX: number): SwipeDirection | null {
  if (offsetX <= -SWIPE_COMMIT_PX || velocityX <= -SWIPE_FLICK_PX_S) return 'next'
  if (offsetX >= SWIPE_COMMIT_PX || velocityX >= SWIPE_FLICK_PX_S) return 'previous'
  return null
}
