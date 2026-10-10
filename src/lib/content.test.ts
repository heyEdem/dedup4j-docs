import { describe, expect, it } from 'vitest'
import { docs } from './content'
import { resolveLink } from './links'
import { extractToc } from './slug'

const ids = new Set(docs.map((d) => d.id))
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g

describe('converted content', () => {
  it('publishes the 12 expected pages', () => {
    expect(docs.map((d) => d.id)).toEqual([
      'getting-started/installation', 'getting-started/quick-start',
      'guides/spring-boot', 'guides/providers', 'guides/uploading', 'guides/lifecycle', 'guides/observability',
      'reference/configuration', 'reference/api', 'reference/troubleshooting',
      'architecture', 'contributing',
    ])
  })

  it.each(docs.map((d) => [d.id, d] as const))('%s has no MkDocs-only syntax left', (_id, d) => {
    expect(d.body).not.toMatch(/^\s*!!! /m)
    expect(d.body).not.toMatch(/^\s*=== "/m)
    expect(d.body.replace(/```[\s\S]*?```/g, '')).not.toContain('--8<--')
    expect(d.body).not.toMatch(/\{ \.md-button/)
  })

  it.each(docs.map((d) => [d.id, d] as const))('%s has only resolvable internal links', (_id, d) => {
    for (const m of d.body.matchAll(LINK)) {
      const link = resolveLink(m[1], d.id)
      if (link.kind !== 'doc') continue
      expect(ids.has(link.docId), `${d.id} -> ${m[1]}`).toBe(true)
      if (link.hash) {
        const target = docs.find((x) => x.id === link.docId)!
        expect(extractToc(target.body).some((t) => t.id === link.hash), `${d.id} -> ${m[1]}`).toBe(true)
      }
    }
  })
})
