import { useState } from 'react'
import { linkHandler } from '../app/router'
import { beginLogin } from '../spotify/auth'
import { isSpotifyConfigured, redirectOrigin, SPOTIFY_REDIRECT_URI } from '../spotify/config'
import { useSession } from '../store/session'

/** The standby screen: shown until Spotify is connected. */
export function Connect() {
  const notice = useSession((s) => s.notice)
  const [opening, setOpening] = useState(false)
  const wrongOrigin = isSpotifyConfigured && window.location.origin !== redirectOrigin

  const connect = async () => {
    setOpening(true)
    try {
      await beginLogin()
    } catch {
      setOpening(false)
    }
  }

  return (
    <main className="standby">
      <div className="standby-center">
        <h1 className="wordmark">
          <span className="led" aria-hidden="true" />
          PartyDeck
        </h1>
        <p className="standby-lede">Now Playing, queue and a big lyrics reader for your Spotify.</p>

        {notice && (
          <div className="notice" role="alert">
            <strong>{notice.title}</strong>
            {notice.detail && <span>{notice.detail}</span>}
          </div>
        )}

        {!isSpotifyConfigured ? (
          <div className="setup">
            <p>
              <strong>Add your Spotify Client ID to start.</strong>
            </p>
            <p>
              Create an app in the Spotify Developer Dashboard, then put this in <code>.env.local</code> and restart the dev server:
            </p>
            <pre>
              VITE_SPOTIFY_CLIENT_ID=your-client-id{'\n'}VITE_SPOTIFY_REDIRECT_URI={SPOTIFY_REDIRECT_URI}
            </pre>
            <p>
              Register <code>{SPOTIFY_REDIRECT_URI}</code> as a Redirect URI in the app's settings.
            </p>
          </div>
        ) : wrongOrigin ? (
          <p className="setup">
            Spotify sends you back to <a href={redirectOrigin}>{redirectOrigin}</a>. Open PartyDeck there to connect.
          </p>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={connect} disabled={opening}>
            {opening ? 'Opening Spotify…' : 'Connect Spotify'}
          </button>
        )}

        <p className="fine">Playback control needs Spotify Premium and Spotify open on one of your devices.</p>
      </div>
      <a className="btn btn-quiet" href="/lyrics/demo" onClick={linkHandler}>
        Try the lyrics reader
      </a>
    </main>
  )
}
