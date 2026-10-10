import { Link, NavLink } from 'react-router'
import { REPO_URL, SITE_NAME } from '../site'
import { ThemeToggle } from './ThemeToggle'

export function Navigation({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="text-lg font-extrabold tracking-tight">{SITE_NAME}</Link>
        <nav className="flex items-center gap-3">
          <NavLink to="/docs" className="label px-2 py-2 hover:text-cobalt">Docs</NavLink>
          <a href={REPO_URL} className="label px-2 py-2 hover:text-cobalt" target="_blank" rel="noreferrer">GitHub</a>
          <button type="button" onClick={onSearch} className="label border border-line px-3 py-2 hover:bg-tint" aria-label="Search">
            Search <span className="text-muted">/</span>
          </button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
