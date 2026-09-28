import { m, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { SPRING_KEY } from './motion'

/**
 * A physical key: compresses on press, springs back on release (critically damped,
 * interruptible). CSS adds the 1px of key travel and the shadow bottoming out.
 * With reduced motion there's no scale at all — the CSS press state remains.
 */
export function PressKey({ disabled, depth = 0.96, ...props }: HTMLMotionProps<'button'> & { depth?: number }) {
  const reduce = useReducedMotion()
  return <m.button {...props} disabled={disabled} whileTap={disabled || reduce ? undefined : { scale: depth }} transition={SPRING_KEY} />
}
