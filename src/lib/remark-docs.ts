import type { Blockquote, Root, Text } from 'mdast'
import type {} from 'mdast-util-directive'
import type { VFile } from 'vfile'
import { visit } from 'unist-util-visit'

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/

function asAlert(node: Blockquote) {
  const first = node.children[0]
  if (first?.type !== 'paragraph') return
  let lead = ''
  let n = 0
  while (n < first.children.length && first.children[n].type === 'text') {
    lead += (first.children[n] as Text).value
    n++
  }
  const match = MARKER.exec(lead)
  if (!match) return
  const rest = lead.slice(match[0].length)
  first.children.splice(0, n, ...(rest ? [{ type: 'text', value: rest } as Text] : []))
  if (first.children.length === 0) {
    node.children.shift()
  } else if (first.children.length === 1 && first.children[0].type === 'strong') {
    first.data = { hProperties: { className: ['alert-title'] } }
  }
  node.data = { hName: 'div', hProperties: { dataAlert: match[1].toLowerCase() } }
}

export function remarkDocs() {
  return (tree: Root, file: VFile) => {
    const source = String(file)
    visit(tree, (node, index, parent) => {
      if (node.type === 'blockquote') {
        asAlert(node)
      } else if (node.type === 'containerDirective' && node.name === 'tabs') {
        node.data = { hName: 'div', hProperties: { dataTabs: 'true' } }
      } else if (node.type === 'containerDirective' && node.name === 'tab') {
        node.data = { hName: 'section', hProperties: { dataTitle: node.attributes?.title ?? 'Tab' } }
      } else if (
        (node.type === 'textDirective' || node.type === 'leafDirective' || node.type === 'containerDirective') &&
        parent &&
        index !== undefined &&
        node.position
      ) {
        // Not one of ours: put the original source back as literal text.
        const raw = source.slice(node.position.start.offset, node.position.end.offset)
        const text: Text = { type: 'text', value: raw }
        parent.children[index] = node.type === 'textDirective' ? text : { type: 'paragraph', children: [text] }
      }
    })
  }
}
