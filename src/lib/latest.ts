import { debounce } from './debounce'

/**
 * Debounced async runner that only ever delivers the newest request's result.
 * Starting a request aborts the one before it; late responses are dropped.
 * Used by Search so a slow "bl" response can't overwrite "blinding".
 */
export function createLatestRunner<A, R>(
  run: (arg: A, signal: AbortSignal) => Promise<R>,
  ms: number,
  handlers: { onResult: (result: R, arg: A) => void; onError: (error: unknown) => void },
) {
  let inflight: AbortController | null = null
  const debounced = debounce((arg: A) => {
    inflight?.abort()
    const ctrl = new AbortController()
    inflight = ctrl
    run(arg, ctrl.signal).then(
      (result) => {
        if (!ctrl.signal.aborted) handlers.onResult(result, arg)
      },
      (error: unknown) => {
        if (!ctrl.signal.aborted) handlers.onError(error)
      },
    )
  }, ms)

  return {
    run: (arg: A) => debounced(arg),
    flush: () => debounced.flush(),
    stop: () => {
      debounced.cancel()
      inflight?.abort()
      inflight = null
    },
  }
}
