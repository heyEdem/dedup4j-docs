// Prerenders every route to static HTML, writes sitemap.xml, llms.txt,
// llms-full.txt and raw Markdown copies of the docs, and fails the build on
// broken internal links.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const load = (f) => import(pathToFileURL(path.join(root, 'dist-ssr', f)).href)
const { render } = await load('entry-server.js')
const { docs, PAGES, renderHeadTags, getPageSeo, resolveLink, extractToc } = await load('prerender-data.js')

const SITE_URL = 'https://dedup4j.churchillakomaning.online'
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const today = new Date().toISOString().slice(0, 10)

// 1. Internal link check: every doc link must hit a published page and anchor.
const ids = new Map(docs.map((d) => [d.id, d]))
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g
const broken = []
for (const doc of docs) {
  for (const m of doc.body.replace(/```[\s\S]*?```/g, '').matchAll(LINK)) {
    const link = resolveLink(m[1], doc.id)
    if (link.kind !== 'doc') continue
    const target = ids.get(link.docId)
    if (!target) broken.push(`${doc.id}: ${m[1]} (no such page)`)
    else if (link.hash && !extractToc(target.body).some((t) => t.id === link.hash)) {
      broken.push(`${doc.id}: ${m[1]} (no such anchor)`)
    }
  }
}
if (broken.length) {
  console.error('Broken internal links:\n' + broken.map((b) => '  - ' + b).join('\n'))
  process.exit(1)
}

// 2. Static HTML for every page.
for (const page of PAGES) {
  const html = template
    .replace('<!--app-head-->', renderHeadTags(page))
    .replace('<!--app-html-->', render(page.path))
  const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`
  fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true })
  fs.writeFileSync(path.join(dist, file), html)
}

// 3. 404 page: shell only, noindex; the client router renders NotFound.
fs.writeFileSync(
  path.join(dist, '404.html'),
  template
    .replace('<!--app-head-->', renderHeadTags({ ...getPageSeo('/'), title: 'Page not found — dedup4j' }) + '\n    <meta name="robots" content="noindex" />')
    .replace('<!--app-html-->', ''),
)

// 4. sitemap.xml
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url>
    <loc>${SITE_URL}${p.path === '/' ? '' : p.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${p.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
).join('\n')}
</urlset>
`,
)

// 5. Raw markdown copies, llms.txt and llms-full.txt
for (const d of docs) {
  fs.mkdirSync(path.dirname(path.join(dist, 'docs', `${d.id}.md`)), { recursive: true })
  fs.writeFileSync(path.join(dist, 'docs', `${d.id}.md`), d.body)
}
const categories = [...new Set(docs.map((d) => d.category))]
fs.writeFileSync(
  path.join(dist, 'llms.txt'),
  `# dedup4j

> Store identical bytes once — deduplicated blob storage for Spring Boot, backed by your own database and object store.

- Source code: https://github.com/heyEdem/dedup4j
- Full documentation in one file: ${SITE_URL}/llms-full.txt

${categories
  .map(
    (c) =>
      `## ${c}\n\n${docs
        .filter((d) => d.category === c)
        .map((d) => `- [${d.title}](${SITE_URL}/docs/${d.id}.md): ${d.description}`)
        .join('\n')}`,
  )
  .join('\n\n')}
`,
)
fs.writeFileSync(
  path.join(dist, 'llms-full.txt'),
  docs.map((d) => `<!-- ${SITE_URL}/docs/${d.id} -->\n\n${d.body.trim()}`).join('\n\n---\n\n') + '\n',
)

fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
console.log(`Prerendered ${PAGES.length} pages, sitemap.xml, llms.txt and llms-full.txt`)
