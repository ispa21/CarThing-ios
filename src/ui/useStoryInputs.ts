import { useEffect, useMemo, useState } from 'react'
import { fromRecent } from '../history/merge'
import { addPlays, loadHistory } from '../history/service'
import { fetchRecentPlays } from '../spotify/playbackService'
import { daySeed, type Inputs } from '../stories/engine'
import { useHistory } from '../store/history'

/** The log and the library, as the stories engine takes them. `now` is fixed for the visit. */
export function useStoryInputs() {
  const plays = useHistory((s) => s.plays)
  const library = useHistory((s) => s.library)
  const loaded = useHistory((s) => s.loaded)
  const [now] = useState(() => Date.now())
  useEffect(() => {
    void loadHistory()
    // Spotify's last 50 plays: most stories need listening, not just a library.
    fetchRecentPlays()
      .then((list) => (list ? addPlays(list.map(fromRecent)) : 0))
      .catch(() => 0)
  }, [])
  const inputs = useMemo<Inputs>(() => ({ plays, library: library?.tracks ?? [], now }), [plays, library, now])
  return { loaded, inputs, library, now, seed: daySeed(now) }
}
