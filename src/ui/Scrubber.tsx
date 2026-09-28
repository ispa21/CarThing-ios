import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatTime, interpolateProgress, minuteMarks } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import { useClockPainter, type Clock } from './clock'

interface Props {
  clock: Clock
  durationMs: number
  /** `silent`: the key press already played the cue (keyboard seeks settle after a debounce). */
  onSeek: (ms: number, opts?: { silent?: boolean }) => void
  disabled?: boolean
  label?: string
}

/**
 * The dial: a tuning scale for the song. Fine ticks are the song, minute ticks
 * stand taller, lit ticks are what's played, the needle is now. Progress is
 * painted straight to the DOM each frame (no React renders), by transform only.
 * Dragging tracks the finger 1:1 and seeks once, on release.
 */
export function Scrubber({ clock, durationMs, onSeek, disabled = false, label = 'Seek' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const litRef = useRef<HTMLDivElement>(null)
  const litTicksRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const remainingRef = useRef<HTMLSpanElement>(null)
  const lastSecond = useRef(-1)
  // The drag/keyboard preview position. A ref for handlers (never stale), state to pause the painter.
  const dragRef = useRef<number | null>(null)
  const [dragMs, setDragMs] = useState<number | null>(null)
  const setDrag = (ms: number | null) => {
    dragRef.current = ms
    setDragMs(ms)
  }
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dragging = dragMs !== null

  const paint = useCallback(
    (ms: number) => {
      const p = durationMs > 0 ? Math.min(1, Math.max(0, ms / durationMs)) : 0
      if (litRef.current) litRef.current.style.transform = `translateX(${(p - 1) * 100}%)`
      if (litTicksRef.current) litTicksRef.current.style.transform = `translateX(${(1 - p) * 100}%)`
      if (needleRef.current) needleRef.current.style.transform = `translateX(calc(${p} * 100cqw))`
      const second = Math.floor(ms / 1000)
      if (second === lastSecond.current) return
      lastSecond.current = second
      const elapsed = formatTime(ms)
      if (elapsedRef.current) elapsedRef.current.textContent = elapsed
      if (remainingRef.current) remainingRef.current.textContent = `−${formatTime(Math.max(0, durationMs - second * 1000))}`
      trackRef.current?.setAttribute('aria-valuenow', String(second))
      trackRef.current?.setAttribute('aria-valuetext', `${elapsed} of ${formatTime(durationMs)}`)
    },
    [durationMs],
  )

  // Track changed (new duration): repaint now, even when paused and nothing else will trigger it.
  useEffect(() => {
    lastSecond.current = -1
    if (dragRef.current !== null) return
    const { snapshot, syncedAt } = clock.read()
    paint(interpolateProgress(snapshot, syncedAt, Date.now()))
  }, [durationMs, clock, paint])

  useEffect(() => () => clearTimeout(keyTimer.current), [])

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
    setDrag(msAt(e.clientX))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current !== null) setDrag(msAt(e.clientX))
  }
  const onPointerUp = () => {
    const ms = dragRef.current
    if (ms === null) return
    setDrag(null)
    onSeek(ms)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const { snapshot, syncedAt } = clock.read()
    // Repeated presses build on the preview, not on the (not yet seeked) playback position.
    const now = dragRef.current ?? interpolateProgress(snapshot, syncedAt, Date.now())
    const step = { ArrowRight: 5000, ArrowUp: 5000, ArrowLeft: -5000, ArrowDown: -5000, PageUp: 15000, PageDown: -15000 }[e.key]
    let target: number | null = step != null ? now + step : null
    if (e.key === 'Home') target = 0
    if (e.key === 'End') target = Math.max(0, durationMs - 1000)
    if (target === null) return
    e.preventDefault()
    e.stopPropagation() // don't also trigger the global ←/→ shortcut
    // The cue belongs to the key press (in the gesture), once per burst; the seek below is silent.
    if (dragRef.current === null) feedback.play('seek')
    // Preview immediately, send one seek when the keys stop (holding a key must not flood Spotify).
    setDrag(Math.min(Math.max(0, target), durationMs))
    clearTimeout(keyTimer.current)
    keyTimer.current = setTimeout(() => {
      const ms = dragRef.current
      setDrag(null)
      if (ms !== null) onSeek(ms, { silent: true })
    }, 350)
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
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKeyDown}
      >
        <div className="scrub-dial">
          <div className="scrub-ticks" />
          {minuteMarks(durationMs).map((pct) => (
            <span key={pct} className="scrub-minute" style={{ left: `${pct}%` }} />
          ))}
          <div ref={litRef} className="scrub-lit">
            <div ref={litTicksRef} className="scrub-lit-ticks" />
          </div>
        </div>
        <div ref={needleRef} className="scrub-needle" />
      </div>
      <div className="scrub-times readout" aria-hidden="true">
        <span ref={elapsedRef} className="scrub-elapsed">
          0:00
        </span>
        <span ref={remainingRef}>−{formatTime(durationMs)}</span>
      </div>
    </div>
  )
}
