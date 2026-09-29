import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { tickLink } from '../app/router'
import { crateAdd } from '../history/service'
import type { TrackRef } from '../history/types'
import { feedback } from '../sensory/feedback'
import { playUris } from '../spotify/playbackService'
import { stories, type Story } from '../stories/engine'
import { notify } from '../store/ui'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { LibraryFeed } from '../ui/LibraryFeed'
import { PressKey } from '../ui/PressKey'
import { SaveKey } from '../ui/SaveKey'
import { useStoryInputs } from '../ui/useStoryInputs'

type Of<K extends Story['id']> = Extract<Story, { id: K }>

const minutes = (tracks: TrackRef[]) => Math.max(1, Math.round(tracks.reduce((s, t) => s + (t.durationMs || 210_000), 0) / 60_000))
const month = (ts: number) => new Date(ts).toLocaleDateString('en', { month: 'long' })
const day = (ts: number) => new Date(ts).toLocaleDateString('en', { day: 'numeric', month: 'short' }).toLowerCase()
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
/** Small counts read as words in sentences ("these four"), bigger ones as numbers. */
const word = (n: number) => WORDS[n] ?? n.toLocaleString()
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

function PlayKey({ tracks, label, name, primary = true }: { tracks: TrackRef[]; label: string; name: string; primary?: boolean }) {
  return (
    <PressKey className={primary ? 'btn btn-primary' : 'btn'} depth={1} onClick={() => void playUris(tracks.map((t) => t.uri), name)}>
      {primary && <Icon name="play" size={18} />} {label}
    </PressKey>
  )
}

function CrateKey({ tracks }: { tracks: TrackRef[] }) {
  return (
    <PressKey
      className="btn"
      depth={1}
      onClick={() => {
        feedback.play('queue-add')
        tracks.forEach(crateAdd)
        notify(`${plural(tracks.length, 'record')} in the crate`)
      }}
    >
      Into a crate
    </PressKey>
  )
}

function Rows({ tracks, trail }: { tracks: TrackRef[]; trail: (t: TrackRef, i: number) => string }) {
  return (
    <ol className="sto-rows">
      {tracks.map((t, i) => (
        <li key={t.uri}>
          <span className="readout">{String(i + 1).padStart(2, '0')}</span>
          <span className="sto-row-title">
            {t.title} <span className="serif">{t.artist}</span>
          </span>
          <span className="readout">{trail(t, i)}</span>
        </li>
      ))}
    </ol>
  )
}

function Depth({ name, children }: { name: string; children: ReactNode }) {
  return (
    <h2 className="sto-depth">
      <span className="readout">( {name} )</span>
      <span className="serif">{children}</span>
    </h2>
  )
}

