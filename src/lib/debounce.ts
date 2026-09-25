export interface Debounced<A extends unknown[]> {
  (...args: A): void
  cancel(): void
  flush(): void
}

/** Trailing-edge debounce: only the last call within `ms` runs. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: A | undefined
  const run = () => {
    timer = undefined
    const args = pending
    pending = undefined
    if (args) fn(...args)
  }
  const d = (...args: A) => {
    pending = args
    clearTimeout(timer)
    timer = setTimeout(run, ms)
  }
  d.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
  }
  d.flush = () => {
    clearTimeout(timer)
    run()
  }
  return d
}
