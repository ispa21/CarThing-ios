// Talks to the brain worker. Falls back to running the brain in-thread when workers
// aren't available (or fail to start), so Stories always works — just less smoothly.

import type { BrainReply, BrainRequest } from '../stories/brain'

let worker: Worker | null | undefined
let seq = 0
const pending = new Map<number, { resolve: (r: BrainReply) => void; reject: (e: Error) => void }>()

function start(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('../stories/brain.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; reply?: BrainReply; error?: string }>) => {
      const p = pending.get(e.data.id)
      pending.delete(e.data.id)
      if (!p) return
      if (e.data.reply) p.resolve(e.data.reply)
      else p.reject(new Error(e.data.error ?? 'The brain failed'))
    }
    worker.onerror = () => {
      // The worker couldn't start: answer everything waiting (and everything after) in-thread.
      worker?.terminate()
      worker = null
      const waiting = [...pending.values()]
      pending.clear()
      for (const p of waiting) p.reject(new Error('retry'))
    }
  } catch {
    worker = null
  }
  return worker
}

async function local(req: BrainRequest): Promise<BrainReply> {
  const { handle } = await import('../stories/brain')
  return handle(req)
}

export async function ask(req: BrainRequest): Promise<BrainReply> {
  const w = start()
  if (!w) return local(req)
  const id = ++seq
  try {
    return await new Promise<BrainReply>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      w.postMessage({ id, req })
    })
  } catch {
    return local(req)
  }
}
