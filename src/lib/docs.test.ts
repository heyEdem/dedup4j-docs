import { describe, expect, it } from 'vitest'
import { buildDocs, groupByCategory, neighbours } from './docs'

const fm = (title: string, category: string, order: number) =>
  `---\ntitle: ${title}\ndescription: d ${title}\ncategory: ${category}\norder: ${order}\n---\n`

const files = {
  'guides/b.md': fm('B', 'Guides', 3) + '--8<-- "x.md"\n',
  'a.md': fm('A', 'Start', 1) + 'words '.repeat(450),
  'guides/c.md': fm('C', 'Guides', 2) + 'c',
}
const docs = buildDocs(files, { 'x.md': 'INCLUDED' })

describe('buildDocs', () => {
  it('sorts by order, derives id/path, expands includes and reading time', () => {
    expect(docs.map((d) => d.id)).toEqual(['a', 'guides/c', 'guides/b'])
    expect(docs[0].path).toBe('/docs/a')
    expect(docs[2].body).toContain('INCLUDED')
    expect(docs[0].readingTime).toBe('2 min')
  })

  it('rejects duplicate order values', () => {
    expect(() => buildDocs({ 'a.md': fm('A', 'S', 1) + 'a', 'b.md': fm('B', 'S', 1) + 'b' }, {})).toThrow(/order/)
  })
})

describe('groupByCategory / neighbours', () => {
  it('groups in order of first appearance', () => {
    expect(groupByCategory(docs).map((g) => [g.category, g.docs.length])).toEqual([['Start', 1], ['Guides', 2]])
  })

  it('finds prev/next, null at the ends', () => {
    expect(neighbours(docs, 'a')).toEqual({ prev: null, next: docs[1] })
    expect(neighbours(docs, 'guides/b')).toEqual({ prev: docs[1], next: null })
  })
})
