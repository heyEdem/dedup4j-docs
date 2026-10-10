import { useEffect, useState } from 'react'
import type { TocItem } from '../lib/slug'

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120
      let current = ''
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (el && el.offsetTop <= y) current = item.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [items])

  if (items.length === 0) return null
  return (
    <nav aria-label="On this page">
      <div className="label mb-3 text-muted">On this page</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((t) => (
          <li key={t.id} className={t.level === 3 ? 'pl-3' : ''}>
            <a href={`#${t.id}`} className={active === t.id ? 'text-cobalt font-semibold' : 'text-muted hover:text-ink'}>
              {t.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
