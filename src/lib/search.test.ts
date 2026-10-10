import { describe, expect, it } from 'vitest'
import { buildDocs } from './docs'
import { buildSearch } from './search'

const fm = (t: string, o: number) => `---\ntitle: ${t}\ndescription: d\ncategory: C\norder: ${o}\n---\n`
const docs = buildDocs(
  {
    'a.md': fm('Uploading', 1) + '# Uploading\n\n## Batches\n\nRetain a blob before you release it.\n\n## Limits\n\nUploads are capped at 25 MB.',
    'b.md': fm('Config', 2) + '# Config\n\n## Properties\n\nSet the storage directory explicitly.',
  },
  {},
)
const { search } = buildSearch(docs)

describe('search', () => {
  it('finds a section by body text and links to its heading', () => {
    const [hit] = search('capped')
    expect(hit.docId).toBe('a')
    expect(hit.path).toBe('/docs/a#limits')
    expect(hit.heading).toBe('Limits')
  })

  it('matches by prefix and tolerates small typos', () => {
    expect(search('direct')[0].docId).toBe('b')
    expect(search('uplaoding').length).toBeGreaterThan(0)
  })

  it('returns nothing for an empty query', () => {
    expect(search('  ')).toEqual([])
  })
})

describe('search over the real docs', () => {
  it('finds the presigned-URL guidance', async () => {
    const { docs: real } = await import('./content')
    const hits = buildSearch(real).search('presigned')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.docId === 'guides/lifecycle')).toBe(true)
  })
})
