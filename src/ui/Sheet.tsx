import { useEffect, useId, useRef, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { shouldDismissSheet } from '../lib/gesture'
import { feedback } from '../sensory/feedback'
import { Icon } from './Icon'
import { TapKey } from './TapKey'

/** Which way this sheet can be dragged shut: down (bottom sheet), right (side sheet), or not at all (centred panel). */
function dragAxis(): 'x' | 'y' | null {
  if (window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches) return 'x'
  if (window.matchMedia('(min-width: 720px)').matches) return null
  return 'y'
}

/**
 * Drag the grip/header toward the sheet's edge to close it. The sheet follows the finger
 * 1:1 (pulling the wrong way resists), then closes on distance or a quick flick, or springs
 * back. Capture starts only after 6px, so a tap on Close is still a tap.
 */
function useSheetDrag(ref: RefObject<HTMLDialogElement | null>) {
  const drag = useRef<{ id: number; axis: 'x' | 'y'; x: number; y: number; t: number; offset: number; active: boolean } | null>(null)

  const release = (dismiss: boolean) => {
    const d = ref.current
    drag.current = null
    if (!d) return
    d.style.transition = ''
    d.style.transform = '' // both in one frame: the CSS transition runs from where the finger left it
    if (dismiss) {
      feedback.play('back')
      d.close() // the dialog's close event tells the owner
    }
  }

  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      const axis = dragAxis()
      if (!axis || drag.current || e.button !== 0) return
      drag.current = { id: e.pointerId, axis, x: e.clientX, y: e.clientY, t: performance.now(), offset: 0, active: false }
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const g = drag.current
      const d = ref.current
      if (!g || !d || e.pointerId !== g.id) return
      const raw = g.axis === 'y' ? e.clientY - g.y : e.clientX - g.x
      if (!g.active) {
        if (Math.abs(raw) < 6) return
        g.active = true
        e.currentTarget.setPointerCapture(e.pointerId)
        d.style.transition = 'none'
      }
      g.offset = raw > 0 ? raw : raw * 0.2 // rubber-band away from the edge
      d.style.transform = g.axis === 'y' ? `translateY(${g.offset}px)` : `translateX(${g.offset}px)`
    },
    onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
      const g = drag.current
      const d = ref.current
      if (!g || e.pointerId !== g.id) return
      if (!g.active || !d) {
        drag.current = null
        return
      }
      const size = g.axis === 'y' ? d.offsetHeight : d.offsetWidth
      release(shouldDismissSheet(g.offset, performance.now() - g.t, size))
    },
    onPointerCancel: () => {
      if (drag.current?.active) release(false)
      else drag.current = null
    },
  }
}

/**
 * Bottom sheet (a side sheet on landscape phones, centred on wide screens) built on
 * native <dialog>: focus trap, Escape and inert background come from the platform.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const grab = useSheetDrag(ref)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={() => feedback.play('back')} // Escape
      onClick={(e) => {
        if (e.target !== e.currentTarget) return // backdrop tap only
        feedback.play('back')
        onClose()
      }}
    >
      <div className="sheet-body">
        <div className="sheet-grab" {...grab}>
          <div className="sheet-grip" aria-hidden="true" />
          <header className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            <TapKey
              className="icon-btn"
              onClick={() => {
                feedback.play('back')
                onClose()
              }}
              aria-label="Close"
            >
              <Icon name="down" />
            </TapKey>
          </header>
        </div>
        {open && children}
      </div>
    </dialog>
  )
}
