import { useReducedMotion } from 'motion/react'
import { useState, type CSSProperties } from 'react'
import { feedback } from '../sensory/feedback'
import { beginLogin } from '../spotify/auth'
import { isSpotifyConfigured, redirectOrigin, SPOTIFY_REDIRECT_URI } from '../spotify/config'
import { useSession } from '../store/session'
import { useSettings } from '../store/settings'
import { tickLink } from '../app/router'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { nextStep } from './flow'
import { PowerKey } from './PowerKey'

/**
 * Welcome → Connect. The first thing a new user touches is the showcase key:
 * it compresses, clicks, lights its ring and wakes the wordmark.
 */
export function Welcome({ startAt }: { startAt: 'welcome' | 'connect' }) {
  const [step, setStep] = useState(startAt)
  const [lit, setLit] = useState(startAt === 'connect')
  const reduce = useReducedMotion()

  const onContinue = () => {
    if (lit) return
    feedback.play('primary-press')
    setLit(true)
    useSettings.setState({ welcomed: true })
    // Let the ring sweep register before the panel changes (not a loading delay).
    const next = nextStep('welcome', 'continue', { connected: false, justConnected: false, welcomed: true, onboarded: false, phonePortrait: false })
    if (next === 'connect') setTimeout(() => setStep(next), reduce ? 0 : 420)
  }

  return (
    <main className="onboard" data-step={step} data-lit={lit || undefined}>
      <header className="onboard-top">
        <p className="onboard-state label">
          <span className="led" data-off={!lit || undefined} aria-hidden="true" />
          {lit ? 'On' : 'Standby'}
        </p>
        <a className="onboard-demo label" href="/lyrics/demo" onClick={tickLink}>
          Try the lyrics reader
          <Icon name="forward" size={14} />
        </a>
      </header>

      <div className="onboard-action" key={step}>
        {step === 'welcome' ? (
          <PowerKey label="Continue" icon="forward" lit={lit} onPress={onContinue} />
        ) : (
          <ConnectPanel focus={startAt === 'welcome'} />
        )}
      </div>

      <div className="onboard-mark">
        <Wordmark />
        <p className="onboard-tagline">Your music. Your deck. Any screen.</p>
      </div>
    </main>
  )
}

/** The wordmark as a display: each letter is a segment that warms up when power arrives. */
function Wordmark() {
  return (
    <h1 className="wordmark" aria-label="PartyDeck">
      {[...'PartyDeck'].map((ch, i) => (
        <span key={i} aria-hidden="true" style={{ '--i': i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </h1>
  )
}

/** `focus`: arrived by pressing Continue — keep keyboard and screen-reader focus with the flow. */
function ConnectPanel({ focus }: { focus: boolean }) {
  const notice = useSession((s) => s.notice)
  const [opening, setOpening] = useState(false)
  const ready = isSpotifyConfigured && window.location.origin === redirectOrigin

  const connect = async () => {
    feedback.play('primary-press')
    setOpening(true)
    try {
      await beginLogin()
    } catch {
      setOpening(false)
    }
  }

  return (
    <div className="connect">
      {notice && (
        <div className="notice" role="alert">
          <strong>{notice.title}</strong>
          {notice.detail && <span>{notice.detail}</span>}
        </div>
      )}
      <PressKey className="btn btn-primary btn-connect" onClick={connect} disabled={!ready || opening} depth={0.97} autoFocus={focus}>
        {opening ? 'Opening Spotify…' : 'Continue with Spotify'}
      </PressKey>
      <p className="fine">You sign in on Spotify's own page. Controlling playback needs Spotify Premium.</p>
      {!ready && <DeveloperSetup />}
    </div>
  )
}

/** Only for builds that aren't wired to a Spotify app yet — never part of the consumer path. */
function DeveloperSetup() {
  const wrongOrigin = isSpotifyConfigured && window.location.origin !== redirectOrigin
  return (
    <details className="dev-setup">
      <summary>Developer setup</summary>
      {wrongOrigin ? (
        <p>
          This build signs in through <a href={redirectOrigin}>{redirectOrigin}</a>. Open PartyDeck there.
        </p>
      ) : (
        <>
          <p>This build isn't linked to a Spotify app yet. Add these to <code>.env.local</code> and restart:</p>
          <pre>
            VITE_SPOTIFY_CLIENT_ID=your-client-id{'\n'}VITE_SPOTIFY_REDIRECT_URI={SPOTIFY_REDIRECT_URI}
          </pre>
          <p>
            Register <code>{SPOTIFY_REDIRECT_URI}</code> as a Redirect URI in the Spotify Developer Dashboard.
          </p>
        </>
      )}
    </details>
  )
}
