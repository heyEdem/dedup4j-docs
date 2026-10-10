import { REPO_URL } from '../site'

export function Footer() {
  return (
    <footer className="border-t border-line py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5">
        <span>dedup4j · Apache License 2.0</span>
        <a href={REPO_URL} className="hover:text-cobalt">github.com/heyEdem/dedup4j</a>
      </div>
    </footer>
  )
}
