import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { docs, getDoc } from '../lib/content'
import { neighbours } from '../lib/docs'
import { extractToc } from '../lib/slug'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Sidebar } from './Sidebar'
import { Toc } from './Toc'
import { NotFound } from './NotFound'
import { DOCS_REPO_URL } from '../site'

export function DocsPage() {
  const id = useParams()['*'] ?? ''
  const doc = getDoc(id)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!id) return <Navigate to={docs[0].path} replace />
  if (!doc) return <NotFound />
  const { prev, next } = neighbours(docs, doc.id)

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
      <button
        type="button"
        className="label border border-line px-3 py-2 lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Menu
      </button>
      <aside className={`${open ? 'block' : 'hidden'} lg:sticky lg:top-20 lg:block lg:self-start`}>
        <Sidebar docs={docs} onNavigate={() => setOpen(false)} />
      </aside>
      <article className="min-w-0">
        <div className="label text-cobalt">{doc.category}</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-muted">{doc.description} · {doc.readingTime}</p>
        <MarkdownRenderer body={doc.body.replace(/^# .*\n/, '')} fromId={doc.id} />
        <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
          {prev ? <Link to={prev.path} className="hover:text-cobalt">← {prev.title}</Link> : <span />}
          {next ? <Link to={next.path} className="text-right hover:text-cobalt">{next.title} →</Link> : <span />}
        </nav>
        <p className="mt-6 flex gap-4 text-xs text-muted">
          <a href={`${DOCS_REPO_URL}/blob/main/src/docs/${doc.id}.md`} className="hover:text-cobalt">View source</a>
          <button
            type="button"
            className="hover:text-cobalt"
            onClick={() => {
              void navigator.clipboard.writeText(doc.body)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied' : 'Copy page as Markdown'}
          </button>
        </p>
      </article>
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <Toc items={extractToc(doc.body)} />
      </aside>
    </div>
  )
}
