import { describe, expect, it } from 'vitest'
import { angleDelta, angleFor, levelForTurn, pointerAngle, SCALE_END, SCALE_START, settle, snap } from './knob'

describe('knob scale', () => {
  it('maps 0 and 100 to the ends of the printed scale', () => {
    expect(angleFor(0)).toBe(SCALE_START)
    expect(angleFor(100)).toBe(SCALE_END)
    expect(angleFor(150)).toBe(SCALE_END)
  })

  it('reads the pointer angle clockwise from 12 o’clock', () => {
    expect(pointerAngle(0, -10)).toBeCloseTo(0)
    expect(pointerAngle(10, 0)).toBeCloseTo(90)
    expect(pointerAngle(-10, 0)).toBeCloseTo(-90)
  })

  it('takes the short way round across ±180°', () => {
    expect(angleDelta(170, -170)).toBe(20)
    expect(angleDelta(-170, 170)).toBe(-20)
  })

  it('turns clockwise to raise the level', () => {
    expect(levelForTurn(14)).toBeCloseTo(10)
    expect(levelForTurn(-14)).toBeCloseTo(-10)
  })
})

describe('settle', () => {
  it('snaps to a 4% detent', () => {
    expect(snap(61)).toBe(60)
    expect(snap(63)).toBe(64)
    expect(snap(-3)).toBe(0)
  })

  it('stays put when released still', () => {
    expect(settle(50, 0)).toEqual({ level: 52, frames: 0 })
  })

  it('carries a throw further, in its direction, then stops', () => {
    const up = settle(40, 0.05)
    expect(up.level).toBeGreaterThan(40)
    expect(up.frames).toBeGreaterThan(0)
    expect(settle(40, -0.05).level).toBeLessThan(40)
  })

  it('stops at the end stops', () => {
    expect(settle(98, 1).level).toBe(100)
    expect(settle(2, -1).level).toBe(0)
  })
})
