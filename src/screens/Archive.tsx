import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fromRecent } from '../history/merge'
import { addPlays, loadHistory } from '../history/service'
import { dayKey, sessionsFrom, stacks, streak } from '../history/sessions'
import type { Play, Session } from '../history/types'
import { formatTime } from '../lib/progress'
import { feedback } from '../sensory/feedback'
import { hasScope } from '../spotify/auth'
import { fetchRecentPlays, playUris, saveAsPlaylist } from '../spotify/playbackService'
import { useHistory } from '../store/history'
import { EmptyState } from '../ui/Feedback'
import { PressKey } from '../ui/PressKey'
import { ReconnectButton } from '../ui/ReconnectButton'
import { SpotifyLink } from '../ui/SpotifyLink'

const HOUR = 3600_000
/** The day runs 06:00 to 04:00: nights belong to the day they started. */
const DAY_START_H = 6
const DAY_SPAN_H = 22
const BIN_MS = 20 * 60_000

const dayStartOf = (ts: number) => {
  const d = new Date(ts - DAY_START_H * HOUR)
  d.setHours(DAY_START_H, 0, 0, 0)
  return d.getTime()
}

const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const hm = (ms: number) => {
  const h = Math.floor(ms / HOUR)
  const m = Math.round((ms % HOUR) / 60_000)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

/** A session is named for when it happened; the log doesn't know what you called it. */
function sessionName(s: Session) {
  const h = new Date(s.start).getHours()
  return h >= 5 && h < 12 ? 'Morning' : h < 17 && h >= 12 ? 'Afternoon' : h >= 17 && h < 22 ? 'Evening' : 'Late night'
}

/**
 * ARCHIVE: your days as stacks of records. Logged on this device while PartyDeck is
 * open, plus Spotify's last 50 plays. A session is plays with no long gap; save one
 * as a playlist, or play it again.
 */
export function Archive() {
  const { loaded, plays } = useHistory()
  const [now] = useState(() => Date.now())
  const noScope = !hasScope('user-read-recently-played')
  const recent = noScope ? 'no-scope' : 'ok'

  useEffect(() => {
    void loadHistory()
    if (noScope) return
    fetchRecentPlays()
      .then((list) => (list ? addPlays(list.map(fromRecent)) : 0))
      .catch(() => 0) // the log still shows what this device kept
  }, [noScope])

  const allSessions = useMemo(() => sessionsFrom(plays), [plays])
  const days = useMemo(() => {
    const map = new Map<number, Play[]>()
    for (const p of plays) {
      const k = dayStartOf(p.ts)
      map.set(k, [...(map.get(k) ?? []), p])
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [plays])

  const [pickedDay, setPickedDay] = useState<number | null>(null)
  const day = pickedDay ?? days[0]?.[0] ?? dayStartOf(now)
  const dayPlays = useMemo(() => days.find(([k]) => k === day)?.[1] ?? [], [days, day])
  const daySessions = allSessions.filter((s) => s.start >= day && s.start < day + DAY_SPAN_H * HOUR)
  const [pickedSession, setPickedSession] = useState<number | null>(null)
  const session = daySessions.find((s) => s.n === pickedSession) ?? daySessions[daySessions.length - 1] ?? null

  const heard = dayPlays.reduce((sum, p) => sum + p.playedMs, 0)
  const records = useMemo(() => stacks(dayPlays, day, BIN_MS), [dayPlays, day])
  const bins = (DAY_SPAN_H * HOUR) / BIN_MS
  const date = new Date(day)
  const today = dayKey(dayStartOf(now)) === dayKey(day)

  return (
    <div className="arc">
      <h1 className="sr-only">Archive</h1>
      <header className="arc-head">
        <p className="display arc-date">{date.toLocaleDateString([], { day: 'numeric', month: 'short' }).toUpperCase()}</p>
        <div className="arc-dateline">
          <span className="serif">{today ? 'Today' : date.toLocaleDateString([], { weekday: 'long' })}, {date.getFullYear()}</span>
          <span className="readout">
            {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'} · {dayPlays.length} records · {hm(heard)}
          </span>
        </div>
        <div className="arc-streak">
          <span className="label">streak</span>
          <span className="display">{streak(plays, now)}</span>
          <span className="readout">days in a row</span>
        </div>
      </header>

      {loaded && !plays.length ? (
        <EmptyState
          title="The log starts now"
          detail={
            recent === 'no-scope'
              ? 'Play something with PartyDeck open and it lands here. Reconnect Spotify to fill in your last 50 plays too.'
              : 'Play something with PartyDeck open and it lands here.'
          }
        >
          {recent === 'no-scope' && <ReconnectButton />}
        </EmptyState>
      ) : (
        <>
          {/* The day, drawn as stacks of records along 06:00 → 04:00. */}
          <div className="arc-day" aria-label={`Timeline of ${dayPlays.length} plays`} role="img">
            {records.map(({ play, col, level }) => (
              <span
                key={`${play.uri}-${play.ts}`}
                className="arc-rec"
                data-dim={(session && !session.plays.includes(play)) || undefined}
                style={{ '--x': col / bins, '--y': level } as CSSProperties}
                title={`${clock(play.ts)} ${play.title}`}
              >
                {play.art ? <img src={play.art} alt="" loading="lazy" decoding="async" /> : null}
              </span>
            ))}
            <span className="arc-axis" aria-hidden="true" />
            {Array.from({ length: DAY_SPAN_H / 2 + 1 }, (_, i) => (
              <span key={i} className="arc-hour readout" data-minor={i % 2 === 1 || undefined} style={{ '--x': (i * 2) / DAY_SPAN_H } as CSSProperties} aria-hidden="true">
                {String((DAY_START_H + i * 2) % 24).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          <div className="arc-sessions" role="radiogroup" aria-label="Sessions">
            {daySessions.map((s) => (
              <button
                key={s.n}
                className="arc-session readout"
                role="radio"
                aria-checked={s === session}
                style={{ '--x': (s.start - day) / (DAY_SPAN_H * HOUR) } as CSSProperties}
                onClick={() => {
                  feedback.play('select')
                  setPickedSession(s.n)
                }}
              >
                <span>session {String(s.n).padStart(3, '0')}</span>
                <span className="arc-session-span">
                  {clock(s.start)} — {clock(s.end)}
                </span>
              </button>
            ))}
          </div>

          <div className="arc-foot">
            {session && <SessionDetail session={session} />}
            <aside className="arc-days" aria-label="Earlier days">
              {days.slice(0, 7).map(([k, list]) => (
                <button
                  key={k}
                  className="arc-dayrow"
                  aria-current={k === day || undefined}
                  onClick={() => {
                    feedback.play('select')
                    setPickedDay(k)
                    setPickedSession(null)
                  }}
                >
                  <span className="arc-dayrow-head">
                    <span className="display">{new Date(k).toLocaleDateString([], { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                    <span className="readout">{list.length}</span>
                  </span>
                  <span className="arc-strip" aria-hidden="true">
                    {list.map((p) => (
                      <span key={p.ts} style={{ '--x': (p.ts - k) / (DAY_SPAN_H * HOUR) } as CSSProperties} />
                    ))}
                  </span>
                </button>
              ))}
              <p className="serif arc-source">
                Logged on this device while PartyDeck is open{recent === 'no-scope' ? '' : ', plus Spotify’s last 50 plays'}. Import your
                Spotify history in Stories to go back further.
              </p>
              {recent === 'no-scope' && <ReconnectButton />}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function SessionDetail({ session }: { session: Session }) {
  const [saved, setSaved] = useState<{ n: number; uri: string; url: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const canSave = hasScope('playlist-modify-private')
  const uris = [...new Set(session.plays.map((p) => p.uri))]
  const name = `${sessionName(session)} session ${String(session.n).padStart(3, '0')}`
  const last = session.plays[session.plays.length - 1]
  return (
    <section className="arc-session-detail" aria-label={name}>
      <span className="readout">session {String(session.n).padStart(3, '0')}</span>
      <h2 className="display arc-session-title">{sessionName(session)}</h2>
      <dl className="arc-stats">
        <div>
          <dt className="label">span</dt>
          <dd className="readout">
            {clock(session.start)} — {clock(session.end)}
          </dd>
        </div>
        <div>
          <dt className="label">records</dt>
          <dd className="readout">
            {session.plays.length} · {hm(session.heardMs)}
          </dd>
        </div>
        <div>
          <dt className="label">longest run</dt>
          <dd className="readout">
            {session.longestRun.length} from {clock(session.longestRun.start)}
          </dd>
        </div>
        <div>
          <dt className="label">last record</dt>
          <dd className="readout">
            {last.title} · {formatTime(last.playedMs)}
          </dd>
        </div>
      </dl>
      <div className="arc-actions">
        {saved?.n === session.n ? (
          <SpotifyLink className="btn btn-primary" uri={saved.uri} url={saved.url} label={`Open ${name} in Spotify`}>
            Saved — open in Spotify
          </SpotifyLink>
        ) : canSave ? (
          <PressKey
            className="btn btn-primary"
            depth={1}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const r = await saveAsPlaylist(name, `A listening session from ${new Date(session.start).toDateString()}, kept by PartyDeck.`, uris)
              setBusy(false)
              if (r) setSaved({ n: session.n, ...r })
            }}
          >
            {busy ? 'Saving…' : 'Save session → playlist'}
          </PressKey>
        ) : (
          <ReconnectButton label="Reconnect to save playlists" />
        )}
        <PressKey className="btn" depth={1} onClick={() => void playUris(uris, name)}>
          Play it again
        </PressKey>
      </div>
    </section>
  )
}
