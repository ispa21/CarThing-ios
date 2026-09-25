import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Callback } from '../screens/Callback'
import { Connect } from '../screens/Connect'
import { Home } from '../screens/Home'
import { LyricsScreen } from '../screens/Lyrics'
import { NowPlaying } from '../screens/NowPlaying'
import { Queue } from '../screens/Queue'
import { Search } from '../screens/Search'
import { Settings } from '../screens/Settings'
import { startPlaybackSync, stopPlaybackSync } from '../spotify/playbackService'
import { useSession } from '../store/session'
import { THEME_COLORS, useSettings } from '../store/settings'
import { Toaster } from '../ui/Feedback'
import { DeviceSheet } from './DeviceSheet'
import { Dock, MiniPlayer } from './Dock'
import { matchRoute, usePathname, type Route } from './router'
import { useShortcuts } from './shortcuts'

const TITLES: Record<Route, string> = {
  home: 'PartyDeck',
  search: 'Search · PartyDeck',
  queue: 'Queue · PartyDeck',
  now: 'Now Playing · PartyDeck',
  lyrics: 'Lyrics · PartyDeck',
  'lyrics-demo': 'Lyrics demo · PartyDeck',
  settings: 'Settings · PartyDeck',
  callback: 'Connecting · PartyDeck',
}

const IMMERSIVE: Route[] = ['now', 'lyrics', 'lyrics-demo']

export function App() {
  const route = matchRoute(usePathname())
  const connected = useSession((s) => s.connected)
  const theme = useSettings((s) => s.theme)

  useShortcuts(route, connected)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  let content
  if (route === 'callback') content = <Callback />
  else if (connected) content = <ConnectedApp route={route} />
  else if (route === 'lyrics-demo')
    content = (
      <div className="shell" data-immersive>
        <Screen route={route} immersive />
      </div>
    )
  else content = <Connect />

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {content}
        <Toaster />
      </MotionConfig>
    </LazyMotion>
  )
}

function ConnectedApp({ route }: { route: Route }) {
  useEffect(() => {
    startPlaybackSync()
    return stopPlaybackSync
  }, [])

  const immersive = IMMERSIVE.includes(route)
  return (
    <div className="shell" data-immersive={immersive || undefined}>
      <Screen route={route} immersive={immersive} />
      {!immersive && (
        <div className="nav">
          <MiniPlayer />
          <Dock route={route} />
        </div>
      )}
      <DeviceSheet />
    </div>
  )
}

/** Keyed per route so each screen mounts fresh (scroll resets, enter animation plays). */
function Screen({ route, immersive = false }: { route: Route; immersive?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const first = useRef(true)

  // Move focus to the new screen so screen readers announce the change (not on first load).
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const main = ref.current
    if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true }) // keep e.g. Search's autofocus
  }, [route])

  return (
    <main key={route} ref={ref} className="screen" data-immersive={immersive || undefined} tabIndex={-1}>
      {route === 'home' && <Home />}
      {route === 'search' && <Search />}
      {route === 'queue' && <Queue />}
      {route === 'now' && <NowPlaying />}
      {route === 'lyrics' && <LyricsScreen source="spotify" />}
      {route === 'lyrics-demo' && <LyricsScreen source="demo" />}
      {route === 'settings' && <Settings />}
    </main>
  )
}
