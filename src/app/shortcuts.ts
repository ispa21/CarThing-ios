import { useEffect } from 'react'
import { skipNext, skipPrevious } from '../spotify/playbackService'
import { back, navigate, type Route } from './router'
import { SOURCES } from './sources'

/**
 * Desktop keyboard shortcuts:
 *   Space / K  play-pause      ← / →  seek 10s      N / P  next / previous
 *   /  search   Q  queue   L  lyrics   Esc  leave Lyrics / Visual
 */
export function useShortcuts(route: Route, connected: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      // Ignore auto-repeat: holding → must not fire dozens of Spotify requests a second.
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]') || target.closest('dialog')) return

      const demo = route === 'lyrics-demo'
      if (!connected && !demo) return
      const source = SOURCES[demo ? 'demo' : 'spotify']
      const onControl = target.closest('button, a, [role="slider"]')

      switch (e.key) {
        case ' ':
        case 'k':
          if (e.key === ' ' && onControl) return // let the focused button handle Space
          e.preventDefault()
          source.toggle()
          return
        case 'ArrowRight':
        case 'ArrowLeft': {
          if (onControl?.getAttribute('role') === 'slider') return
          source.seekBy(e.key === 'ArrowRight' ? 10_000 : -10_000)
          return
        }
        case 'Escape':
          if (route === 'lyrics' || route === 'visual' || demo) back(source.backTo)
          else if (route === 'builder') back('/stories')
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
  }, [route, connected, enabled])
}
