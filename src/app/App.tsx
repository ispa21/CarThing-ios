import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { initialStep } from '../onboarding/flow'
import { Onboarding } from '../onboarding/Onboarding'
import { Tutorial } from '../onboarding/Tutorial'
import { Welcome } from '../onboarding/Welcome'
import { Callback } from '../screens/Callback'
import { LyricsScreen } from '../screens/Lyrics'
import { NowPlaying } from '../screens/NowPlaying'
import { Queue } from '../screens/Queue'
import { Search } from '../screens/Search'
import { Settings } from '../screens/Settings'
import { startPlaybackSync, stopPlaybackSync } from '../spotify/playbackService'
import { useSession } from '../store/session'
import { THEME_COLORS, useSettings } from '../store/settings'
import { Toaster } from '../ui/Feedback'
import { useRecordColours } from '../ui/useRecordColours'
import { usePlayback } from '../store/playback'
import { DeviceSheet } from './DeviceSheet'
import { RAIL_MODES, RAIL_TABS } from './nav'
import { Rail } from './Rail'
import { matchRoute, navigate, usePathname, type Route } from './router'
import { useShortcuts } from './shortcuts'

const TITLES: Record<Route, string> = {
  now: 'PartyDeck',
  search: 'Search · PartyDeck',
  queue: 'Queue · PartyDeck',
  lyrics: 'Lyrics · PartyDeck',
  'lyrics-demo': 'Lyrics demo · PartyDeck',
  settings: 'Settings · PartyDeck',
  callback: 'Connecting · PartyDeck',
  tutorial: 'Tutorial · PartyDeck',
}

/** Full-screen routes without the rail. */
const IMMERSIVE: Route[] = ['lyrics-demo', 'tutorial']

export function App() {
  const route = matchRoute(usePathname())
  const connected = useSession((s) => s.connected)
  const justConnected = useSession((s) => s.justConnected)
  const theme = useSettings((s) => s.theme)
  const welcomed = useSettings((s) => s.welcomed)
  const hasNotice = useSession((s) => s.notice !== null)
  const onboarded = useSettings((s) => s.onboarded)
  // Where the user is comes from the tested state machine (onboarding/flow.ts).
  // A notice (declined, expired, not allow-listed…) belongs next to the Connect button.
  const step = initialStep({ connected, justConnected, welcomed: welcomed || hasNotice, onboarded, phonePortrait: false })
  const onboarding = step === 'connected'

  // No global shortcuts while onboarding or practising: Space must not pause your real music.
  useShortcuts(route, connected, !onboarding && route !== 'tutorial')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  let content
  if (route === 'callback') content = <Callback />
  else if (connected) content = <ConnectedApp route={route} onboarding={onboarding} />
  else if (route === 'lyrics-demo')
    content = (
      <div className="shell" data-immersive>
        <Screen route={route} immersive />
      </div>
    )
  else content = <Welcome startAt={step === 'welcome' ? 'welcome' : 'connect'} />

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        {content}
        <Toaster />
      </MotionConfig>
    </LazyMotion>
  )
}

function ConnectedApp({ route, onboarding }: { route: Route; onboarding: boolean }) {
  // Sync runs through onboarding too, so the deck wakes with your current track.
  useEffect(() => {
    startPlaybackSync()
    return stopPlaybackSync
  }, [])

  if (onboarding)
    return (
      <div className="shell" data-immersive>
        <Onboarding />
      </div>
    )

  const immersive = IMMERSIVE.includes(route)
  return (
    <div className="shell" data-immersive={immersive || undefined} data-route={route}>
      <RecordLight />
      {!immersive && <Rail route={route} />}
      <Screen route={route} immersive={immersive} />
      <DeviceSheet />
    </div>
  )
}

/**
 * The one colour that isn't ours: sampled from the cover that's playing and set on
 * :root, where the lamp, the slab behind the art and the lyrics flood read it.
 * The cover itself is never touched. Registered as a <color> (tokens.css), so it
 * cross-fades between tracks instead of snapping.
 */
function RecordLight() {
  const art = usePlayback((s) => (s.hasPlayback ? s.playback.albumArt : null))
  const colours = useRecordColours(art)
  useEffect(() => {
    const root = document.documentElement.style
    if (colours) {
      root.setProperty('--record', colours.record)
      root.setProperty('--record-deep', colours.deep)
    } else {
      root.removeProperty('--record')
      root.removeProperty('--record-deep')
    }
  }, [colours])
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--record')
      document.documentElement.style.removeProperty('--record-deep')
    },
    [],
  )
  return null
}

/** The rail's order, left to right: screens enter from the side you travelled toward. */
const RAIL_ORDER: Route[] = [...RAIL_TABS, ...RAIL_MODES].map((t) => t.route)

function direction(from: Route, to: Route): 'forward' | 'back' | undefined {
  const a = RAIL_ORDER.indexOf(from)
  const b = RAIL_ORDER.indexOf(to)
  if (a < 0 || b < 0 || a === b) return undefined
  return b > a ? 'forward' : 'back'
}

/** Keyed per route so each screen mounts fresh (scroll resets, enter animation plays). */
function Screen({ route, immersive = false }: { route: Route; immersive?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const first = useRef(true)
  // Where we came from decides which way the new screen enters (state adjusted during render).
  const [nav, setNav] = useState<{ route: Route; dir?: 'forward' | 'back' }>({ route })
  if (nav.route !== route) setNav({ route, dir: direction(nav.route, route) })

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
    <main key={route} ref={ref} className="screen" data-immersive={immersive || undefined} data-route={route} data-dir={nav.dir} tabIndex={-1}>
      {route === 'now' && <NowPlaying />}
      {route === 'search' && <Search />}
      {route === 'queue' && <Queue />}
      {route === 'lyrics' && <LyricsScreen source="spotify" />}
      {route === 'lyrics-demo' && <LyricsScreen source="demo" />}
      {route === 'settings' && <Settings />}
      {route === 'tutorial' && (
        <Tutorial
          onFinish={() => {
            useSettings.setState({ onboarded: true })
            navigate('/', { replace: true })
          }}
        />
      )}
    </main>
  )
}
