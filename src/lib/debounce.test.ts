import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from './debounce'

describe('debounce (search input)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once with the last value after typing stops', () => {
    const fn = vi.fn()
    const d = debounce(fn, 250)
    for (const q of ['b', 'bl', 'bli', 'blin']) {
      d(q)
      vi.advanceTimersByTime(100)
    }
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('blin')
  })

  it('fires separately for pauses longer than the delay', () => {
    const fn = vi.fn()
    const d = debounce(fn, 250)
    d('a')
    vi.advanceTimersByTime(300)
    d('ab')
    vi.advanceTimersByTime(300)
    expect(fn.mock.calls).toEqual([['a'], ['ab']])
  })

  it('cancel drops the pending call (e.g. on unmount or clearing the field)', () => {
    const fn = vi.fn()
    const d = debounce(fn, 250)
    d('x')
    d.cancel()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('flush runs the pending call immediately (e.g. pressing Enter)', () => {
    const fn = vi.fn()
    const d = debounce(fn, 250)
    d('now')
    d.flush()
    expect(fn).toHaveBeenCalledWith('now')
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
