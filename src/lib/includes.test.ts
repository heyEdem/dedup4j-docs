import { describe, expect, it } from 'vitest'
import { expandIncludes } from './includes'

describe('expandIncludes', () => {
  const inc = { 'a.md': 'one\ntwo', 'b.md': 'bee' }

  it('replaces an include line with the file content', () => {
    expect(expandIncludes('x\n--8<-- "a.md"\ny', inc)).toBe('x\none\ntwo\ny')
  })

  it('keeps the indentation of the include line on every line', () => {
    expect(expandIncludes('  --8<-- "a.md"', inc)).toBe('  one\n  two')
  })

  it('throws on a missing include so the build fails', () => {
    expect(() => expandIncludes('--8<-- "nope.md"', inc)).toThrow(/nope\.md/)
  })

  it('leaves other text alone', () => {
    expect(expandIncludes('no includes here', inc)).toBe('no includes here')
  })
})
