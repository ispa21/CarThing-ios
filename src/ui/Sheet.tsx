import { useEffect, useId, useRef, type ReactNode } from 'react'
import { feedback } from '../sensory/feedback'
import { Icon } from './Icon'

/**
 * Bottom sheet (centered on wide screens) built on native <dialog>:
 * focus trap, Escape and inert background come from the platform.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
        <div className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-btn"
            onClick={() => {
              feedback.play('back')
              onClose()
            }}
            aria-label="Close"
          >
            <Icon name="down" />
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  )
}
