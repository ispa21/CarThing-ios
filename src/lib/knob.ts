// The level knob's physics, kept pure so it can be tested without a DOM.
// Angles are degrees clockwise from 12 o'clock. The printed scale runs from
// SCALE_START (0) to SCALE_END (100) along the knob's visible, left-hand side.

export const SCALE_START = -160
export const SCALE_END = -20
export const SCALE_SPAN = SCALE_END - SCALE_START
export const DETENT = 4
/** Velocity kept per 16ms frame after release: momentum bleeds away to friction. */
export const FRICTION = 0.9
const STOP = 0.004 // value units per ms

export const clampLevel = (v: number) => Math.max(0, Math.min(100, v))

/** The knob's rotation for a level. */
export const angleFor = (level: number) => SCALE_START + (clampLevel(level) / 100) * SCALE_SPAN

/** The pointer's angle around the knob's centre. */
export const pointerAngle = (dx: number, dy: number) => (Math.atan2(dx, -dy) * 180) / Math.PI

/** The shortest signed turn from one angle to another (so crossing ±180° doesn't jump). */
export function angleDelta(from: number, to: number) {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/** Degrees turned → level change. Turning clockwise (up the scale) raises the level. */
export const levelForTurn = (degrees: number) => (degrees / SCALE_SPAN) * 100

export const snap = (level: number) => clampLevel(Math.round(level / DETENT) * DETENT)

/**
 * After release the knob keeps turning with the velocity it was thrown at
 * (level units per ms), slowing by FRICTION each 16ms frame. Returns where it
 * comes to rest, snapped to a detent, and how many frames it spun.
 */
export function settle(level: number, velocity: number): { level: number; frames: number } {
  let v = velocity
  let x = level
  let frames = 0
  while (Math.abs(v) > STOP && frames < 120) {
    x = clampLevel(x + v * 16)
    v *= FRICTION
    frames++
    if (x === 0 || x === 100) break
  }
  return { level: snap(x), frames }
}
