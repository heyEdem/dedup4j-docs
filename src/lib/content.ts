import { buildDocs, type Doc } from './docs'

const files = import.meta.glob(['../docs/**/*.md', '!../docs/_includes/**'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

const rawIncludes = import.meta.glob('../docs/_includes/*.md', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

const byName = (map: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k.slice(prefix.length), v]))

export const includes = byName(rawIncludes, '../docs/_includes/')
export const docs: Doc[] = buildDocs(byName(files, '../docs/'), includes)
export const getDoc = (id: string): Doc | undefined => docs.find((d) => d.id === id)
