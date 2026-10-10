import type { ReactNode } from 'react'

const LABELS: Record<string, string> = {
  note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Danger',
}

export function Alert({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <div className="alert" data-kind={kind} role="note">
      <span className="label alert-label">{LABELS[kind] ?? kind}</span>
      {children}
    </div>
  )
}
