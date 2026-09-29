import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { FullscreenButton } from '../ui/FullscreenButton'
import { back, navigate } from '../app/router'
import { canOfferFullscreen, isStandalone } from '../lib/fullscreen'
import { feedback, hapticsAvailable } from '../sensory/feedback'
import { logout } from '../spotify/auth'
import { useSession } from '../store/session'
import { LYRIC_SIZES, useSettings, type Theme } from '../store/settings'
import { useUi } from '../store/ui'
import { Icon } from '../ui/Icon'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'plate', label: 'Plate' },
  { value: 'night', label: 'Night' },
]

type BoolSetting = 'sound' | 'haptics' | 'autoScroll'

function setFlag(key: BoolSetting, value: boolean) {
  useSettings.setState({ [key]: value })
  feedback.play('toggle') // after the change: turning sound on is confirmed by hearing it
}

export function Settings() {
  const name = useSession((s) => s.displayName)
  const { lyricSize, autoScroll, theme, sound, haptics } = useSettings(
    useShallow((s) => ({ lyricSize: s.lyricSize, autoScroll: s.autoScroll, theme: s.theme, sound: s.sound, haptics: s.haptics })),
  )

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <button
          className="icon-btn"
          onClick={() => {
            feedback.play('back')
            back('/')
          }}
          aria-label="Back"
        >
          <Icon name="back" />
        </button>
        <h1 className="page-title">Settings</h1>
        <span className="icon-btn-spacer" />
      </header>

      <section className="group" aria-labelledby="set-spotify">
        <h2 id="set-spotify" className="group-title label">
          Spotify
        </h2>
        <div className="group-rows">
          <div className="group-row">
            <span className="group-label">
              Connected{name ? ` as ${name}` : ''}
              <span className="group-detail">Disconnecting removes your Spotify sign-in and data from this device.</span>
            </span>
            <DisconnectButton />
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="set-feel">
        <h2 id="set-feel" className="group-title label">
          Feel
        </h2>
        <div className="group-rows">
          <Switch label="Sound" detail="Quiet clicks and ticks for controls. Mixes under your music." checked={sound} onChange={(v) => setFlag('sound', v)} />
          {hapticsAvailable() && (
            <Switch label="Haptics" detail="Taps you can feel on supported phones." checked={haptics} onChange={(v) => setFlag('haptics', v)} />
          )}
        </div>
      </section>

      <section className="group" aria-labelledby="set-lyrics">
        <h2 id="set-lyrics" className="group-title label">
          Lyrics
        </h2>
        <div className="group-rows">
          <div className="group-row group-row-stack">
            <span className="group-label" id="lyric-size-label">
              Text size
            </span>
            <Segmented
              name="lyric-size"
              labelledBy="lyric-size-label"
              options={LYRIC_SIZES.map((s, i) => ({ value: i, label: s.label }))}
              value={lyricSize}
              onChange={(i) => useSettings.setState({ lyricSize: i })}
            />
          </div>
          <Switch
            label="Follow the current line"
            detail="For timed lyrics. Scrolling yourself always pauses it."
            checked={autoScroll}
            onChange={(v) => setFlag('autoScroll', v)}
          />
        </div>
      </section>

      <section className="group" aria-labelledby="set-display">
        <h2 id="set-display" className="group-title label">
          Display
        </h2>
        <div className="group-rows">
          <div className="group-row">
            <span className="group-label" id="theme-label">
              Screen
              <span className="group-detail">Black is best for OLED phones and TVs.</span>
            </span>
            <Segmented name="theme" labelledBy="theme-label" options={THEMES} value={theme} onChange={(t) => useSettings.setState({ theme: t })} />
          </div>
          {canOfferFullscreen() && (
            <div className="group-row">
              <span className="group-label">
                Full screen
                <span className="group-detail">Fullscreen gives PartyDeck the complete display.</span>
              </span>
              <FullscreenButton />
            </div>
          )}
        </div>
      </section>

      <section className="group" aria-labelledby="set-app">
        <h2 id="set-app" className="group-title label">
          App
        </h2>
        <div className="group-rows">
          <InstallRow />
          <div className="group-row">
            <span className="group-label">
              Tutorial
              <span className="group-detail">A 20-second walkthrough on a silent practice deck.</span>
            </span>
            <button
              className="btn btn-small"
              onClick={() => {
                feedback.play('select')
                navigate('/tutorial')
              }}
            >
              Replay
            </button>
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="set-about">
        <h2 id="set-about" className="group-title label">
          About
        </h2>
        <div className="group-rows">
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
            <span className="readout">{__APP_VERSION__}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Disconnecting deletes the sign-in, so it takes two presses: the first arms it for a few seconds. */
function DisconnectButton() {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      className="btn btn-small btn-danger"
      data-armed={armed || undefined}
      aria-live="polite"
      onClick={() => {
        if (!armed) {
          feedback.play('warning')
          setArmed(true)
          return
        }
        feedback.play('spotify-disconnected')
        logout()
      }}
    >
      {armed ? 'Press again to disconnect' : 'Disconnect'}
    </button>
  )
}

function Switch({ label, detail, checked, onChange }: { label: string; detail?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="group-row">
      <span className="group-label">
        {label}
        {detail && <span className="group-detail">{detail}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Segmented<T extends string | number>({
  name,
  labelledBy,
  options,
  value,
  onChange,
}: {
  name: string
  labelledBy: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      className="seg"
      role="radiogroup"
      aria-labelledby={labelledBy}
      style={{ '--i': Math.max(0, options.findIndex((o) => o.value === value)), '--n': options.length } as CSSProperties}
    >
      {options.map((o) => (
        <label key={o.label}>
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => {
              feedback.play('select')
              onChange(o.value)
            }}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function InstallRow() {
  const prompt = useUi((s) => s.installPrompt)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isStandalone()) {
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
            feedback.play('select')
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