function Next30({ s, now }: { s: Of<'next30'>; now: number }) {
  const when = new Date(now)
  const unheard = s.counts.forgotten + s.counts.never
  return (
    <section className="sto-lead" aria-label={`Your next ${s.minutes} minutes`}>
      <span className="readout">
        {when.toLocaleDateString('en', { weekday: 'long' }).toLowerCase()}, {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · for right now
      </span>
      <p className="display sto-lead-title">
        You have
        <br />
        {s.minutes} minutes.
      </p>
      <p className="serif sto-lead-lede">{unheard ? "Here's something you haven't heard in a while." : 'Here’s what you keep coming back to.'}</p>
      <div className="sto-covers">
        {s.tracks.slice(0, 8).map((t, i) => (
          <Artwork key={t.uri} src={t.art} alt={i === 0 ? `${t.title}, first up` : ''} className={i === 0 ? 'sto-cover-first' : ''} />
        ))}
      </div>
      <div className="sto-lead-foot">
        <div className="sto-lead-meta">
          <span className="readout">
            {s.artists[0]?.toLowerCase()} · {plural(s.tracks.length, 'record')} · {s.minutes} min
          </span>
          <span className="readout sto-quiet">
            {s.counts.familiar} familiar · {s.counts.forgotten} forgotten · {s.counts.never} never played
          </span>
        </div>
        <p className="serif sto-why">
          <span className="label">why</span> You play {s.artists.slice(0, 2).join(' and ')} all the time
          {s.counts.never ? `, but you've never once played ${word(s.counts.never)} of these.` : '. These are the ones you’ve let slip.'}
        </p>
        <div className="sto-keys">
          <PlayKey tracks={s.tracks} label="Play session" name="your next 30" />
          <a className="btn" href="/stories/build" onClick={tickLink}>
            Tune it
          </a>
        </div>
      </div>
    </section>
  )
}

function Forgotten({ s }: { s: Of<'forgotten'> }) {
  return (
    <section className="sto sto-forgotten" aria-label="The forgotten shelf">
      <span className="label">the forgotten shelf</span>
      <div className="sto-figure">
        <span className="display sto-huge">{s.count.toLocaleString()}</span>
        <span className="serif sto-figure-say">
          songs you saved
          <br />
          and never played.
        </span>
      </div>
      <p className="serif sto-quiet">
        {s.year ? `Mostly saved in ${s.year}. ` : ''}We picked {word(s.tracks.length)} worth starting with.
      </p>
      <div className="sto-keys">
        <PlayKey tracks={s.tracks} label={`Find the good stuff · ${s.minutes} min`} name="the forgotten shelf" />
      </div>
    </section>
  )
}

function DeepCuts({ s }: { s: Of<'deepcuts'> }) {
  return (
    <section className="sto" aria-label="Deep cuts">
      <span className="label">deep cuts</span>
      <p className="display sto-say">
        {plural(s.listens, 'play')} of {s.artist}.
      </p>
      <p className="serif sto-reply">These {word(s.tracks.length)}? Never.</p>
      <Rows tracks={s.tracks} trail={() => '0 plays'} />
      <div className="sto-keys">
        <PlayKey tracks={s.tracks} label={`Play the cuts · ${minutes(s.tracks)} min`} name={`deep cuts from ${s.artist}`} primary={false} />
      </div>
    </section>
  )
}

function Almosts({ s }: { s: Of<'almosts'> }) {
  return (
    <section className="sto" aria-label="The almosts">
      <span className="label">the almosts</span>
      <p className="display sto-say">You keep coming back to these.</p>
      <p className="serif sto-quiet">{plural(s.count, 'track')} played again and again, never saved.</p>
      <Rows tracks={s.tracks.slice(0, 3)} trail={(_, i) => plural(s.tracks[i].listens, 'play')} />
      <div className="sto-keys">
        <PlayKey tracks={s.tracks} label={`Rescue these · ${minutes(s.tracks)} min`} name="the almosts" />
        <CrateKey tracks={s.tracks} />
      </div>
    </section>
  )
}

function Ghosts({ s }: { s: Of<'ghosts'> }) {
  const max = Math.max(1, ...s.weekly)
  const gap = s.from === s.to ? '' : month(s.from) === month(s.to) ? `all through ${month(s.from)}` : `between ${month(s.from)} and ${month(s.to)}`
  return (
    <section className="sto" aria-label="Ghosts">
      <span className="label">ghosts · {s.track.title.toLowerCase()}</span>
      <p className="display sto-say">{plural(s.listens, 'play')}. Then none.</p>
      <p className="serif sto-quiet">Everywhere {gap}. Nothing since.</p>
      <div className="sto-weeks" role="img" aria-label={`Plays per week from ${month(s.from)}: ${s.weekly.join(', ')}`}>
        {s.weekly.map((n, i) => (
          <span key={i} style={{ '--h': n / max } as CSSProperties} />
        ))}
        <span className="readout">since {day(s.to)} · 0</span>
      </div>
      <div className="sto-keys">
        <PlayKey tracks={[s.track, ...s.tracks.filter((t) => t.uri !== s.track.uri)]} label="Revive this sound" name={`the sound of ${month(s.from)}`} />
      </div>
    </section>
  )
}

function Three({ s }: { s: Of<'three'> }) {
  return (
    <section className="sto" aria-label="The three-song universe">
      <span className="label">the three-song universe</span>
      <div className="sto-three">
        {s.tracks.map((t, i) => (
          <span key={t.uri} className="sto-three-item">
            {i > 0 && <span className="readout" aria-hidden="true">→</span>}
            <Artwork src={t.art} alt={`${t.title} by ${t.artist}`} />
          </span>
        ))}
      </div>
      <p className="display sto-say sto-say-s">Together in {s.sessions} separate sessions.</p>
      <p className="serif sto-quiet">You never put these in a playlist. You just keep doing it.</p>
      <div className="sto-keys">
        <SaveKey name="Three-song universe" description="Three tracks I keep playing together. Made with PartyDeck." uris={s.tracks.map((t) => t.uri)} label="Make it official" />
      </div>
    </section>
  )
}

function Skip({ s }: { s: Of<'skip'> }) {
  return (
    <section className="sto" aria-label="The skip paradox">
      <span className="label">the skip paradox · {s.track.title.toLowerCase()}</span>
      <div className="sto-counts">
        <span className="display">{s.starts}</span>
        <span className="display">{s.skips}</span>
        <span className="display">{s.through}</span>
        <span className="readout">starts</span>
        <span className="readout">skips</span>
        <span className="readout">all the way through</span>
      </div>
      <p className="serif sto-reply">You start it often and skip it often, but you keep coming back. What are you listening for?</p>
      <div className="sto-keys">
        <PlayKey tracks={[s.track]} label="Play it through, once" name={s.track.title} primary={false} />
      </div>
    </section>
  )
}

function LongHaul({ s }: { s: Of<'longhaul'> }) {
  const max = Math.max(1, ...s.perYear.map((y) => y.listens))
  return (
    <section className="sto sto-long" aria-label="The long haul">
      <div className="sto-long-text">
        <span className="label">the long haul</span>
        <p className="display sto-huge">{plural(s.days, 'day')}</p>
        <p className="serif sto-reply">
          You've been coming back to {s.track.title} since {new Date(s.since).getFullYear()}.
        </p>
        <div className="sto-keys">
          <PlayKey tracks={s.timeless.length ? s.timeless : [s.track]} label="Build my timeless 30" name="your timeless 30" />
        </div>
      </div>
      <div className="sto-years" role="img" aria-label={`Plays per year: ${s.perYear.map((y) => `${y.year} ${y.listens}`).join(', ')}`}>
        {s.perYear.map((y, i) => (
          <span key={y.year} className="sto-year" data-now={i === s.perYear.length - 1 || undefined}>
            <span className="sto-year-bar" style={{ '--h': y.listens / max } as CSSProperties} />
            <span className="readout">{y.year}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

/**
 * STORIES: what your listening says, in three depths — now (act on it tonight),
 * signals (things PartyDeck noticed), archive (worth looking back on). Every story
 * ends in something to play or keep, and a story without enough data isn't told.
 */
export function Stories() {
  const { loaded, inputs, now, seed } = useStoryInputs()
  const list = useMemo(() => stories(inputs, seed), [inputs, seed])
  const get = <K extends Story['id']>(id: K) => list.find((s): s is Of<K> => s.id === id)
  const lead = get('next30')
  const nowRow = [get('forgotten'), get('deepcuts')].filter(Boolean)
  const signals = [get('almosts'), get('ghosts'), get('three'), get('skip')].filter(Boolean)
  const long = get('longhaul')

  return (
    <div className="stories">
      <h1 className="sr-only">Stories</h1>
      {lead && <Next30 s={lead} now={now} />}
      {loaded && !list.length && (
        <section className="sto-lead" aria-label="No stories yet">
          <span className="readout">stories · nothing to tell yet</span>
          <p className="display sto-lead-title">
            Feed the
            <br />
            machine.
          </p>
          <p className="serif sto-lead-lede">Stories come from your library and your listening. Read your library, or drop in your streaming history, and they write themselves.</p>
        </section>
      )}

      {nowRow.length > 0 && (
        <>
          <Depth name="now">things you can act on tonight</Depth>
          <div className="sto-grid sto-grid-now">
            {get('forgotten') && <Forgotten s={get('forgotten')!} />}
            {get('deepcuts') && <DeepCuts s={get('deepcuts')!} />}
          </div>
        </>
      )}
      {signals.length > 0 && (
        <>
          <Depth name="signals">things PartyDeck noticed</Depth>
          <div className="sto-grid">
            {get('almosts') && <Almosts s={get('almosts')!} />}
            {get('ghosts') && <Ghosts s={get('ghosts')!} />}
            {get('three') && <Three s={get('three')!} />}
            {get('skip') && <Skip s={get('skip')!} />}
          </div>
        </>
      )}
      {long && (
        <>
          <Depth name="archive">worth looking back on</Depth>
          <LongHaul s={long} />
        </>
      )}
      <LibraryFeed />
    </div>
  )
}
