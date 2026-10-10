export type ResolvedLink =
  | { kind: 'external'; href: string }
  | { kind: 'hash'; href: string }
  | { kind: 'doc'; href: string; docId: string; hash?: string }

export function resolveLink(href: string, fromId: string): ResolvedLink {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return { kind: 'external', href }
  if (href.startsWith('#')) return { kind: 'hash', href }
  const [file, hash] = href.split('#')
  const parts = fromId.split('/').slice(0, -1)
  for (const seg of file.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.' && seg !== '') parts.push(seg)
  }
  const docId = parts.join('/').replace(/\.md$/, '')
  return {
    kind: 'doc',
    href: `/docs/${docId}${hash ? `#${hash}` : ''}`,
    docId,
    ...(hash ? { hash } : {}),
  }
}
