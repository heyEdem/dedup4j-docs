import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { docs } from '../lib/content'
import { buildSearch } from '../lib/search'

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const engine = useMemo(() => buildSearch(docs), [])
  const hits = engine.search(q)

  useEffect(() => {
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-label="Search" className="mx-auto max-w-xl border border-line bg-paper" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && hits[0] && go(hits[0].path)}
          placeholder="Search the docs"
          className="w-full border-b border-line bg-transparent px-4 py-3 outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => go(h.path)} className="block w-full px-4 py-3 text-left hover:bg-tint">
                <div className="text-sm font-semibold">{h.title}{h.heading && <span className="text-muted"> › {h.heading}</span>}</div>
                <div className="truncate text-xs text-muted">{h.snippet}</div>
              </button>
            </li>
          ))}
          {q.trim() && hits.length === 0 && <li className="px-4 py-3 text-sm text-muted">No results</li>}
        </ul>
      </div>
    </div>
  )
}
