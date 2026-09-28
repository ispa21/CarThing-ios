// Motion tokens for Motion (framer-motion). Mirrors the CSS tokens in styles/tokens.css
// so JS-driven and CSS-driven movement share one rhythm (docs/redesign/design-system/motion-spec.md).

export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const

/** Critically damped (apple-design default): no overshoot on anything the user didn't throw. */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.32 } as const
/** Keys: compress fast, return without wobble. */
export const SPRING_KEY = { type: 'spring', bounce: 0, duration: 0.26 } as const
/** Something that travels to a new place (the rail's lamp). A touch of life, still no wobble. */
export const SPRING_TRAVEL = { type: 'spring', bounce: 0.12, duration: 0.42 } as const
