import { describe, expect, it } from 'vitest'
import { resolveLink } from './links'

describe('resolveLink', () => {
  it('passes external and mailto links through', () => {
    expect(resolveLink('https://example.com/x', 'guides/a').kind).toBe('external')
    expect(resolveLink('mailto:a@b.c', 'guides/a').kind).toBe('external')
  })

  it('keeps hash-only links', () => {
    expect(resolveLink('#credentials', 'guides/a')).toEqual({ kind: 'hash', href: '#credentials' })
  })

  it('resolves sibling .md links', () => {
    expect(resolveLink('uploading.md', 'guides/lifecycle')).toMatchObject({
      kind: 'doc', href: '/docs/guides/uploading', docId: 'guides/uploading',
    })
  })

  it('resolves ../ links with anchors', () => {
    expect(resolveLink('../guides/providers.md#credentials', 'reference/configuration')).toMatchObject({
      kind: 'doc', href: '/docs/guides/providers#credentials', docId: 'guides/providers', hash: 'credentials',
    })
  })

  it('resolves top-level pages from nested ones', () => {
    expect(resolveLink('../architecture.md', 'guides/lifecycle')).toMatchObject({ docId: 'architecture' })
  })

  it('resolves from a top-level page', () => {
    expect(resolveLink('guides/lifecycle.md', 'architecture')).toMatchObject({ docId: 'guides/lifecycle' })
  })
})
