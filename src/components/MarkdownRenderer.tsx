import ReactMarkdown, { type Components } from 'react-markdown'
import { Link } from 'react-router'
import { rehypePlugins, remarkPlugins } from '../lib/markdown'
import { headingId } from '../lib/slug'
import { resolveLink } from '../lib/links'
import { Alert } from './Alert'
import { Tabs } from './Tabs'
import { CodeBlock } from './CodeBlock'

export function MarkdownRenderer({ body, fromId }: { body: string; fromId: string }) {
  const components: Components = {
    h2: ({ node: _n, children }) => <h2 id={headingId(children)}>{children}</h2>,
    h3: ({ node: _n, children }) => <h3 id={headingId(children)}>{children}</h3>,
    pre: ({ node: _n, children }) => <CodeBlock>{children}</CodeBlock>,
    div: ({ node: _n, children, ...props }) => {
      const p = props as Record<string, string>
      if (p['data-tabs']) return <Tabs>{children}</Tabs>
      if (p['data-alert']) return <Alert kind={p['data-alert']}>{children}</Alert>
      return <div {...props}>{children}</div>
    },
    a: ({ node: _n, href = '', children }) => {
      const link = resolveLink(href, fromId)
      if (link.kind === 'external') {
        return <a href={link.href} target="_blank" rel="noreferrer noopener">{children}</a>
      }
      if (link.kind === 'hash') return <a href={link.href}>{children}</a>
      return <Link to={link.href}>{children}</Link>
    },
    table: ({ node: _n, children }) => (
      <div className="table-wrap"><table>{children}</table></div>
    ),
  }
  return (
    <div className="prose-docs">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins as never} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  )
}
