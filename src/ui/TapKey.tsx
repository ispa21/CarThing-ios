import type { ButtonHTMLAttributes, Ref } from 'react'
import { HapticSwitch } from '../sensory/HapticSwitch'

/**
 * A plain button that can tick on iPhone: the same element, plus a HapticSwitch. Use it
 * for every small control (radios, filters, row icons, sheet keys) whose onClick calls
 * feedback.play synchronously. Not for links, submit buttons or drag surfaces.
 */
export function TapKey({ children, ref, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button type="button" {...props} ref={ref}>
      {children}
      <HapticSwitch disabled={props.disabled} />
    </button>
  )
}
