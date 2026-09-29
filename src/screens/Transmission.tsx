import { useMemo, useState, type CSSProperties } from 'react'
import { feedback } from '../sensory/feedback'
import { playUris } from '../spotify/playbackService'
import { rng, shuffle } from '../stories/stats'
import { broadcast } from '../stories/stations'
import { Artwork } from '../ui/Artwork'
import { EmptyState } from '../ui/Feedback'
import { LibraryFeed } from '../ui/LibraryFeed'
import { PressKey } from '../ui/PressKey'
import { useRecordColours } from '../ui/useRecordColours'
import { useStoryInputs } from '../ui/useStoryInputs'

const LO = 87.5
const HI = 108
const at = (f: number) => (f - LO) / (HI - LO)
const LABELS = Array.from({ length: 11 }, (_, i) => 88 + i * 2)

/** The signal: a hill at each station, as tall as its share of your library. */
function signalPath(stations: Array<{ freq: number; size: number }>) {
  const biggest = Math.max(1, ...stations.map((s) => s.size))
  let d = 'M 0 120 '
  for (let k = 0; k <= 205; k++) {
    const f = LO + k * 0.1
    let v = 0
    for (const s of stations) {
      const dd = (f - s.freq) / 0.55
      v += (s.size / biggest) * Math.exp(-dd * dd)
    }
    const noise = (((k * 7919) % 13) / 13) * 0.07 // a little static between stations
    d += `L ${(at(f) * 1000).toFixed(1)} ${(120 - Math.min(118, (v + noise) * 110)).toFixed(1)} `
  }
  return `${d}L 1000 120 Z`
}

/**
 * TRANSMISSION: radio stations built from your own library — clusters of artists that
 * keep sharing playlists and sessions, plus the stations your stories found. Tune with
 * the keys; put one on air to play it.
 */
export function Transmission() {
  const { loaded, inputs, library, seed } = useStoryInputs()
  const stations = useMemo(() => broadcast(inputs, library?.playlists ?? [], seed), [inputs, library, seed])
  const byUri = useMemo(() => new Map([...inputs.library, ...inputs.plays].map((t) => [t.uri, t])), [inputs])
  const [index, setIndex] = useState(0)
  const [onAir, setOnAir] = useState<string | null>(null)
  const path = useMemo(() => signalPath(stations.map((s) => ({ freq: s.freq, size: s.uris.length }))), [stations])

  const i = Math.min(index, Math.max(0, stations.length - 1))
  const cur = stations[i]
  const next = stations[(i + 1) % Math.max(1, stations.length)]
  const cover = cur ? cur.uris.map((u) => byUri.get(u)).find((t) => t?.art) : undefined
  const colours = useRecordColours(cover?.art ?? null)

  if (!loaded) return null
  if (!cur)
    return (
      <div className="tx tx-empty">
        <h1 className="sr-only">Transmission</h1>
        <EmptyState title="No stations yet" detail="Stations are built from your own library: artists that keep turning up in the same playlists and sessions. Read your library to tune in." />
        <LibraryFeed />
      </div>
    )

  const tune = (d: number) => {
    feedback.play('tick')
    setIndex((i + d + stations.length) % stations.length)
  }

  return (
    <div className="tx" style={colours ? ({ '--station': colours.record } as CSSProperties) : undefined}>
      <h1 className="sr-only">Transmission</h1>
      <div className="tx-now" aria-live="polite">
        <span className="readout">
          transmission {String(i + 1).padStart(2, '0')} · {onAir === cur.id ? 'on air' : 'now tuned'} · {cur.freq.toFixed(1)} mhz
        </span>
        <p className="display tx-name">{cur.name}</p>
        <p className="serif tx-about">{cur.about}</p>
      </div>
      <figure className="tx-cover">
        <span className="tx-cover-block" aria-hidden="true" />
        <Artwork src={cover?.art ?? null} alt={cover ? `${cover.title} cover` : ''} />
        {cover && (
          <figcaption className="readout">
            {onAir === cur.id ? 'on air' : 'first up'}: {cover.title.toLowerCase()} — {cover.artist.toLowerCase()}
          </figcaption>
        )}
      </figure>

      <div className="tx-dial" role="group" aria-label={`Frequency dial, ${stations.length} stations`}>
        <svg className="tx-signal" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} />
        </svg>
        <span className="tx-scale" aria-hidden="true" />
        {LABELS.map((f) => (
          <span key={f} className="readout tx-label" style={{ '--x': at(f) } as CSSProperties} aria-hidden="true">
            {f}
          </span>
        ))}
        {stations.map((s, k) => (
          <button
            key={s.id}
            type="button"
            className="readout tx-station"
            aria-pressed={k === i}
            style={{ '--x': at(s.freq) } as CSSProperties}
            onClick={() => {
              feedback.play('select')
              setIndex(k)
            }}
          >
            {s.freq.toFixed(1)} <span className="tx-station-name">{s.name}</span>
          </button>
        ))}
        <span className="tx-needle-track" style={{ '--x': at(cur.freq) } as CSSProperties} aria-hidden="true">
          <span className="tx-needle" />
        </span>
      </div>

      <dl className="tx-info">
        <dt className="label">source</dt>
        <dd className="readout">{cur.source}</dd>
        <dt className="label">next signal</dt>
        <dd className="readout">{stations.length > 1 ? `${next.freq.toFixed(1)} · ${next.name}` : 'none — this is the only one'}</dd>
      </dl>
      <p className="serif tx-note">Every station is built from your own library. Taller signal means a bigger cluster.</p>

      <div className="tx-keys">
        {stations.length > 1 && (
          <>
            <PressKey className="btn tx-tune" depth={1} onClick={() => tune(-1)} aria-label="Tune down to the previous station">
              <span className="readout">◄ tune</span>
            </PressKey>
            <PressKey className="btn tx-tune" depth={1} onClick={() => tune(1)} aria-label="Tune up to the next station">
              <span className="readout">tune ►</span>
            </PressKey>
          </>
        )}
        <PressKey
          className="btn btn-primary"
          depth={1}
          aria-pressed={onAir === cur.id}
          onClick={async () => {
            const ok = await playUris(shuffle(cur.uris, rng(seed + i)), `${cur.freq.toFixed(1)} ${cur.name}`)
            if (ok) setOnAir(cur.id)
          }}
        >
          {onAir === cur.id ? 'On air' : 'Put on air'}
        </PressKey>
      </div>
    </div>
  )
}
