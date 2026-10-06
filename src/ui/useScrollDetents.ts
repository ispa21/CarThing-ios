import { useEffect, type RefObject } from 'react'
import { feedback } from '../sensory/feedback'

/**
 * A detent each time a mark (a Stories section, a lyric line) passes the reading line as
 * *you* scroll. Android feels it; iPhone can't tick mid-scroll, and nothing is heard.
 * Only while `enabled`: scrolls the app makes itself (following the song) never tick.
 *
 * `ref` may point inside the scroller: the nearest scrolling ancestor is used.
 */
export function useScrollDetents(ref: RefObject<HTMLElement | null>, selector: string, { line = 0.35, enabled = true }: { line?: number; enabled?: boolean } = {}) {
  useEffect(() => {
    const inner = ref.current
    if (!inner || !enabled) return
    let scroller: HTMLElement | null = inner
    while (scroller && scroller !== document.body && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!scroller || scroller === document.body) return
    const el = scroller
    const passed = () => {
      const y = el.getBoundingClientRect().top + el.clientHeight * line
      let n = 0
      for (const m of el.querySelectorAll(selector)) {
        if (m.getBoundingClientRect().top <= y) n++
        else break
      }
      return n
    }
    let last = passed()
    const onScroll = () => {
      const n = passed()
      if (n !== last) feedback.play('detent')
      last = n
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ref, selector, line, enabled])
}
