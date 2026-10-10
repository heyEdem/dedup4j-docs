import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import rehypeHighlight from 'rehype-highlight'
import { common } from 'lowlight'
import groovy from 'highlight.js/lib/languages/groovy'
import { remarkDocs } from './remark-docs'

export const remarkPlugins = [remarkGfm, remarkDirective, remarkDocs]

export const rehypePlugins = [
  [
    rehypeHighlight,
    { languages: { ...common, groovy }, aliases: { ini: ['properties'] } },
  ],
]
