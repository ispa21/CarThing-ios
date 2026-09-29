import { useEffect, useState, type CSSProperties } from 'react'
import { crateDuration, CRATE_TTL_MS } from '../history/crate'
import { crateEmpty, crateRemove, crateRename, crateSaved, loadHistory } from '../history/service'
import type { CrateItem } from '../history/types'
import { linkHandler } from '../app/router'
import { formatTime } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import { hasScope } from '../spotify/auth'
import { playUris, saveAsPlaylist } from '../spotify/playbackService'
import { useHistory } from '../store/history'
import { Artwork } from '../ui/Artwork'
import { EmptyState } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { ReconnectButton } from '../ui/ReconnectButton'
import { SpotifyLink } from '../ui/SpotifyLink'
import { useRecordColours } from '../ui/useRecordColours'

const TABS = 11

/**
 * CRATE: what you're into right now, not everything you own. Records go in with the
 * crate key (library, queue, the deck's options). It lives on this device and empties
 * itself of records older than two weeks unless you save it as a playlist.
 */
export function Crate() {
  const { crate, loaded } = useHistory()
  const [saved, setSaved] = useState<{ uri: string; url: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const [openedAt] = useState(() => Date.now())
  useEffect(() => void loadHistory(), [])
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  const [front, ...behind] = crate.items
  const minutes = Math.round(crateDuration(crate) / 60_000)
  const uris = crate.items.map((i) => i.uri)

  return (
    <div className="crate" data-empty={!crate.items.length || undefined}>
      <h1 className="sr-only">Crate</h1>
      <div className="crate-object" aria-hidden={!front || undefined}>
        <div className="crate-tabs">
          {behind
            .slice(0, TABS)
            .reverse()
            .map((item, i, list) => (
              <Divider key={item.uri} item={item} index={crate.items.indexOf(item)} depth={list.length - i} />
            ))}
        </div>
        {front && (
          <span key={front.uri} className="crate-front" data-fresh={openedAt - front.addedAt < 8000 || undefined}>
            <Artwork src={front.art} alt={`${front.title}, at the front of the crate`} />
          </span>
        )}
        <div className="crate-body">
          <span className="crate-handle" aria-hidden="true" />
          <span className="display crate-stencil">CRATE / 01</span>
          <span className="readout crate-body-meta">
            {crate.name.toLowerCase()} · {crate.items.length} records · {minutes} min
          </span>
        </div>
      </div>

      <section className="crate-side" aria-label="Crate contents">
        <span className="readout">crate / 01</span>
        <label className="crate-name">
          <span className="sr-only">Crate name</span>
          <input className="display" defaultValue={crate.name} key={loaded ? 'loaded' : 'loading'} maxLength={60} onBlur={(e) => crateRename(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        </label>
        <p className="serif crate-lede">What you're into right now, not everything you own.</p>

        {!crate.items.length ? (
          <EmptyState title="The crate is empty" detail="Drop records in with the crate key — in the library, in the queue, or from the deck's options.">
            <a className="btn" href="/search" onClick={linkHandler}>
              Library
            </a>
          </EmptyState>
        ) : (
          <>
            <ol className="rows crate-rows">
              {crate.items.map((item, i) => (
                <li key={item.uri} className="row" data-front={i === 0 || undefined}>
                  <span className="row-main">
                    <span className="row-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="row-text">
                      <span className="row-title">{item.title}</span>
                      <span className="row-sub">{item.artist}</span>
                    </span>
                  </span>
                  <span className="row-time readout">{formatTime(item.durationMs)}</span>
                  <button
                    className="icon-btn"
                    aria-label={`Take ${item.title} out of the crate`}
                    onClick={() => {
                      feedback.play('back')
                      crateRemove(item.uri)
                    }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </li>
              ))}
            </ol>
            <div className="crate-actions">
              <PressKey className="btn btn-primary" depth={1} onClick={() => void playUris(uris, crate.name)}>
                <Icon name="play" size={18} /> Play crate
              </PressKey>
              {saved ? (
                <SpotifyLink className="btn" uri={saved.uri} url={saved.url} label={`Open ${crate.name} in Spotify`}>
                  Saved — open in Spotify
                </SpotifyLink>
              ) : hasScope('playlist-modify-private') ? (
                <PressKey
                  className="btn"
                  depth={1}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    const r = await saveAsPlaylist(crate.name, 'A crate from PartyDeck: what I was into right now.', uris)
                    setBusy(false)
                    if (r) {
                      setSaved(r)
                      crateSaved()
                    }
                  }}
                >
                  {busy ? 'Saving…' : 'Save as playlist'}
                </PressKey>
              ) : (
                <ReconnectButton label="Reconnect to save playlists" />
              )}
              <button
                className="btn btn-danger"
                data-armed={armed || undefined}
                onClick={() => {
                  if (!armed) {
                    feedback.play('select')
                    setArmed(true)
                    return
                  }
                  feedback.play('back')
                  setArmed(false)
                  setSaved(null)
                  crateEmpty()
                }}
              >
                {armed ? 'Press again to tip it out' : 'Tip it out'}
              </button>
            </div>
            <p className="readout crate-note">
              kept on this device · {crate.savedAt ? 'saved, so it stays' : `empties itself after ${CRATE_TTL_MS / 86_400_000} days unless saved`}
            </p>
          </>
        )}
      </section>
    </div>
  )
}

/** A record behind the front one: a divider tab in its cover's colour (the cover itself isn't cut). */
function Divider({ item, index, depth }: { item: CrateItem; index: number; depth: number }) {
  const colour = useRecordColours(item.art)?.record ?? '#8f897b'
  return (
    <span className="crate-tab" style={{ '--c': colour, '--d': depth } as CSSProperties}>
      <span>
        {String(index + 1).padStart(2, '0')} {item.title.toLowerCase()}
      </span>
      <span>{formatTime(item.durationMs)}</span>
    </span>
  )
}
