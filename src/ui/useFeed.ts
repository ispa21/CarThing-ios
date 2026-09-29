import { useCallback, useEffect, useState } from 'react'
import { sealCapsule } from '../history/service'
import type { FeedView } from '../stories/brain'
import { capsuleDue } from '../stories/feed'
import type { SessionOptions, SessionTrack } from '../stories/session'
import { useHistory } from '../store/history'
import { ask } from './brainClient'
import { STALE_MS, startScan } from './libraryScan'
import { useStoryInputs } from './useStoryInputs'

const DISMISSED = 'partydeck.dismissed'
const SET_ASIDE_MS = 90 * 86_400_000

function readDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

/**
 * The feed, computed off the main thread. Keeps showing the last feed while a new one
 * is worked out, seals this month's capsule, and remembers stories you set aside.
 */
export function useFeed() {
  const { loaded, inputs, library, now, seed } = useStoryInputs()
  const capsules = useHistory((s) => s.capsules)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [result, setResult] = useState<{ for: unknown; view: FeedView } | null>(null)

  useEffect(() => {
    if (!loaded) return
    let live = true
    void ask({ type: 'feed', input: { ...inputs, playlists: library?.playlists, followed: library?.followed, top: library?.top, capsules, dismissed }, seed }).then((r) => {
      if (!live || r.type !== 'feed') return
      setResult({ for: inputs, view: r.view })
      if (r.view.capsule && capsuleDue(capsules, now)) sealCapsule(r.view.capsule)
    })
    return () => {
      live = false
    }
  }, [loaded, inputs, library, capsules, dismissed, seed, now])

  // A library read more than a few hours ago refreshes itself: small, since only what changed is read.
  useEffect(() => {
    if (loaded && library && now - library.scannedAt > STALE_MS) void startScan({ quiet: true })
  }, [loaded, library, now])

  const dismiss = useCallback((id: string) => {
    setDismissed((d) => {
      const next = { ...d, [id]: Date.now() + SET_ASIDE_MS }
      try {
        localStorage.setItem(DISMISSED, JSON.stringify(next))
      } catch {
        // private mode: it's set aside for this visit only
      }
      return next
    })
  }, [])

  return { loaded, inputs, view: result?.view ?? null, thinking: loaded && result?.for !== inputs, now, seed, dismiss, hasLibrary: Boolean(library) }
}

/** A session from the brain's current model. */
export async function requestSession(options: SessionOptions): Promise<SessionTrack[]> {
  const r = await ask({ type: 'session', options })
  return r.type === 'session' ? r.tracks : []
}
