const INCLUDE = /^([ \t]*)--8<--\s+"([^"]+)"[ \t]*$/
const FENCE = /^\s*```/

// Expands `--8<-- "file.md"` lines. Lines inside fenced code are left alone so
// a page can document the syntax itself.
export function expandIncludes(md: string, includes: Record<string, string>): string {
  let inCode = false
  return md
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        inCode = !inCode
        return line
      }
      const m = !inCode && INCLUDE.exec(line)
      if (!m) return line
      const [, indent, name] = m
      const content = includes[name]
      if (content === undefined) throw new Error(`Unknown include: ${name}`)
      return content
        .replace(/\n$/, '')
        .split('\n')
        .map((l) => (l ? indent + l : l))
        .join('\n')
    })
    .join('\n')
}
