import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { feedback } from '../sensory/feedback'

interface Props {
  /** 0–100, or null when this can't be set (the fader shows "Fixed"). */
  value: number | null
  /** Called once per gesture: on release, or when the keys stop. `silent`: the key press already cued. */
  onCommit: (value: number, opts?: { silent?: boolean }) => void
  orientation: 'vertical' | 'horizontal'
  label: string
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/**
 * A channel fader. The cap follows the finger 1:1 and sends one request on release
 * (Spotify rate-limits, and a fader dragged through 40 values shouldn't send 40).
 * Keyboard: arrows ±5, Page ±10, Home/End. Position is a CSS variable on the element;
 * the cap and meter move by transform and clip-path only.
 */
export function Fader({ value, onCommit, orientation, label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<number | null>(null)
  const [drag, setDragState] = useState<number | null>(null)
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const setDrag = (v: number | null) => {
    dragRef.current = v
    setDragState(v)
  }
  useEffect(() => () => clearTimeout(keyTimer.current), [])

  const fixed = value === null
  const shown = drag ?? value ?? 0

  const valueAt = (e: PointerEvent) => {
    const r = trackRef.current!.getBoundingClientRect()
    const inset = 10 + 11 // slot inset + half the cap
    return orientation === 'vertical'
      ? clamp(((r.bottom - inset - e.clientY) / (r.height - inset * 2)) * 100)
      : clamp(((e.clientX - r.left - inset) / (r.width - inset * 2)) * 100)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (fixed || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(valueAt(e))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current !== null) setDrag(valueAt(e))
  }
  const onPointerUp = () => {
    const v = dragRef.current
    if (v === null) return
    setDrag(null)
    onCommit(v) // in the gesture: the command cues it
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (fixed) return
    const now = dragRef.current ?? value ?? 0
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 10, PageDown: -10 }[e.key]
    let target: number | null = step != null ? now + step : null
    if (e.key === 'Home') target = 0
    if (e.key === 'End') target = 100
    if (target === null) return
    e.preventDefault()
    e.stopPropagation() // don't also trigger the global ←/→ seek shortcut
    if (dragRef.current === null) feedback.play('tick') // the cue belongs to the key press, once per burst
    setDrag(clamp(target))
    clearTimeout(keyTimer.current)
    keyTimer.current = setTimeout(() => {
      const v = dragRef.current
      setDrag(null)
      if (v !== null) onCommit(v, { silent: true })
    }, 400)
  }

  return (
    <div
      className="fader"
      data-orientation={orientation}
      data-dragging={drag !== null || undefined}
      data-disabled={fixed || undefined}
      style={{ '--pos': shown / 100 } as CSSProperties}
    >
      <div
        ref={trackRef}
        className="fader-track"
        role="slider"
        tabIndex={fixed ? -1 : 0}
        aria-label={label}
        aria-orientation={orientation}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fixed ? undefined : shown}
        aria-valuetext={fixed ? 'Fixed by this device' : `${shown}%`}
        aria-disabled={fixed || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKeyDown}
      >
        <span className="fader-meter" aria-hidden="true" />
        <span className="fader-cap" aria-hidden="true" />
      </div>
      <span className="fader-value readout" aria-hidden="true">
        {fixed ? 'FIX' : shown}
      </span>
    </div>
  )
}
