// The listening log, the crate and the library index, kept on this device in IndexedDB (a year of plays
// is more than localStorage should hold). No library: two object stores, a few calls.
// If IndexedDB is unavailable (private mode in some browsers), everything lives in
// memory for the session and says so nowhere else — the features still work.

import type { LibraryIndex } from './library'
import type { Crate, Play } from './types'

const NAME = 'partydeck'
const VERSION = 1

let opening: Promise<IDBDatabase | null> | null = null
const memory = { plays: [] as Play[], kv: new Map<string, unknown>() }

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const req = indexedDB.open(NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('plays')) db.createObjectStore('plays', { autoIncrement: true }).createIndex('ts', 'ts')
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
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
    memory.plays.push(...plays)
    return
  }
  const tx = db.transaction('plays', 'readwrite')
  const store = tx.objectStore('plays')
  for (const p of plays) store.add(p)
  await done(tx)
}

/** Every play, oldest first. */
export async function allPlays(): Promise<Play[]> {
  const db = await open()
  if (!db) return [...memory.plays].sort((a, b) => a.ts - b.ts)
  return new Promise((resolve, reject) => {
    const req = db.transaction('plays').objectStore('plays').index('ts').getAll()
    req.onsuccess = () => resolve(req.result as Play[])
    req.onerror = () => reject(req.error)
  })
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

/** Disconnect: forget the log and the crate. */
export async function wipe() {
  memory.plays = []
  memory.kv.clear()
  const db = await open()
  if (!db) return
  const tx = db.transaction(['plays', 'kv'], 'readwrite')
  tx.objectStore('plays').clear()
  tx.objectStore('kv').clear()
  await done(tx)
}
