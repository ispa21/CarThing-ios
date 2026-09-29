import { useEffect, useRef, useState } from 'react'
import { parseStreamingHistory } from '../history/importer'
import { addPlays, saveLibrary } from '../history/service'
import type { Play } from '../history/types'
import { feedback } from '../sensory/feedback'
import { hasScope } from '../spotify/auth'
import { explainError, scanLibrary, type ScanProgress } from '../spotify/playbackService'
import { useHistory } from '../store/history'
import { PressKey } from './PressKey'
import { ReconnectButton } from './ReconnectButton'

const ago = (ts: number, now: number) => {
  const d = Math.floor((now - ts) / 86_400_000)
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

/**
 * What Stories, the builder and Transmission are made from, and the two ways to feed
 * them: read your library from Spotify, or drop in your streaming-history export.
 */
export function LibraryFeed() {
  const library = useHistory((s) => s.library)
  const plays = useHistory((s) => s.plays.length)
  const [scan, setScan] = useState<ScanProgress | null>(null)
  const [status, setStatus] = useState('')
  const [now] = useState(() => Date.now())
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  async function runScan() {
    abort.current = new AbortController()
    setScan({ phase: 'liked', done: 0, total: 1 })
    setStatus('Reading your library…')
    try {
      const r = await scanLibrary(setScan, abort.current.signal)
      if (!r) return
      const { skipped, problems, ...index } = r
      const trouble = problems.length ? ` Spotify said: ${problems.slice(0, 3).join(' · ')}.` : ''
      if (!index.tracks.length) {
        // Nothing read: keep the library you had, and say why.
        setStatus(`Couldn't read your library.${trouble || ' Spotify returned no tracks.'}`)
        return
      }
      saveLibrary(index)
      feedback.play('success')
      setStatus(
        `Read ${index.tracks.length.toLocaleString()} tracks from your liked songs and ${index.playlists.length} playlists.` +
          (skipped ? ` Spotify wouldn't open ${skipped === 1 ? 'one playlist' : `${skipped} playlists`} for this app (it only opens playlists you own or collaborate on).` : '') +
          trouble,
      )
    } catch (e) {
      explainError(e)
      setStatus(`The scan stopped: ${e instanceof Error ? e.message : String(e)}.`)
    } finally {
      setScan(null)
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return
    setStatus('Reading the export…')
    const found: Play[] = []
    let basic = 0
    let unknown = 0
    for (const file of files) {
      try {
        const r = parseStreamingHistory(JSON.parse(await file.text()))
        if (r.kind === 'extended') found.push(...r.plays)
        else if (r.kind === 'basic') basic++
        else unknown++
      } catch {
        unknown++
      }
    }
    const added = await addPlays(found)
    if (added) feedback.play('success')
    const notes = [
      found.length ? `Added ${added.toLocaleString()} plays${found.length > added ? ` (${(found.length - added).toLocaleString()} were already in the log)` : ''}.` : 'No plays found.',
      basic ? `${basic === 1 ? 'One file is' : `${basic} files are`} the basic export, which has no track links: request "Extended streaming history" instead.` : '',
      unknown ? `${unknown === 1 ? 'One file wasn’t' : `${unknown} files weren’t`} a streaming-history export.` : '',
    ]
    setStatus(notes.filter(Boolean).join(' '))
  }

  const canScan = hasScope('user-library-read')
  return (
    <section className="feed" aria-label="What stories are made from">
      <div className="feed-sources">
        <span className="label">library</span>
        <span className="readout">
          {library ? `${library.tracks.length.toLocaleString()} tracks · ${library.playlists.length} playlists · read ${ago(library.scannedAt, now)}` : 'not read yet'}
        </span>
        <span className="label">log</span>
        <span className="readout">{plays.toLocaleString()} plays on this device</span>
      </div>
      <div className="feed-actions">
        {canScan ? (
          <PressKey
            className="btn"
            depth={1}
            disabled={scan !== null}
            onClick={() => {
              feedback.play('select')
              void runScan()
            }}
          >
            {scan
              ? scan.phase === 'waiting'
                ? `Spotify says slow down · ${scan.waitS}s`
                : `Reading ${scan.phase === 'liked' ? 'liked songs' : 'playlists'} ${scan.done}/${scan.total}`
              : library
                ? 'Read my library again'
                : 'Read my library'}
          </PressKey>
        ) : (
          <ReconnectButton label="Reconnect to read your library" />
        )}
        <label className="btn feed-file" onClick={() => feedback.play('select')}>
          Import streaming history
          <input type="file" accept=".json,application/json" multiple className="sr-only" onChange={(e) => {
              const input = e.currentTarget
              void importFiles(input.files).finally(() => {
                input.value = ''
              })
            }} />
        </label>
      </div>
      <p className="readout feed-status" role="status">
        {status}
      </p>
      <p className="readout feed-note">
        reads your saved tracks and playlists, what partydeck logs while it's open, and the streaming-history export you can request from spotify (account → privacy → extended streaming history) and drop in. it's worked out on this device and never uploaded.
      </p>
    </section>
  )
}
