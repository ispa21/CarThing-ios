import { useEffect, useState, type CSSProperties } from 'react'
import { tickLink } from '../app/router'
import { crateAdd } from '../history/service'
import { feedback } from '../sensory/feedback'
import { playUris } from '../spotify/playbackService'
import { RISKS, RISK_SHARES, type Risk, type SessionTrack } from '../stories/session'
import { notify } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { LibraryFeed } from '../ui/LibraryFeed'
import { PressKey } from '../ui/PressKey'
import { SaveKey } from '../ui/SaveKey'
import { requestSession, useFeed } from '../ui/useFeed'
import { TapKey } from '../ui/TapKey'

const TIMES = [15, 30, 45, 60, 90]
type Source = 'liked' | 'playlists' | 'everything'
const SOURCES: Source[] = ['liked', 'playlists', 'everything']
const ANY = 'surprise me'

function fromQuery() {
  const q = new URLSearchParams(window.location.search)
  const minutes = Number(q.get('minutes'))
  const risk = q.get('risk') as Risk | null
  return { minutes: TIMES.includes(minutes) ? minutes : 30, risk: risk && RISKS.includes(risk) ? risk : 'curious', room: q.get('room') }
}

/**
 * The session builder: time, how much uncertainty you want, a room and a source — and
 * the headline rewrites itself as you turn them. Only ever picks from music you already
 * have, and orders it as an arc: familiar in, the unknowns in the middle, a favourite to land.
 */
