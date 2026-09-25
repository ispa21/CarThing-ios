import { m, useReducedMotion, type HTMLMotionProps } from 'motion/react'

/** Critically damped: presses in fast, returns without wobble (apple-design default). */
const KEY_SPRING = { type: 'spring', bounce: 0, duration: 0.28 } as const

/**
 * A physical key: compresses on press, springs back on release. With reduced
 * motion there's no scale at all — the CSS press state (shadow, colour) remains.
 */
export function PressKey({ disabled, depth = 0.96, ...props }: HTMLMotionProps<'button'> & { depth?: number }) {
  const reduce = useReducedMotion()
  return <m.button {...props} disabled={disabled} whileTap={disabled || reduce ? undefined : { scale: depth }} transition={KEY_SPRING} />
}
