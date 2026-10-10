import { useState, type ReactNode } from 'react'
import { textOf } from '../lib/slug'

export function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(textOf(children).replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="codeblock">
      <button type="button" className="label codeblock-copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>{children}</pre>
    </div>
  )
}
