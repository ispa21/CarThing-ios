import { useEffect, type ReactNode } from 'react'
import { useUi } from '../store/ui'

export function Toaster() {
  const toast = useUi((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useUi.setState((s) => (s.toast?.id === toast.id ? { toast: null } : s)), 3600)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast" data-tone={toast.tone}>
          <span className="led" aria-hidden="true" />
          {toast.text}
        </div>
      )}
    </div>
  )
}

/** A lamp, a line, a way forward. `tone="error"` lights the lamp red; otherwise it's off (idle). */
export function EmptyState({ title, detail, tone, children }: { title: string; detail?: string; tone?: 'error'; children?: ReactNode }) {
  return (
    <div className="empty" data-tone={tone}>
      <span className="led" data-off={tone ? undefined : true} aria-hidden="true" />
      <p className="empty-title">{title}</p>
      {detail && <p className="empty-detail">{detail}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <ul className="rows" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="row row-skel">
          <span className="art skel" />
          <span className="row-text">
            <span className="skel skel-line" />
            <span className="skel skel-line skel-short" />
          </span>
        </li>
      ))}
    </ul>
  )
}
