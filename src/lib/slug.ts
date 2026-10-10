export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Flattens React children (strings, numbers, arrays, elements) to plain text.
export function textOf(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const props = (node as { props?: { children?: unknown } }).props
  return props ? textOf(props.children) : ''
}

export const headingId = (children: unknown): string => slugify(textOf(children))

export type TocItem = { id: string; text: string; level: 2 | 3 }

export function extractToc(body: string): TocItem[] {
  const items: TocItem[] = []
  let inCode = false
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    const m = /^(##|###) (.+)$/.exec(line)
    if (!m) continue
    const text = m[2].trim().replace(/`/g, '').replace(/\*\*?/g, '')
    items.push({ id: slugify(text), text, level: m[1] === '##' ? 2 : 3 })
  }
  return items
}
