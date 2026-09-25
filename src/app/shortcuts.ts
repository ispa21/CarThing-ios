import { useEffect } from 'react'
import { seekDemoBy, toggleDemo } from '../lyrics/demoClock'
import { seekBy, skipNext, skipPrevious, togglePlay } from '../spotify/playbackService'
import { back, navigate, type Route } from './router'

/**
 * Desktop keyboard shortcuts:
 *   Space / K  play-pause      ← / →  seek 10s      N / P  next / previous
 *   /  search   Q  queue   L  lyrics   Esc  leave Now Playing / Lyrics
 */
export function useShortcuts(route: Route, connected: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]') || target.closest('dialog')) return

      const demo = route === 'lyrics-demo'
      if (!connected && !demo) return
      const onControl = target.closest('button, a, [role="slider"]')

      switch (e.key) {
        case ' ':
        case 'k':
          if (e.key === ' ' && onControl) return // let the focused button handle Space
          e.preventDefault()
          void (demo ? toggleDemo() : togglePlay())
          return
        case 'ArrowRight':
        case 'ArrowLeft': {
          if (onControl?.getAttribute('role') === 'slider') return
          const delta = e.key === 'ArrowRight' ? 10_000 : -10_000
          void (demo ? seekDemoBy(delta) : seekBy(delta))
          return
        }
        case 'Escape':
          if (route === 'now' || route === 'lyrics' || demo) back(demo && !connected ? '/' : '/now')
          return
      }
      if (!connected) return
      switch (e.key.toLowerCase()) {
        case 'n':
          void skipNext()
          return
        case 'p':
          void skipPrevious()
          return
        case '/':
          e.preventDefault()
          navigate('/search')
          return
        case 'q':
          navigate('/queue')
          return
        case 'l':
          navigate('/lyrics')
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [route, connected])
}
