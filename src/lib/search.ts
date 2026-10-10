import MiniSearch from 'minisearch'
import type { Doc } from './docs'
import { slugify } from './slug'

export type SearchHit = { id: string; docId: string; path: string; title: string; heading: string; snippet: string }

type Section = Omit<SearchHit, 'snippet'> & { text: string }

function sections(doc: Doc): Section[] {
  const out: Section[] = []
  let heading = ''
  let slug = ''
  let buf: string[] = []
  let inCode = false
  const flush = () => {
    const text = buf.join(' ').replace(/\s+/g, ' ').trim()
    if (text || heading) {
      out.push({
        id: `${doc.id}#${slug}`,
        docId: doc.id,
        path: slug ? `${doc.path}#${slug}` : doc.path,
        title: doc.title,
        heading,
        text,
      })
    }
    buf = []
  }
  for (const line of doc.body.split('\n')) {
    if (/^\s*```/.test(line)) { inCode = !inCode; continue }
    const m = !inCode && /^(##|###) (.+)$/.exec(line)
    if (m) {
      flush()
      heading = m[2].replace(/`/g, '').trim()
      slug = slugify(heading)
    } else {
      buf.push(line.replace(/^#+ /, ''))
    }
  }
  flush()
  return out
}

export function buildSearch(docs: Doc[]) {
  const all = docs.flatMap(sections)
  const index = new MiniSearch<Section>({
    fields: ['title', 'heading', 'text'],
    storeFields: ['docId', 'path', 'title', 'heading', 'text'],
    searchOptions: { boost: { heading: 3, title: 2 }, prefix: true, fuzzy: 0.2 },
  })
  index.addAll(all)
  return {
    search(query: string): SearchHit[] {
      if (!query.trim()) return []
      return index.search(query).slice(0, 8).map((r) => ({
        id: String(r.id),
        docId: r.docId as string,
        path: r.path as string,
        title: r.title as string,
        heading: r.heading as string,
        snippet: (r.text as string).slice(0, 140),
      }))
    },
  }
}
