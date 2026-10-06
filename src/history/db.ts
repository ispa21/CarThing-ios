// The listening log, the crate and the library index, kept on this device in IndexedDB (a year of plays
// is more than localStorage should hold). No library: a few object stores, a few calls.
// Plays are written two ways: live ones one at a time (a few a day), and imports in BLOCKS
// of a few thousand per record — one record per play takes minutes for a real export
// (250,000 plays), blocks take well under a second.
// If IndexedDB is unavailable (private mode in some browsers), everything lives in
// memory for the session and says so nowhere else — the features still work.

import type { Capsule } from '../stories/archive'
import type { LibraryIndex } from './library'
import type { Crate, Play } from './types'

const NAME = 'partydeck'
const VERSION = 2
const BLOCK = 5000
/** Fewer than this are written one by one (and stay queryable by time). */
const SMALL = 200

let opening: Promise<IDBDatabase | null> | null = null
const memory = { plays: [] as Play[], kv: new Map<string, unknown>() }

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    // Some installed-app browsers never answer an open; fall back to memory rather than wait forever.
    const giveUp = setTimeout(() => resolve(null), 4000)
    const req = indexedDB.open(NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('plays')) db.createObjectStore('plays', { autoIncrement: true }).createIndex('ts', 'ts')
      if (!db.objectStoreNames.contains('blocks')) db.createObjectStore('blocks', { autoIncrement: true })
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => {
      clearTimeout(giveUp)
      resolve(req.result)
    }
    req.onerror = () => {
      clearTimeout(giveUp)
      resolve(null)
    }
    req.onblocked = () => {
      clearTimeout(giveUp)
      resolve(null)
    }
  })
  return opening
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

export async function addPlays(plays: Play[]) {
  if (!plays.length) return
  const db = await open()
  if (!db) {
    for (let i = 0; i < plays.length; i++) memory.plays.push(plays[i]) // not push(...plays): that throws on big arrays
    return
  }
  const bulk = plays.length > SMALL
  const tx = db.transaction(bulk ? 'blocks' : 'plays', 'readwrite')
  const store = tx.objectStore(bulk ? 'blocks' : 'plays')
  if (bulk) for (let i = 0; i < plays.length; i += BLOCK) store.add({ plays: plays.slice(i, i + BLOCK) })
  else for (const p of plays) store.add(p)
  await done(tx)
}

/** Every play (blocks and single writes), in no particular order: the caller sorts. */
export async function allPlays(): Promise<Play[]> {
  const db = await open()
  if (!db) return [...memory.plays].sort((a, b) => a.ts - b.ts)
  const read = <T>(store: string) =>
    new Promise<T[]>((resolve, reject) => {
      const req = db.transaction(store).objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  const [singles, blocks] = await Promise.all([read<Play>('plays'), read<{ plays: Play[] }>('blocks')])
  const out: Play[] = []
  for (const b of blocks) for (let i = 0; i < b.plays.length; i++) out.push(b.plays[i])
  for (let i = 0; i < singles.length; i++) out.push(singles[i])
  return out.sort((a, b) => a.ts - b.ts)
}

async function getKv<T>(key: string): Promise<T | null> {
  const db = await open()
  if (!db) return (memory.kv.get(key) as T | undefined) ?? null
  return new Promise((resolve) => {
    const req = db.transaction('kv').objectStore('kv').get(key)
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
    req.onerror = () => resolve(null)
  })
}

async function putKv(key: string, value: unknown) {
  const db = await open()
  if (!db) {
    memory.kv.set(key, value)
    return
  }
  const tx = db.transaction('kv', 'readwrite')
  tx.objectStore('kv').put(value, key)
  await done(tx)
}

export const getCrate = () => getKv<Crate>('crate')
export const putCrate = (crate: Crate) => putKv('crate', crate)
export const getLibrary = () => getKv<LibraryIndex>('library')
export const putLibrary = (library: LibraryIndex) => putKv('library', library)
export const getCapsules = () => getKv<Capsule[]>('capsules')
export const putCapsules = (capsules: Capsule[]) => putKv('capsules', capsules)

/** Disconnect: forget the log and the crate. */
export async function wipe() {
  memory.plays = []
  memory.kv.clear()
  const db = await open()
  if (!db) return
  const tx = db.transaction(['plays', 'blocks', 'kv'], 'readwrite')
  tx.objectStore('plays').clear()
  tx.objectStore('blocks').clear()
  tx.objectStore('kv').clear()
  await done(tx)
}
