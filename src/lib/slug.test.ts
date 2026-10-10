import { describe, expect, it } from 'vitest'
import { extractToc, headingId, slugify, textOf } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Retrieval, retain & release')).toBe('retrieval-retain-release')
  })
})

describe('textOf', () => {
  it('flattens strings, arrays and element-like children', () => {
    const el = { props: { children: 'server.address' } }
    expect(textOf(['The ', el, ' setting'])).toBe('The server.address setting')
  })
})

describe('extractToc', () => {
  const body = ['# Title', '## The `server.address` setting', '```', '## not a heading', '```', '### Sub one'].join('\n')

  it('lists h2/h3, skipping fenced code and the h1', () => {
    expect(extractToc(body).map((t) => [t.level, t.text])).toEqual([
      [2, 'The server.address setting'],
      [3, 'Sub one'],
    ])
  })

  it('gives the same id as the rendered heading (inline code in headings)', () => {
    const [item] = extractToc(body)
    const rendered = headingId(['The ', { props: { children: 'server.address' } }, ' setting'])
    expect(item.id).toBe(rendered)
  })
})
