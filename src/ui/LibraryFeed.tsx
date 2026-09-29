import { useState } from 'react'
import { readExportFiles, type ExportText } from '../history/exportFiles'
import { parseStreamingHistory } from '../history/importer'
import { addPlays } from '../history/service'
import type { Play } from '../history/types'
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
    setStatus('Opening the export…')
    const found: Play[] = []
    let basic = 0
    let unknown = 0
    let texts: ExportText[] = []
    try {
      texts = await readExportFiles(files)
    } catch {
      setStatus('That ZIP couldn’t be opened. Try the JSON files inside it instead.')
      return
    }
    if (!texts.length) {
      setStatus('No listening history in there. Look for files named Streaming_History_Audio_….json.')
      return
    }
    setStatus(`Reading ${texts.length} ${texts.length === 1 ? 'file' : 'files'}…`)
    for (const file of texts) {
      try {
        const r = parseStreamingHistory(JSON.parse(file.text))
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
