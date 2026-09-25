import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatTime, interpolateProgress } from '../lib/progress'
import { useClockPainter, type Clock } from './clock'

interface Props {
  clock: Clock
  durationMs: number
  onSeek: (ms: number) => void
  disabled?: boolean
  label?: string
}

/**
 * Seek bar. Progress is painted straight to the DOM each frame (no React
 * renders). Dragging tracks the finger 1:1 and seeks once, on release.
 */
export function Scrubber({ clock, durationMs, onSeek, disabled = false, label = 'Seek' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const remainRef = useRef<HTMLSpanElement>(null)
  const lastSecond = useRef(-1)
  const [dragMs, setDragMs] = useState<number | null>(null)
  const dragging = dragMs !== null

  const paint = useCallback(
    (ms: number) => {
      const p = durationMs > 0 ? Math.min(1, Math.max(0, ms / durationMs)) : 0
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`
      if (thumbRef.current) thumbRef.current.style.left = `${p * 100}%`
      const second = Math.floor(ms / 1000)
      if (second === lastSecond.current) return
      lastSecond.current = second
      const elapsed = formatTime(ms)
      if (elapsedRef.current) elapsedRef.current.textContent = elapsed
      if (remainRef.current) remainRef.current.textContent = `-${formatTime(durationMs - ms)}`
      trackRef.current?.setAttribute('aria-valuenow', String(second))
      trackRef.current?.setAttribute('aria-valuetext', `${elapsed} of ${formatTime(durationMs)}`)
    },
    [durationMs],
  )

  useEffect(() => {
    lastSecond.current = -1 // duration changed → repaint labels
  }, [durationMs])

  useClockPainter(clock, paint, !dragging)
  useEffect(() => {
    if (dragMs !== null) paint(dragMs)
  }, [dragMs, paint])

  const msAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * durationMs
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || !durationMs || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragMs(msAt(e.clientX))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setDragMs(msAt(e.clientX))
  }
  const onPointerUp = () => {
    if (dragMs === null) return
    onSeek(dragMs)
    setDragMs(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const { snapshot, syncedAt } = clock.read()
    const now = interpolateProgress(snapshot, syncedAt, Date.now())
    const step = { ArrowRight: 5000, ArrowUp: 5000, ArrowLeft: -5000, ArrowDown: -5000, PageUp: 15000, PageDown: -15000 }[e.key]
    let target: number | null = step != null ? now + step : null
    if (e.key === 'Home') target = 0
    if (e.key === 'End') target = Math.max(0, durationMs - 1000)
    if (target === null) return
    e.preventDefault()
    e.stopPropagation() // don't also trigger the global ←/→ shortcut
    onSeek(Math.min(Math.max(0, target), durationMs))
  }

  return (
    <div className="scrub" data-dragging={dragging || undefined} data-disabled={disabled || undefined}>
      <div
        ref={trackRef}
        className="scrub-hit"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.floor(durationMs / 1000)}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragMs(null)}
        onKeyDown={onKeyDown}
      >
        <div className="scrub-track">
          <div ref={fillRef} className="scrub-fill" />
        </div>
        <div ref={thumbRef} className="scrub-thumb" />
      </div>
      <div className="scrub-times" aria-hidden="true">
        <span ref={elapsedRef}>0:00</span>
        <span ref={remainRef}>-{formatTime(durationMs)}</span>
      </div>
    </div>
  )
}
