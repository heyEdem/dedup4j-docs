const INCLUDE = /^([ \t]*)--8<--\s+"([^"]+)"[ \t]*$/gm

export function expandIncludes(md: string, includes: Record<string, string>): string {
  return md.replace(INCLUDE, (_m, indent: string, name: string) => {
    const content = includes[name]
    if (content === undefined) throw new Error(`Unknown include: ${name}`)
    return content
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => (line ? indent + line : line))
      .join('\n')
  })
}
