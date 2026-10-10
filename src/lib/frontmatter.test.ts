import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from './frontmatter'

const page = `---
title: Installation
description: "Add the starter: Maven or Gradle."
category: Getting started
order: 1
---
# Installation
`

describe('parseFrontmatter', () => {
  it('parses fields, strips quotes, keeps colons in values and coerces order', () => {
    const { data, body } = parseFrontmatter(page)
    expect(data).toEqual({
      title: 'Installation',
      description: 'Add the starter: Maven or Gradle.',
      category: 'Getting started',
      order: 1,
    })
    expect(body.trim()).toBe('# Installation')
  })

  it('throws naming the missing field', () => {
    expect(() => parseFrontmatter('---\ntitle: X\n---\nbody')).toThrow(/description/)
  })

  it('throws when there is no frontmatter', () => {
    expect(() => parseFrontmatter('# Just a heading')).toThrow(/frontmatter/)
  })
})
