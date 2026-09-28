import { m, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { HapticSwitch } from '../sensory/HapticSwitch'
import { SPRING_KEY } from './motion'

/**
 * A physical key. Chunky keycaps travel down onto their hard drop (CSS) and don't
 * shrink (`depth={1}`); smaller keys also compress with a critically damped spring.
 * With reduced motion there's no scale at all — the CSS press state remains.
 * On iPhone it carries a HapticSwitch, the only way a web page can tick there.
 */
export function PressKey({ disabled, depth = 0.96, children, ...props }: HTMLMotionProps<'button'> & { depth?: number }) {
  const reduce = useReducedMotion()
  return (
    <m.button {...props} disabled={disabled} whileTap={disabled || reduce || depth === 1 ? undefined : { scale: depth }} transition={SPRING_KEY}>
      {children as ReactNode}
      <HapticSwitch disabled={disabled} />
    </m.button>
  )
}
