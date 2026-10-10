export interface Frontmatter {
  title: string
  description: string
  category: string
  order: number
}

const REQUIRED = ['title', 'description', 'category', 'order'] as const

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) throw new Error('Missing frontmatter block')
  const fields: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 1) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1)
    fields[key] = value
  }
  for (const key of REQUIRED) {
    if (!fields[key]) throw new Error(`Frontmatter is missing "${key}"`)
  }
  const order = Number(fields.order)
  if (!Number.isFinite(order)) throw new Error('Frontmatter "order" must be a number')
  return {
    data: { title: fields.title, description: fields.description, category: fields.category, order },
    body: m[2],
  }
}
