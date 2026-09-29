import { useEffect, useMemo, useState } from 'react'
import { loadHistory } from '../history/service'
import { daySeed, type Inputs } from '../stories/engine'
import { useHistory } from '../store/history'

/** The log and the library, as the stories engine takes them. `now` is fixed for the visit. */
export function useStoryInputs() {
  const plays = useHistory((s) => s.plays)
  const library = useHistory((s) => s.library)
  const loaded = useHistory((s) => s.loaded)
  const [now] = useState(() => Date.now())
  useEffect(() => void loadHistory(), [])
  const inputs = useMemo<Inputs>(() => ({ plays, library: library?.tracks ?? [], now }), [plays, library, now])
  return { loaded, inputs, library, now, seed: daySeed(now) }
}
