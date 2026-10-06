import { useState, type CSSProperties } from 'react'
import { tickLink } from '../app/router'
import { crateAdd } from '../history/service'
import { feedback } from '../sensory/feedback'
import { playUris } from '../spotify/playbackService'
import type { Action, Card, Figure } from '../stories/cards'
import type { RoomView } from '../stories/feed'
import type { Station } from '../stories/stations'
import { notify } from '../store/ui'
import { sharePoster } from '../poster/render'
import { Artwork } from './Artwork'
import { Icon } from './Icon'
import { PressKey } from './PressKey'
import { SaveKey } from './SaveKey'
import { requestSession } from './useFeed'
import { TapKey } from './TapKey'

function FigureView({ f }: { f: Figure }) {
  switch (f.kind) {
    case 'big':
      return (
        <div className="sto-figure">
          <span className="display sto-huge">{f.value}</span>
          <span className="serif sto-figure-say">{f.say}</span>
        </div>
      )
    case 'rows':
      return (
        <ol className="sto-rows">
          {f.rows.map((r, i) => (
            <li key={i}>
              <span className="readout">{String(i + 1).padStart(2, '0')}</span>
              <span className="sto-row-title">
                {r.title} {r.sub && <span className="serif">{r.sub}</span>}
              </span>
              <span className="readout">{r.trail}</span>
            </li>
          ))}
        </ol>
      )
    case 'columns': {
      const max = Math.max(1, ...f.bars.map((b) => b.value))
      return (
        <div className="sto-years" role="img" aria-label={f.bars.map((b) => `${b.label}: ${b.value}`).join(', ')}>
          {f.bars.map((b, i) => (
            <span key={b.label} className="sto-year" data-now={b.hot || i === f.bars.length - 1 || undefined}>
              <span className="sto-year-bar" style={{ '--h': b.value / max } as CSSProperties} />
              <span className="readout">{b.label}</span>
            </span>
          ))}
        </div>
      )
    }
    case 'meter':
      return (
        <ul className="sto-meter" role="img" aria-label={f.bars.map((b) => `${b.label}: ${Math.round(b.value * 100)}%`).join(', ')}>
          {f.bars.map((b) => (
            <li key={b.label} data-hot={b.hot || undefined}>
              <span className="readout sto-meter-label">{b.label}</span>
              <span className="sto-meter-track">
                <span className="sto-meter-fill" style={{ '--v': Math.max(0, Math.min(1, b.value)) } as CSSProperties} />
              </span>
              <span className="readout sto-meter-value">
                {Math.round(b.value * 100)}%{b.note ? <span className="sto-quiet"> · {b.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'path':
      return (
        <ol className="sto-path">
          {f.steps.map((s, i) => (
            <li key={i}>
              <span className="sto-path-label">{s.label}</span>
              {s.note && <span className="readout sto-quiet">{s.note}</span>}
            </li>
          ))}
        </ol>
      )
    case 'covers':
      return (
        <div className="sto-three">
          {f.tracks.map((t, i) => (
            <span key={t.uri} className="sto-three-item">
              {i > 0 && f.arrows && (
                <span className="readout" aria-hidden="true">
                  →
                </span>
              )}
              <Artwork src={t.art} alt={`${t.title} by ${t.artist}`} />
            </span>
          ))}
        </div>
      )
    case 'counts':
      return (
        <div className="sto-tally">
          {f.items.map((c) => (
            <span key={c.label} className="sto-tally-item">
              <span className="display">{c.value}</span>
              <span className="readout">{c.label}</span>
            </span>
          ))}
        </div>
      )
    case 'formula':
      return (
        <p className="sto-formula">
          {f.parts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="readout sto-plus"> + </span>}
              <span className="sto-formula-part">{p}</span>
            </span>
          ))}
          <span className="readout sto-plus"> = </span>
          <span className="display sto-formula-result">{f.result}</span>
        </p>
      )
  }
}

function ActionKey({ a, card, onDismiss }: { a: Action; card: Card; onDismiss: (id: string) => void }) {
  switch (a.kind) {
    case 'play':
      return (
        <PressKey className={a.primary !== false ? 'btn btn-primary' : 'btn'} depth={1} onClick={() => void playUris(a.uris, a.name)}>
          {a.primary !== false && <Icon name="play" size={18} />} {a.label}
        </PressKey>
      )
    case 'crate':
      return (
        <PressKey
          className="btn"
          depth={1}
          onClick={() => {
            feedback.play('crate-add')
            a.tracks.forEach(crateAdd)
            notify(`${a.tracks.length} records in the crate`)
          }}
        >
          {a.label}
        </PressKey>
      )
    case 'save':
      return <SaveKey name={a.name} description={a.description} uris={a.uris} label={a.label} isPublic={a.public} />
    case 'build': {
      const q = new URLSearchParams()
      if (a.risk) q.set('risk', a.risk)
      if (a.room) q.set('room', a.room)
      if (a.minutes) q.set('minutes', String(a.minutes))
      return (
        <a className="btn" href={`/stories/build${q.toString() ? `?${q.toString()}` : ''}`} onClick={tickLink}>
          {a.label}
        </a>
      )
    }
    case 'share':
      return (
        <PressKey
          className="btn"
          depth={1}
          onClick={() => {
            feedback.play('select')
            // A poster of the story where the device can share or save an image; the sentence otherwise.
            void sharePoster(card, a.text).then((how) => {
              if (how === 'saved') notify('Poster saved')
              else if (how === 'text') notify('Shared as text')
            })
          }}
        >
          {a.label}
        </PressKey>
      )
    case 'dismiss':
      return (
        <PressKey
          className="btn btn-quiet"
          depth={1}
          onClick={() => {
            feedback.play('back')
            onDismiss(card.id)
            notify('Set aside for three months')
          }}
        >
          {a.label}
        </PressKey>
      )
  }
}

/** Any story, as the artboards draw them: a legend, a headline, one serif sentence, evidence, keys. */
export function CardView({ card, onDismiss }: { card: Card; onDismiss: (id: string) => void }) {
  const [why, setWhy] = useState(false)
  return (
    <section className="sto" id={`story-${card.id}`} aria-label={card.kicker}>
      <span className="label">{card.kicker}</span>
      <p className="display sto-say">{card.headline}</p>
      {card.lede && <p className="serif sto-reply">{card.lede}</p>}
      {card.figures?.map((f, i) => (
        <FigureView key={i} f={f} />
      ))}
      {card.why && (
        <TapKey type="button" className="readout sto-whykey" aria-expanded={why}
          onClick={() => {
            feedback.play('toggle')
            setWhy((w) => !w)
          }}
        >
          {why ? '( why this? )' : 'why this?'}
        </TapKey>
      )}
      {why && card.why && <p className="serif sto-quiet">{card.why}</p>}
      <div className="sto-keys">
        {card.actions.map((a, i) => (
          <ActionKey key={i} a={a} card={card} onDismiss={onDismiss} />
        ))}
        {card.share && !card.actions.some((a) => a.kind === 'share') && <ActionKey a={{ kind: 'share', label: 'Share', text: card.share }} card={card} onDismiss={onDismiss} />}
      </div>
    </section>
  )
}

/** The day's DROP: shown only when something genuinely surprising turned up. */
export function Drop({ card }: { card: Card }) {
  return (
    <div className="sto-drop">
      <p className="label sto-drop-head">
        <span className="lamp" data-live aria-hidden="true" /> partydeck found something
      </p>
      <CardView card={card} onDismiss={() => {}} />
    </div>
  )
}

/** Your rooms: the library, by the sounds it actually contains. */
export function Rooms({ rooms, stations }: { rooms: RoomView[]; stations: Station[] }) {
  return (
    <section className="sto-rooms" aria-label="Your rooms">
      <h2 className="sto-depth">
        <span className="readout">( rooms )</span>
        <span className="serif">your library, by the sounds it actually contains</span>
      </h2>
      <ol className="sto-room-list">
        {rooms.slice(0, 8).map((r) => {
          const uris = stations.find((s) => s.id === r.id)?.uris ?? []
          const never = r.counts.adjacent + r.counts.experiment + r.counts.wild
          return (
            <li key={r.id} className="sto-room">
              <span className="display sto-room-name">{r.name}</span>
              <span className="serif sto-room-artists">{r.artists.slice(0, 4).join(', ')}</span>
              <span className="readout sto-room-meta">
                {r.tracks} tracks · {Math.round(r.share * 100)}% of your listening{r.band ? ` · ${r.band}` : ''} · {never} never played
              </span>
              <span className="sto-room-keys">
                <PressKey
                  className="btn btn-primary"
                  depth={1}
                  disabled={!uris.length}
                  onClick={() => {
                    feedback.play('primary-press') // in the gesture; the session is worked out next
                    void requestSession({ minutes: 30, risk: 'curious', seed: Date.now() % 997, uris }).then((t) => playUris(t.map((x) => x.uri), `${r.name}, 30 minutes`, { silent: true }))
                  }}
                >
                  <Icon name="play" size={18} /> 30 min
                </PressKey>
                <a className="btn" href={`/stories/build?room=${r.id}`} onClick={tickLink}>
                  Tune
                </a>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
