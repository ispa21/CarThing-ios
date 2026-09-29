// The brain's thread. Messages are { id, req }; replies are { id, reply } or { id, error }.
import { handle, type BrainRequest } from './brain'

const scope = self as unknown as { onmessage: ((e: MessageEvent<{ id: number; req: BrainRequest }>) => void) | null; postMessage: (m: unknown) => void }

scope.onmessage = (e) => {
  const { id, req } = e.data
  try {
    scope.postMessage({ id, reply: handle(req) })
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