export function Builder() {
  const { loaded, view, seed, hasLibrary } = useFeed()
  const rooms = view?.stations ?? []
  const [initial] = useState(fromQuery)
  const [minutes, setMinutes] = useState(initial.minutes)
  const [mix, setMix] = useState<Risk>(initial.risk)
  const [roomId, setRoomId] = useState<string | null>(initial.room)
  const [source, setSource] = useState<Source>('everything')
  const room = rooms.find((r) => r.id === roomId) ?? null
  const name = room?.name ?? ANY
  const [built, setBuilt] = useState<{ key: string; tracks: SessionTrack[] } | null>(null)
  const key = `${minutes}|${mix}|${source}|${room?.id ?? ''}|${view ? 'v' : ''}`

  useEffect(() => {
    if (!view) return
    let live = true
    void requestSession({ minutes, risk: mix, source, seed, uris: room?.uris }).then((tracks) => live && setBuilt({ key, tracks }))
    return () => {
      live = false
    }
  }, [view, minutes, mix, source, seed, room, key])

  const session = built?.tracks ?? []
  const counts = { familiar: 0, forgotten: 0, never: 0 }
  for (const t of session) counts[t.bucket === 'core' || t.bucket === 'familiar' ? 'familiar' : t.bucket === 'rediscovery' ? 'forgotten' : 'never']++
  const n = session.length
  const pct = (k: keyof typeof counts) => (n ? (counts[k] / n) * 100 : 0)
  const title = `${minutes} min of ${name}`
  const shares = RISK_SHARES[mix]
  const aimNew = Math.round((shares.adjacent + shares.experiment + shares.wild) * 100)
  const hasMusic = hasLibrary || Boolean(view?.saved) || Boolean(view?.core)

  return (
    <div className="bld">
      <header className="bld-top">
        <span className="readout">pd—01 · session builder</span>
        <a className="readout bld-back" href="/stories" onClick={tickLink}>
          ( back to stories )
        </a>
      </header>
      <h1 className="display bld-title" aria-live="polite">
        {minutes} min of
        <br />
        {name}
      </h1>

      <div className="bld-controls">
        <div className="bld-row">
          <span className="label" id="bld-time">
            time
          </span>
          <div role="radiogroup" aria-labelledby="bld-time" className="bld-times">
            {TIMES.map((t) => (
              <PressKey
                key={t}
                className="btn bld-time"
                depth={1}
                role="radio"
                aria-checked={t === minutes}
                onClick={() => {
                  feedback.play('select')
                  setMinutes(t)
                }}
              >
                <span className="readout">{t}</span>
              </PressKey>
            ))}
          </div>
        </div>
        <div className="bld-row">
          <span className="label">mix</span>
          <div className="bld-mix">
            <span className="readout">safe</span>
            <input
              className="bld-fader"
              type="range"
              min={0}
              max={3}
              step={1}
              value={RISKS.indexOf(mix)}
              aria-label="How much uncertainty"
              aria-valuetext={mix}
              onChange={(e) => {
                const v = Number(e.target.value)
                // A detent per level; safe and chaos are end stops.
                feedback.play(v === 0 || v === RISKS.length - 1 ? 'edge' : 'detent')
                setMix(RISKS[v])
              }}
            />
            <span className="readout">chaos</span>
            <span className="readout bld-mix-word">( {mix} )</span>
          </div>
        </div>
        <div className="bld-row">
          <span className="label" id="bld-room">
            room
          </span>
          <div role="radiogroup" aria-labelledby="bld-room" className="bld-words">
            {[...rooms.map((r) => ({ id: r.id as string | null, label: r.name })), { id: null, label: ANY }].map((r) => (
              <TapKey
                key={r.id ?? 'any'}
                type="button"
                className="bld-word readout"
                role="radio"
                aria-checked={r.id === roomId}
                onClick={() => {
                  feedback.play('select')
                  setRoomId(r.id)
                }}
              >
                {r.id === roomId ? `( ${r.label} )` : r.label}
              </TapKey>
            ))}
          </div>
        </div>
        <div className="bld-row bld-row-last">
          <span className="label" id="bld-from">
            from
          </span>
          <div role="radiogroup" aria-labelledby="bld-from" className="bld-words">
            {SOURCES.map((s) => (
              <TapKey
                key={s}
                type="button"
                className="bld-word readout"
                role="radio"
                aria-checked={s === source}
                onClick={() => {
                  feedback.play('select')
                  setSource(s)
                }}
              >
                {s === source ? `( ${s} )` : s}
              </TapKey>
            ))}
          </div>
        </div>
      </div>

      <section className="bld-out" aria-label="What comes out">
        <span className="label">out</span>
        <span className="display bld-count">{n === 1 ? '1 record' : `${n} records`}</span>
        <div className="bld-split" role="img" aria-label={`${counts.familiar} familiar, ${counts.forgotten} forgotten, ${counts.never} never played. Aiming for ${aimNew}% never played.`}>
          <span data-kind="familiar" style={{ '--w': pct('familiar') } as CSSProperties} />
          <span data-kind="forgotten" style={{ '--w': pct('forgotten') } as CSSProperties} />
          <span data-kind="never" style={{ '--w': pct('never') } as CSSProperties} />
        </div>
        <div className="readout bld-legend">
          <span>■ familiar {counts.familiar}</span>
          <span className="bld-quiet">■ forgotten {counts.forgotten}</span>
          <span>▨ never played {counts.never}</span>
        </div>
        <p className="serif bld-note">“Never played” means saved and never pressed. PartyDeck only ever picks from music you already have, and plays it as an arc: something familiar in, the unknowns in the middle, a favourite to land.</p>
      </section>

      <div className="bld-foot">
        <div className="bld-covers" style={{ '--n': Math.min(n, 12) } as CSSProperties}>
          {session.slice(0, 12).map((t) => (
            <Artwork key={t.uri} src={t.art} alt="" />
          ))}
        </div>
        {n > 0 ? (
          <div className="bld-keys">
            <PressKey className="btn btn-primary" depth={1} onClick={() => void playUris(session.map((t) => t.uri), title)}>
              <Icon name="play" size={18} /> Play
            </PressKey>
            <SaveKey name={title} description="A session built with PartyDeck from music I already have." uris={session.map((t) => t.uri)} label="Save" />
            <PressKey
              className="btn"
              depth={1}
              onClick={() => {
                feedback.play('crate-add')
                session.forEach(crateAdd)
                notify(`${n} records in the crate`)
              }}
            >
              Crate it
            </PressKey>
          </div>
        ) : (
          loaded &&
          built?.key === key && (
            <p className="serif bld-empty" role="status">
              {hasMusic ? `Nothing in ${name} from ${source}. Try another room, or everything.` : 'Nothing to build from yet. Read your library below.'}
            </p>
          )
        )}
      </div>
      {!hasLibrary && <LibraryFeed />}
    </div>
  )
}
