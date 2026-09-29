// PartyDeck's brain, as a message handler: it builds the feed once, keeps the model,
// and answers session requests from it. Runs in a Web Worker (stories/brain.worker.ts)
// so a big library never freezes the deck; the same code runs in-thread as a fallback.

import type { Capsule } from './archive'
import type { Card } from './cards'
import type { Story } from './engine'
import { buildFeed, nextSession, type FeedInputs, type RoomView } from './feed'
import type { Bucket, Model } from './model'
import { buildRiskSession, type SessionOptions, type SessionTrack } from './session'
import { stationsFrom, type Station } from './stations'

/** Everything a screen needs, cloneable across the worker boundary. */
export interface FeedView {
  legacy: Story[]
  cards: Card[]
  rooms: RoomView[]
  stations: Station[]
  drop: Card | null
  capsule: Capsule | null
  next: Record<number, { tracks: SessionTrack[]; counts: Record<Bucket, number>; artists: string[] }>
  /** Library size and core size, for headlines. */
  saved: number
  core: number
}

export type BrainRequest = { type: 'feed'; input: FeedInputs; seed: number } | { type: 'session'; options: SessionOptions }
export type BrainReply = { type: 'feed'; view: FeedView } | { type: 'session'; tracks: SessionTrack[] }

export const NEXT_MINUTES = [15, 30, 45, 60]

let model: Model | null = null

export function handle(req: BrainRequest): BrainReply {
  if (req.type === 'feed') {
    const feed = buildFeed(req.input, req.seed)
    model = feed.model
    const next: FeedView['next'] = {}
    for (const n of NEXT_MINUTES) next[n] = nextSession(feed.model, n, req.seed)
    return {
      type: 'feed',
      view: {
        legacy: feed.legacy,
        cards: feed.cards,
        rooms: feed.rooms,
        stations: stationsFrom(feed.model, feed.legacy),
        drop: feed.drop,
        capsule: feed.capsule,
        next,
        saved: feed.model.library.length,
        core: feed.model.core.size,
      },
    }
  }
  return { type: 'session', tracks: model ? buildRiskSession(model, req.options) : [] }
}
