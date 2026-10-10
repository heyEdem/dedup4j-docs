import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { remarkPlugins, rehypePlugins } from './markdown'

async function html(md: string) {
  const p = unified().use(remarkParse)
  for (const plugin of remarkPlugins) p.use(plugin as never)
  p.use(remarkRehype)
  for (const plugin of rehypePlugins) {
    if (Array.isArray(plugin)) p.use(plugin[0] as never, plugin[1] as never)
    else p.use(plugin as never)
  }
  return String(await p.use(rehypeStringify).process(md))
}

describe('alerts', () => {
  it('turns a GitHub alert with a bold title into a typed alert', async () => {
    const out = await html('> [!CAUTION]\n> **Rolling back does not restore it**\n>\n> Body text.')
    expect(out).toContain('data-alert="caution"')
    expect(out).toContain('class="alert-title"')
    expect(out).toContain('Body text.')
    expect(out).not.toContain('[!CAUTION]')
  })

  it('leaves an ordinary blockquote alone', async () => {
    const out = await html('> just a quote')
    expect(out).toContain('<blockquote>')
    expect(out).not.toContain('data-alert')
  })
})

describe('tabs', () => {
  it('renders tab containers with titles', async () => {
    const md = '::::tabs\n:::tab{title="Maven"}\n```xml\n<a/>\n```\n:::\n:::tab{title="Gradle"}\nx\n:::\n::::'
    const out = await html(md)
    expect(out).toContain('data-tabs="true"')
    expect(out).toContain('data-title="Maven"')
    expect(out).toContain('data-title="Gradle"')
  })
})

describe('directive fallback (Review Focus 1)', () => {
  it('keeps :word and times as literal text', async () => {
    const out = await html('Listen on :8080 or host:port at 10:30, see :Note here.')
    expect(out).toContain('Listen on :8080 or host:port at 10:30, see :Note here.')
  })
})

describe('highlighting (Review Focus 4)', () => {
  it('does not throw on registered, aliased or unknown languages', async () => {
    for (const lang of ['java', 'groovy', 'properties', 'yaml', 'nonsense']) {
      await expect(html('```' + lang + '\nfoo = bar\n```')).resolves.toContain('<code')
    }
  })
})

describe('highlighting produces tokens', () => {
  it('colours common languages and groovy', async () => {
    expect(await html('```java\npublic class A {}\n```')).toContain('hljs-keyword')
    expect(await html('```yaml\nkey: value\n```')).toContain('hljs-attr')
    expect(await html('```xml\n<a b="c"/>\n```')).toContain('hljs-tag')
    expect(await html("```groovy\ndef x = 'y'\n```")).toContain('hljs-')
  })
})

