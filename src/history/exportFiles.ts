// Opens what you drop in: Spotify's export as it arrives (my_spotify_data.zip), or the
// JSON files inside it. Unzipped here, synchronously — fflate's async mode spins up
// blob: workers, which the CSP forbids. Nothing leaves the device.

import { strFromU8, unzipSync } from 'fflate'

/** The history files inside Spotify's export; everything else in the ZIP is ignored. */
export const HISTORY_FILE = /(^|\/)(Streaming_History[^/]*|StreamingHistory[^/]*|endsong[^/]*)\.json$/i

export interface ExportText {
  name: string
  text: string
}

export function unzipHistory(bytes: Uint8Array): ExportText[] {
  const files = unzipSync(bytes, { filter: (f) => HISTORY_FILE.test(f.name) })
  return Object.entries(files).map(([name, data]) => ({ name, text: strFromU8(data) }))
}

export async function readExportFiles(files: Iterable<File>): Promise<ExportText[]> {
  const out: ExportText[] = []
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip') out.push(...unzipHistory(new Uint8Array(await f.arrayBuffer())))
    else out.push({ name: f.name, text: await f.text() })
  }
  return out
}
