import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { crateAdd, crateRemove, loadHistory } from '../history/service'
import { feedback } from '../sensory/feedback'
import type { MediaItem } from '../spotify/normalize'
import { useHistory } from '../store/history'

/** The crate key's behaviour, for any row or menu: drop a record in, or take it out. */
export function useCrate() {
  const uris = useHistory(useShallow((s) => s.crate.items.map((i) => i.uri)))
  useEffect(() => void loadHistory(), [])
  const has = (uri: string) => uris.includes(uri)
  const toggle = (item: Pick<MediaItem, 'uri' | 'title' | 'subtitle' | 'art' | 'durationMs'> & { album?: string | null }) => {
    if (has(item.uri)) {
      feedback.play('queue-remove')
      crateRemove(item.uri)
      return
    }
    feedback.play('queue-add')
    crateAdd({ uri: item.uri, title: item.title, artist: item.subtitle, album: item.album ?? null, art: item.art, durationMs: item.durationMs ?? 0 })
  }
  return { has, toggle }
}
