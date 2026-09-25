import { back } from '../app/router'
import { logout } from '../spotify/auth'
import { useSession } from '../store/session'
import { LYRIC_SIZES, useSettings, type Theme } from '../store/settings'
import { useUi } from '../store/ui'
import { Icon } from '../ui/Icon'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'graphite', label: 'Graphite' },
  { value: 'black', label: 'Black' },
]

export function Settings() {
  const name = useSession((s) => s.displayName)
  const { lyricSize, autoScroll, theme } = useSettings()

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => back('/')} aria-label="Back">
          <Icon name="back" />
        </button>
        <h1 className="page-title">Settings</h1>
        <span className="icon-btn-spacer" />
      </header>

      <section className="group" aria-labelledby="set-spotify">
        <h2 id="set-spotify" className="group-title">
          Spotify
        </h2>
        <div className="group-row">
          <span className="group-label">
            Connected{name ? ` as ${name}` : ''}
            <span className="group-detail">Disconnecting removes your Spotify sign-in and data from this device.</span>
          </span>
          <button className="btn btn-small btn-danger" onClick={() => logout()}>
            Disconnect
          </button>
        </div>
      </section>

      <section className="group" aria-labelledby="set-lyrics">
        <h2 id="set-lyrics" className="group-title">
          Lyrics
        </h2>
        <div className="group-row group-row-stack">
          <span className="group-label" id="lyric-size-label">
            Text size
          </span>
          <div className="seg" role="radiogroup" aria-labelledby="lyric-size-label">
            {LYRIC_SIZES.map((s, i) => (
              <label key={s.label}>
                <input type="radio" name="lyric-size" checked={lyricSize === i} onChange={() => useSettings.setState({ lyricSize: i })} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="group-row">
          <span className="group-label">
            Follow the current line
            <span className="group-detail">For timed lyrics. Scrolling yourself always pauses it.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={autoScroll}
            onChange={(e) => useSettings.setState({ autoScroll: e.target.checked })}
          />
        </label>
      </section>

      <section className="group" aria-labelledby="set-theme">
        <h2 id="set-theme" className="group-title">
          Theme
        </h2>
        <div className="group-row">
          <span className="group-label" id="theme-label">
            Screen
            <span className="group-detail">Black is best for OLED phones and TVs.</span>
          </span>
          <div className="seg" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((t) => (
              <label key={t.value}>
                <input type="radio" name="theme" checked={theme === t.value} onChange={() => useSettings.setState({ theme: t.value })} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="set-install">
        <h2 id="set-install" className="group-title">
          App
        </h2>
        <InstallRow />
      </section>

      <section className="group" aria-labelledby="set-about">
        <h2 id="set-about" className="group-title">
          About
        </h2>
        <div className="group-row">
          <span className="group-label">
            PartyDeck
            <span className="group-detail">
              Music, artwork and metadata come from Spotify. PartyDeck is an independent app, not made by or affiliated with Spotify.
            </span>
          </span>
        </div>
        <div className="group-row">
          <span className="group-label">Version</span>
          <span className="group-value">{__APP_VERSION__}</span>
        </div>
      </section>
    </div>
  )
}

function InstallRow() {
  const prompt = useUi((s) => s.installPrompt)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (standalone) {
    return (
      <div className="group-row">
        <span className="group-label">
          Installed
          <span className="group-detail">PartyDeck is running as an app.</span>
        </span>
      </div>
    )
  }
  if (prompt) {
    return (
      <div className="group-row">
        <span className="group-label">
          Install PartyDeck
          <span className="group-detail">Opens full screen, without browser controls.</span>
        </span>
        <button
          className="btn btn-small"
          onClick={async () => {
            await prompt.prompt()
            await prompt.userChoice
            useUi.setState({ installPrompt: null })
          }}
        >
          Install
        </button>
      </div>
    )
  }
  return (
    <div className="group-row">
      <span className="group-label">
        Install PartyDeck
        <span className="group-detail">
          {ios ? 'In Safari, tap Share, then Add to Home Screen.' : "Use your browser's Install app option in the address bar or menu."}
        </span>
      </span>
    </div>
  )
}
