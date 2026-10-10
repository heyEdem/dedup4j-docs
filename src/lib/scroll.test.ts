import { describe, expect, it } from 'vitest'
import { scrollPlan } from './scroll'

describe('scrollPlan', () => {
  it('scrolls to the element named by the hash when it exists', () => {
    expect(scrollPlan('#the-rule', (id) => id === 'the-rule')).toEqual({ to: 'id', id: 'the-rule' })
  })

  it('goes to the top when there is no hash', () => {
    expect(scrollPlan('', () => true)).toEqual({ to: 'top' })
  })

  it('goes to the top when the hash names nothing on the page', () => {
    expect(scrollPlan('#missing', () => false)).toEqual({ to: 'top' })
  })

  it('decodes percent-encoded hashes', () => {
    expect(scrollPlan('#a%20b', (id) => id === 'a b')).toEqual({ to: 'id', id: 'a b' })
  })
})
