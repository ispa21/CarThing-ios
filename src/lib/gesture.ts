/** Swipe the artwork to skip: commit on distance OR a quick flick (apple-design §6). */
export const SWIPE_COMMIT_PX = 80
export const SWIPE_FLICK_PX_S = 500

export type SwipeDirection = 'next' | 'previous'

export function swipeDirection(offsetX: number, velocityX: number): SwipeDirection | null {
  if (offsetX <= -SWIPE_COMMIT_PX || velocityX <= -SWIPE_FLICK_PX_S) return 'next'
  if (offsetX >= SWIPE_COMMIT_PX || velocityX >= SWIPE_FLICK_PX_S) return 'previous'
  return null
}

/**
 * Drag a sheet toward its edge to close it: past 30% of its size (at most 120px), or a
 * quick flick whatever the distance (emil-design-eng: momentum-based dismissal).
 */
export const SHEET_FLICK_PX_MS = 0.45

export function shouldDismissSheet(offsetPx: number, elapsedMs: number, sizePx: number): boolean {
  if (offsetPx <= 12) return false
  return offsetPx >= Math.min(120, sizePx * 0.3) || offsetPx / Math.max(elapsedMs, 1) >= SHEET_FLICK_PX_MS
}
