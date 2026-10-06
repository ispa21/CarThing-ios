import { useState } from 'react'
import { readExportFiles, type ExportText } from '../history/exportFiles'
import { describeImport, importAll } from '../history/importAll'
import { addPlays } from '../history/service'
import { feedback } from '../sensory/feedback'
import { hasScope } from '../spotify/auth'
import { useHistory } from '../store/history'
import { startScan, useScan } from './libraryScan'
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
  const { running, progress: scan, status: scanStatus } = useScan()
  const [status, setStatus] = useState('')
  const [now] = useState(() => Date.now())

  async function importFiles(files: FileList | null) {
    if (!files?.length) return
    const chosen = [...files] // the input is cleared afterwards: keep our own list
    setStatus('Opening…')
    let texts: ExportText[] = []
    try {
      texts = await readExportFiles(chosen)
    } catch (e) {
      setStatus(`That file couldn’t be opened (${e instanceof Error ? e.message : String(e)}). If it’s the ZIP from Spotify, try unzipping it and choosing the JSON files inside.`)
      return
    }
    if (!texts.length) {
      setStatus(`No listening history in ${chosen.length === 1 ? chosen[0].name : 'those files'}. Spotify’s files are named Streaming_History_Audio_….json (extended) or StreamingHistory_music_….json (basic).`)
      return
    }
    const { library: lib, plays: logged } = useHistory.getState()
    const { plays, files: reports } = await importAll(texts, lib?.tracks ?? [], logged, (done, total, name) => setStatus(done < total ? `Reading ${done + 1} of ${total}${name ? ` · ${name}` : ''}…` : 'Saving…'))
    let added = 0
    let kept = true
    try {
      added = await addPlays(plays, { strict: true })
    } catch {
      added = plays.length
      kept = false
    }
    if (added) feedback.play('success')
    setStatus(describeImport(reports, added, plays.length) + (kept ? '' : ' They’re in this visit only: this browser wouldn’t let PartyDeck save them on the device.'))
  }

  const canScan = hasScope('user-library-read')
  const followScope = hasScope('user-follow-read')
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
            disabled={running}
            onClick={() => {
              feedback.play('select')
              void startScan()
            }}
          >
            {scan
              ? scan.phase === 'waiting'
                ? `Spotify says slow down · ${scan.waitS}s`
                : scan.phase === 'liked'
                  ? `Reading liked songs ${scan.done}/${scan.total}`
                  : `Playlists ${scan.done}/${scan.total}${scan.pages && scan.pages > 1 ? ` · page ${scan.page}/${scan.pages}` : ''}`
              : library
                ? 'Check for changes'
                : 'Read my whole library'}
          </PressKey>
        ) : (
          <ReconnectButton label="Reconnect to read your library" />
        )}
        {canScan && !followScope && <ReconnectButton label="Reconnect to include followed artists" />}
        <label className="btn feed-file" onClick={() => feedback.play('select')}>
          Import Spotify export (.zip or .json)
          <input type="file" accept=".json,.zip,application/json,application/zip" multiple className="sr-only" onChange={(e) => {
              const input = e.currentTarget
              void importFiles(input.files).finally(() => {
                input.value = ''
              })
            }} />
        </label>
      </div>
      {scan?.name && running && <p className="readout feed-status">now reading: {scan.name.toLowerCase()}</p>}
      <p className="readout feed-status" role="status">
        {[scanStatus, status].filter(Boolean).join(' ')}
      </p>
      <p className="readout feed-note">
        the first read takes every liked song and every playlist; after that only what changed is read, by itself, when you open stories. all-time listening can't come from spotify's api (it only shares your last 50 plays): request your extended streaming history (spotify account → privacy → download your data) and drop the files in. everything is worked out on this device and never uploaded.
      </p>
    </section>
  )
}
