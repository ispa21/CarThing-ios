import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLatestRunner } from './latest'

/** A fake search whose responses we resolve by hand, in any order. */
function fakeSearch() {
  const calls: Array<{ q: string; signal: AbortSignal; resolve: (v: string) => void; reject: (e: unknown) => void }> = []
  const fn = (q: string, signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => calls.push({ q, signal, resolve, reject }))
  return { fn, calls }
}

const flush = () => Promise.resolve().then(() => Promise.resolve())

describe('createLatestRunner (search requests)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces typing into one request', () => {
    const s = fakeSearch()
    const r = createLatestRunner(s.fn, 250, { onResult: vi.fn(), onError: vi.fn() })
    r.run('b')
    r.run('bl')
    r.run('bli')
    vi.advanceTimersByTime(250)
    expect(s.calls.map((c) => c.q)).toEqual(['bli'])
  })

  it('a newer request aborts the older one, and the late older response is dropped', async () => {
    const s = fakeSearch()
    const onResult = vi.fn()
    const r = createLatestRunner(s.fn, 250, { onResult, onError: vi.fn() })
    r.run('bl')
    vi.advanceTimersByTime(250)
    r.run('blinding')
    vi.advanceTimersByTime(250)
    expect(s.calls[0].signal.aborted).toBe(true)

    s.calls[1].resolve('new')
    s.calls[0].resolve('stale') // arrives last
    await flush()
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith('new', 'blinding')
  })

  it('errors from aborted requests are ignored; current errors are reported', async () => {
    const s = fakeSearch()
    const onError = vi.fn()
    const r = createLatestRunner(s.fn, 250, { onResult: vi.fn(), onError })
    r.run('a')
    vi.advanceTimersByTime(250)
    r.run('ab')
    vi.advanceTimersByTime(250)
    s.calls[0].reject(new DOMException('aborted', 'AbortError'))
    s.calls[1].reject(new Error('503'))
    await flush()
    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0][0] as Error).message).toBe('503')
  })

  it('stop() (clearing the field / leaving the screen) cancels pending and in-flight work', async () => {
    const s = fakeSearch()
    const onResult = vi.fn()
    const r = createLatestRunner(s.fn, 250, { onResult, onError: vi.fn() })
    r.run('x')
    vi.advanceTimersByTime(250)
    r.run('xy') // still debouncing
    r.stop()
    vi.advanceTimersByTime(1000)
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0].signal.aborted).toBe(true)
    s.calls[0].resolve('late')
    await flush()
    expect(onResult).not.toHaveBeenCalled()
  })

  it('flush() (pressing Enter) searches immediately', () => {
    const s = fakeSearch()
    const r = createLatestRunner(s.fn, 250, { onResult: vi.fn(), onError: vi.fn() })
    r.run('now')
    r.flush()
    expect(s.calls.map((c) => c.q)).toEqual(['now'])
  })
})
