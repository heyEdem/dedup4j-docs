import { NavLink } from 'react-router'
import { groupByCategory, type Doc } from '../lib/docs'

export function Sidebar({ docs, onNavigate }: { docs: Doc[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="space-y-6">
      {groupByCategory(docs).map((g) => (
        <div key={g.category}>
          <div className="label mb-2 text-muted">{g.category}</div>
          <ul className="space-y-0.5">
            {g.docs.map((d) => (
              <li key={d.id}>
                <NavLink
                  to={d.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block border-l-2 py-1.5 pl-3 text-sm ${
                      isActive ? 'border-cobalt font-semibold text-cobalt' : 'border-transparent text-muted hover:text-ink'
                    }`
                  }
                >
                  {d.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
