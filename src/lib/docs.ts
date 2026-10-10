import { parseFrontmatter, type Frontmatter } from './frontmatter'
import { expandIncludes } from './includes'

export type Doc = Frontmatter & { id: string; path: string; body: string; readingTime: string }

export function buildDocs(files: Record<string, string>, includes: Record<string, string>): Doc[] {
  const docs = Object.entries(files).map(([file, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const id = file.replace(/\.md$/, '')
    const expanded = expandIncludes(body, includes)
    const words = expanded.split(/\s+/).filter(Boolean).length
    return {
      ...data,
      id,
      path: `/docs/${id}`,
      body: expanded,
      readingTime: `${Math.max(1, Math.round(words / 200))} min`,
    }
  })
  const seen = new Set<number>()
  for (const d of docs) {
    if (seen.has(d.order)) throw new Error(`Duplicate order ${d.order} (${d.id})`)
    seen.add(d.order)
  }
  return docs.sort((a, b) => a.order - b.order)
}

export function groupByCategory(docs: Doc[]): { category: string; docs: Doc[] }[] {
  const groups: { category: string; docs: Doc[] }[] = []
  for (const doc of docs) {
    let g = groups.find((x) => x.category === doc.category)
    if (!g) groups.push((g = { category: doc.category, docs: [] }))
    g.docs.push(doc)
  }
  return groups
}

export function neighbours(docs: Doc[], id: string): { prev: Doc | null; next: Doc | null } {
  const i = docs.findIndex((d) => d.id === id)
  return { prev: i > 0 ? docs[i - 1] : null, next: i >= 0 && i < docs.length - 1 ? docs[i + 1] : null }
}
