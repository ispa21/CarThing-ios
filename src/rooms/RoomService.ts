// Future second-screen mode (/controller → QR → /screen/:roomId on a TV).
// Not wired into the UI yet. A realtime implementation (Supabase / WebSocket)
// replaces the mock in Phase 3 without touching screens.

import type { PlaybackState } from '../spotify/normalize'

export interface Room {
  id: string
  createdAt: number
}

export interface RoomService {
  createRoom(): Promise<Room>
  joinRoom(roomId: string): Promise<void>
  publishState(state: PlaybackState): Promise<void>
  subscribe(callback: (state: PlaybackState) => void): () => void
}

/** In-memory stand-in: publish and subscribe within one tab. */
export class MockRoomService implements RoomService {
  private room: Room | null = null
  private listeners = new Set<(state: PlaybackState) => void>()

  async createRoom() {
    this.room = { id: crypto.randomUUID().slice(0, 8), createdAt: Date.now() }
    return this.room
  }

  async joinRoom(roomId: string) {
    this.room = { id: roomId, createdAt: Date.now() }
  }

  async publishState(state: PlaybackState) {
    if (!this.room) throw new Error('Create or join a room first')
    for (const cb of this.listeners) cb(state)
  }

  subscribe(callback: (state: PlaybackState) => void) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }
}
