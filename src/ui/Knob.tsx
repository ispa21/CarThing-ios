import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { angleDelta, angleFor, clampLevel, DETENT, levelForTurn, pointerAngle, settle, snap } from '../lib/knob'
import { feedback } from '../sensory/feedback'

interface Props {
  /** 0–100, or null when this device's level can't be set from here (the knob reads "fixed"). */
  value: number | null
  /** Once per gesture, after the knob comes to rest. The press already cued it. */
  onCommit: (value: number, opts: { silent: boolean }) => void
  label: string
}

const TICKS = Array.from({ length: 29 }, (_, i) => i)

/**
 * The level knob: bigger than the plate, printed scale on its visible side.
 * Turn it by dragging around its centre; let go mid-turn and it keeps spinning,
 * bleeding speed to friction, then snaps to a 4% detent. One Spotify request per
 * gesture (they rate-limit, and a knob swept through 40 values shouldn't send 40).
 * No HapticSwitch: it's a drag surface. Keyboard: arrows ±4, Page ±12, Home/End.
 */
export function Knob({ value, onCommit, label }: Props) {
  const reduce = useReducedMotion()
  const [local, setLocal] = useState<number | null>(null)
  const [spin, setSpin] = useState(0) // ms of settling motion, 0 while held
  const [held, setHeld] = useState(false)
  const drag = useRef<{ cx: number; cy: number; angle: number; level: number; samples: Array<[number, number]> } | null>(null)
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(
    () => () => {
      clearTimeout(keyTimer.current)
      clearTimeout(settleTimer.current)
    },
    [],
  )

  const fixed = value === null
  const shown = local ?? value ?? 0

  const commitAfter = (target: number, ms: number) => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      onCommit(target, { silent: true })
      setLocal(null)
      setSpin(0)
    }, ms)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (fixed || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    clearTimeout(settleTimer.current)
    const r = e.currentTarget.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    drag.current = { cx, cy, angle: pointerAngle(e.clientX - cx, e.clientY - cy), level: shown, samples: [[e.timeStamp, shown]] }
    setSpin(0)
    setHeld(true)
    setLocal(shown)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const angle = pointerAngle(e.clientX - d.cx, e.clientY - d.cy)
    d.level = clampLevel(d.level + levelForTurn(angleDelta(d.angle, angle)))
    d.angle = angle
    d.samples.push([e.timeStamp, d.level])
    while (d.samples.length > 2 && e.timeStamp - d.samples[0][0] > 80) d.samples.shift()
    setLocal(d.level)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setHeld(false)
    feedback.play('tick') // the cue belongs to the release (in the gesture); the request follows silently
    const [t0, l0] = d.samples[0]
    const dt = e.timeStamp - t0
    const velocity = !reduce && dt > 0 ? (d.level - l0) / dt : 0
    const rest = settle(d.level, velocity)
    const ms = Math.max(120, rest.frames * 16)
    setSpin(reduce ? 0 : ms)
    setLocal(rest.level)
    commitAfter(rest.level, reduce ? 0 : ms)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (fixed) return
    const step = { ArrowUp: DETENT, ArrowRight: DETENT, ArrowDown: -DETENT, ArrowLeft: -DETENT, PageUp: 12, PageDown: -12 }[e.key]
    let target: number | null = step != null ? shown + step : null
    if (e.key === 'Home') target = 0
    if (e.key === 'End') target = 100
    if (target === null) return
    e.preventDefault()
    e.stopPropagation() // don't also trigger the global ←/→ seek shortcut
    if (local === null) feedback.play('tick') // once per burst of key presses
    setSpin(0)
    setLocal(snap(target))
    clearTimeout(keyTimer.current)
    keyTimer.current = setTimeout(() => commitAfter(snap(target), 0), 400)
  }

  return (
    <div
      className="knob"
      data-fixed={fixed || undefined}
      data-held={held || undefined}
      style={{ '--angle': `${angleFor(shown)}deg`, '--level': shown, '--spin': `${spin}ms` } as CSSProperties}
    >
      <div className="knob-scale" aria-hidden="true">
        {TICKS.map((i) => (
          <span key={i} className="knob-tick" data-major={i % 7 === 0 || undefined} style={{ '--i': i, '--v': (i / 28) * 100 } as CSSProperties} />
        ))}
        <span className="knob-num" data-at="0">
          0
        </span>
        <span className="knob-num" data-at="5">
          5
        </span>
        <span className="knob-num" data-at="10">
          10
        </span>
      </div>
      <div
        className="knob-body"
        role="slider"
        tabIndex={fixed ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fixed ? undefined : Math.round(shown)}
        aria-valuetext={fixed ? 'Fixed by this device' : `${Math.round(shown)}%`}
        aria-disabled={fixed || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null
          setHeld(false)
          setLocal(null)
        }}
        onKeyDown={onKeyDown}
      >
        <span className="knob-cap">
          <span className="knob-pointer" />
          <span className="knob-lamp" />
        </span>
      </div>
    </div>
  )
}
