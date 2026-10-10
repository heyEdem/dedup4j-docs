# React Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MkDocs Material site with a Vite + React site that renders the existing Markdown pages in the straden-docs style, deployed on Vercel.

**Architecture:** Markdown pages with YAML frontmatter live in `src/docs/` and are loaded with `import.meta.glob`. Pure functions in `src/lib/` (frontmatter, include expansion, link resolution, slugs, remark plugin, search) are unit-tested with Vitest. React components render them. A build script prerenders every route to static HTML and emits `sitemap.xml`, `llms.txt`, `llms-full.txt` and raw `.md` copies, and fails the build on broken internal links.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4, `react-router`, `react-markdown`, `remark-gfm`, `remark-directive`, `rehype-highlight`, MiniSearch, Vitest.

**Spec:** `docs/plans/2026-10-10-react-docs-site-design.md` (Task 10 amends it where this plan deliberately differs).

## Global Constraints

- Work directly on `main`; one commit per task step marked "Commit". The Pages deploy is allowed to be down until Task 10.
- Commit messages are conventional-commit style, **no attribution trailer of any kind** (user's global rule: write them as if the user wrote them).
- Site URL is a single constant in `src/site.ts`: `https://dedup4j.churchillakomaning.online` (temporary domain; the permanent one is not registered).
- Maven/Gradle coordinates exist only in `src/docs/_includes/` (single-sourced; no page hardcodes a version).
- Published pages = the 12 nav pages in the old `mkdocs.yml` plus the landing page. `docs/plans/` and `docs/releases/publishing.md` stay in the repo and are NOT published; links into them become absolute GitHub URLs.
- Style follows straden-docs: white paper, near-black ink, cobalt `#1f4fff` accent, hairline borders, Inter + JetBrains Mono, uppercase micro-labels. Light/dark follow the system setting with a manual toggle.
- Node 22+, npm. Lockfile `package-lock.json` is committed.

## Review Focus

Inputs the spec implies but no obvious task would test; each has a pinning test in the named task.

1. Prose containing `:word` / `10:30` / `:8080` must stay literal text, not be eaten by `remark-directive` (Task 4).
2. Relative `.md` links with `#anchors` and `../`, and links to unpublished files, must resolve or fail the build, never 404 silently (Tasks 3, 9).
3. Headings containing inline code (e.g. ``## `server.address` ``) must get the same id in the page and in the table of contents (Task 3).
4. Code fences with an unregistered language (`properties`, `nonsense`) must not crash rendering (Task 4).
5. A refresh or deep link on a prerendered docs URL must hydrate without mismatch, so nothing read from `localStorage`/`window` may affect first render (Tasks 5, 9).

## File Structure

```
package.json, vite.config.ts, tsconfig*.json, eslint.config.js, index.html, vercel.json
public/favicon.svg, robots.txt
scripts/prerender.mjs                 build: static HTML, sitemap, llms files, link check
src/main.tsx, entry-server.tsx        client hydrate / SSR entry
src/App.tsx                           routes
src/site.ts                           SITE_URL, REPO_URL, SITE_NAME
src/seo.ts, prerender-data.ts         per-page head tags, PAGES list, bundle for the prerender script
src/index.css                         tokens, prose, alert, tabs, hljs colours
src/lib/frontmatter.ts   (+test)      parse YAML-ish frontmatter
src/lib/includes.ts      (+test)      expand `--8<-- "file.md"`
src/lib/docs.ts          (+test)      buildDocs, groupByCategory, neighbours; glob wiring in src/lib/content.ts
src/lib/slug.ts          (+test)      slugify, textOf, extractToc
src/lib/links.ts         (+test)      resolveLink
src/lib/remark-docs.ts   (+test)      alerts, tabs, directive fallback
src/lib/search.ts        (+test)      MiniSearch index
src/lib/content.test.ts               integrity test over all real pages
src/components/MarkdownRenderer.tsx, Tabs.tsx, Alert.tsx, CodeBlock.tsx
src/components/Navigation.tsx, Footer.tsx, ThemeToggle.tsx, SearchPalette.tsx
src/components/DocsPage.tsx, Sidebar.tsx, Toc.tsx, LandingPage.tsx, NotFound.tsx, Seo.tsx
src/docs/**/*.md                      the 12 pages; src/docs/_includes/*.md snippets
```

---

### Task 1: Remove MkDocs and Pages scaffolding

**Files:**
- Delete: `mkdocs.yml`, `requirements.txt`, `.github/workflows/docs-deploy.yml`, `.github/workflows/docs-pr.yml`
- Modify: `.gitignore`, `.github/workflows/docs-links.yml`

`docs/**` content, `docs/plans/`, `docs/releases/`, `docs/CNAME` stay for now (pages are moved in Task 6, CNAME removed in Task 10).

- [ ] **Step 1: Delete the files and local build output**

```bash
git rm mkdocs.yml requirements.txt .github/workflows/docs-deploy.yml .github/workflows/docs-pr.yml
rm -rf .venv site
```

- [ ] **Step 2: Replace `.gitignore`**

```gitignore
# Node
node_modules/
dist/
dist-ssr/
*.log

# macOS
.DS_Store

# Vercel
.vercel/
```

- [ ] **Step 3: Point the external-link check at the new content location**

In `.github/workflows/docs-links.yml` change the lychee `args` line to:

```yaml
          args: --no-progress --accept 200,206,429 'src/docs/**/*.md' 'README.md'
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove MkDocs toolchain and GitHub Pages workflows"
```

---

### Task 2: Scaffold the Vite app with Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `index.html`, `public/favicon.svg`, `public/robots.txt`, `src/main.tsx`, `src/entry-server.tsx`, `src/App.tsx`, `src/site.ts`, `src/index.css`

**Interfaces:**
- Produces: `src/site.ts` exports `SITE_NAME: string`, `SITE_URL: string`, `REPO_URL: string`, `DOCS_REPO_URL: string`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "dedup4j-docs",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "tsc -b && vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && vite build --ssr src/prerender-data.ts --outDir dist-ssr --emptyOutDir false && node scripts/prerender.mjs",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom react-router react-markdown remark-gfm remark-directive rehype-highlight highlight.js unist-util-visit minisearch tailwindcss @tailwindcss/vite
npm install -D typescript vite @vitejs/plugin-react vitest @types/react @types/react-dom @types/node @types/mdast mdast-util-directive unified remark-parse remark-rehype rehype-stringify eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

- [ ] **Step 3: Copy the TypeScript and ESLint configs from straden-docs and add Vitest**

```bash
for f in tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js; do
  gh api repos/kwasii1/straden-docs/contents/$f --jq .content | base64 -d > $f
done
```

Then in `tsconfig.node.json` make sure `"include"` lists `"vite.config.ts"`. Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 4: Create `src/site.ts`**

```ts
export const SITE_NAME = 'dedup4j'
// Temporary custom domain; swap here, in vercel.json domains and the Vercel project.
export const SITE_URL = 'https://dedup4j.churchillakomaning.online'
export const REPO_URL = 'https://github.com/heyEdem/dedup4j'
export const DOCS_REPO_URL = 'https://github.com/heyEdem/dedup4j-docs'
```

- [ ] **Step 5: Create `index.html`**

The inline script sets the theme before first paint (no flash). It only touches `document.documentElement`, never React state, so hydration is unaffected.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="theme-color" content="#1f4fff" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <link rel="alternate" type="text/plain" title="LLM-friendly documentation" href="/llms.txt" />
    <script>
      try {
        var t = localStorage.getItem('theme');
        if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
      } catch (e) {}
    </script>
    <!--app-head-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"><!--app-html--></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `public/favicon.svg` and `public/robots.txt`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1f4fff"/><rect x="7" y="7" width="8" height="18" fill="#fff"/><rect x="17" y="7" width="8" height="8" fill="#fff"/></svg>
```

```text
User-agent: *
Allow: /
Sitemap: https://dedup4j.churchillakomaning.online/sitemap.xml
```

- [ ] **Step 7: Create `src/index.css` (tokens, dark mode, base)**

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-cobalt: var(--cobalt);
  --color-line: var(--line);
  --color-tint: var(--tint);
}

:root {
  --paper: #ffffff;
  --ink: #0a0a0a;
  --muted: rgba(10, 10, 10, 0.6);
  --cobalt: #1f4fff;
  --line: rgba(10, 10, 10, 0.12);
  --tint: #fafafa;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #0b0d12; --ink: #f2f4f8; --muted: rgba(242, 244, 248, 0.62);
    --cobalt: #6f8dff; --line: rgba(242, 244, 248, 0.14); --tint: #12151c;
  }
}
:root[data-theme="dark"] {
  --paper: #0b0d12; --ink: #f2f4f8; --muted: rgba(242, 244, 248, 0.62);
  --cobalt: #6f8dff; --line: rgba(242, 244, 248, 0.14); --tint: #12151c;
}

html { scroll-behavior: smooth; }
body {
  background: var(--paper); color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
code, pre { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
::selection { background: #1f4fff; color: #fff; }

.label { font-size: 11px; line-height: 1.2; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
```

- [ ] **Step 8: Create the app shell**

`src/App.tsx`:

```tsx
export default function App() {
  return <main className="p-8">dedup4j docs</main>
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Pages are prerendered at build time; hydrate them instead of re-rendering.
if (container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
```

`src/entry-server.tsx`:

```tsx
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App.tsx'

export function render(url: string) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
}
```

- [ ] **Step 9: Verify**

Run: `npx tsc -b && npx vite build && npx vitest run --passWithNoTests`
Expected: all three succeed (vitest reports no test files).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React app with Tailwind and Vitest"
```

---

### Task 3: Content library (frontmatter, includes, docs, slugs, links)

**Files:**
- Create: `src/lib/frontmatter.ts`, `src/lib/includes.ts`, `src/lib/docs.ts`, `src/lib/slug.ts`, `src/lib/links.ts` and a `*.test.ts` next to each.

**Interfaces:**
- Produces:
  - `parseFrontmatter(raw: string): { data: Frontmatter; body: string }` where `Frontmatter = { title: string; description: string; category: string; order: number }`
  - `expandIncludes(md: string, includes: Record<string, string>): string`
  - `type Doc = Frontmatter & { id: string; path: string; body: string; readingTime: string }`
  - `buildDocs(files: Record<string, string>, includes: Record<string, string>): Doc[]` (files keyed by id-ish path like `getting-started/installation.md`; sorted by `order`)
  - `groupByCategory(docs: Doc[]): { category: string; docs: Doc[] }[]` (categories in order of first appearance)
  - `neighbours(docs: Doc[], id: string): { prev: Doc | null; next: Doc | null }`
  - `slugify(text: string): string`, `textOf(node: unknown): string`, `headingId(children: unknown): string`
  - `type TocItem = { id: string; text: string; level: 2 | 3 }`, `extractToc(body: string): TocItem[]`
  - `resolveLink(href: string, fromId: string): { kind: 'external' | 'hash' | 'doc'; href: string; docId?: string; hash?: string }`

- [ ] **Step 1: Write the failing tests**

`src/lib/frontmatter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from './frontmatter'

const page = `---
title: Installation
description: "Add the starter: Maven or Gradle."
category: Getting started
order: 1
---
# Installation
`

describe('parseFrontmatter', () => {
  it('parses fields, strips quotes, keeps colons in values and coerces order', () => {
    const { data, body } = parseFrontmatter(page)
    expect(data).toEqual({
      title: 'Installation',
      description: 'Add the starter: Maven or Gradle.',
      category: 'Getting started',
      order: 1,
    })
    expect(body.trim()).toBe('# Installation')
  })

  it('throws naming the missing field', () => {
    expect(() => parseFrontmatter('---\ntitle: X\n---\nbody')).toThrow(/description/)
  })

  it('throws when there is no frontmatter', () => {
    expect(() => parseFrontmatter('# Just a heading')).toThrow(/frontmatter/)
  })
})
```

`src/lib/includes.test.ts`:

```ts
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
```

`src/lib/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractToc, headingId, slugify, textOf } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Retrieval, retain & release')).toBe('retrieval-retain-release')
  })
})

describe('textOf', () => {
  it('flattens strings, arrays and element-like children', () => {
    const el = { props: { children: 'server.address' } }
    expect(textOf(['The ', el, ' setting'])).toBe('The server.address setting')
  })
})

describe('extractToc', () => {
  const body = ['# Title', '## The `server.address` setting', '```', '## not a heading', '```', '### Sub one'].join('\n')

  it('lists h2/h3, skipping fenced code and the h1', () => {
    expect(extractToc(body).map((t) => [t.level, t.text])).toEqual([
      [2, 'The server.address setting'],
      [3, 'Sub one'],
    ])
  })

  it('gives the same id as the rendered heading (inline code in headings)', () => {
    const [item] = extractToc(body)
    const rendered = headingId(['The ', { props: { children: 'server.address' } }, ' setting'])
    expect(item.id).toBe(rendered)
  })
})
```

`src/lib/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveLink } from './links'

describe('resolveLink', () => {
  it('passes external and mailto links through', () => {
    expect(resolveLink('https://example.com/x', 'guides/a').kind).toBe('external')
    expect(resolveLink('mailto:a@b.c', 'guides/a').kind).toBe('external')
  })

  it('keeps hash-only links', () => {
    expect(resolveLink('#credentials', 'guides/a')).toEqual({ kind: 'hash', href: '#credentials' })
  })

  it('resolves sibling .md links', () => {
    expect(resolveLink('uploading.md', 'guides/lifecycle')).toMatchObject({
      kind: 'doc', href: '/docs/guides/uploading', docId: 'guides/uploading',
    })
  })

  it('resolves ../ links with anchors', () => {
    expect(resolveLink('../guides/providers.md#credentials', 'reference/configuration')).toMatchObject({
      kind: 'doc', href: '/docs/guides/providers#credentials', docId: 'guides/providers', hash: 'credentials',
    })
  })

  it('resolves top-level pages from nested ones', () => {
    expect(resolveLink('../architecture.md', 'guides/lifecycle').docId).toBe('architecture')
  })

  it('resolves from a top-level page', () => {
    expect(resolveLink('guides/lifecycle.md', 'architecture').docId).toBe('guides/lifecycle')
  })
})
```

`src/lib/docs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDocs, groupByCategory, neighbours } from './docs'

const fm = (title: string, category: string, order: number) =>
  `---\ntitle: ${title}\ndescription: d ${title}\ncategory: ${category}\norder: ${order}\n---\n`

const files = {
  'guides/b.md': fm('B', 'Guides', 3) + '--8<-- "x.md"\n',
  'a.md': fm('A', 'Start', 1) + 'words '.repeat(450),
  'guides/c.md': fm('C', 'Guides', 2) + 'c',
}
const docs = buildDocs(files, { 'x.md': 'INCLUDED' })

describe('buildDocs', () => {
  it('sorts by order, derives id/path, expands includes and reading time', () => {
    expect(docs.map((d) => d.id)).toEqual(['a', 'guides/c', 'guides/b'])
    expect(docs[0].path).toBe('/docs/a')
    expect(docs[2].body).toContain('INCLUDED')
    expect(docs[0].readingTime).toBe('3 min')
  })

  it('rejects duplicate order values', () => {
    expect(() => buildDocs({ 'a.md': fm('A', 'S', 1) + 'a', 'b.md': fm('B', 'S', 1) + 'b' }, {})).toThrow(/order/)
  })
})

describe('groupByCategory / neighbours', () => {
  it('groups in order of first appearance', () => {
    expect(groupByCategory(docs).map((g) => [g.category, g.docs.length])).toEqual([['Start', 1], ['Guides', 2]])
  })

  it('finds prev/next, null at the ends', () => {
    expect(neighbours(docs, 'a')).toEqual({ prev: null, next: docs[1] })
    expect(neighbours(docs, 'guides/b')).toEqual({ prev: docs[1], next: null })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/frontmatter.ts`:

```ts
export interface Frontmatter {
  title: string
  description: string
  category: string
  order: number
}

const REQUIRED = ['title', 'description', 'category', 'order'] as const

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) throw new Error('Missing frontmatter block')
  const fields: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 1) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1)
    fields[key] = value
  }
  for (const key of REQUIRED) {
    if (!fields[key]) throw new Error(`Frontmatter is missing "${key}"`)
  }
  const order = Number(fields.order)
  if (!Number.isFinite(order)) throw new Error('Frontmatter "order" must be a number')
  return {
    data: { title: fields.title, description: fields.description, category: fields.category, order },
    body: m[2],
  }
}
```

`src/lib/includes.ts`:

```ts
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
```

`src/lib/docs.ts`:

```ts
import { parseFrontmatter, type Frontmatter } from './frontmatter'
import { expandIncludes } from './includes'

export type Doc = Frontmatter & { id: string; path: string; body: string; readingTime: string }

export function buildDocs(files: Record<string, string>, includes: Record<string, string>): Doc[] {
  const docs = Object.entries(files).map(([file, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const id = file.replace(/\.md$/, '')
    const expanded = expandIncludes(body, includes)
    const words = expanded.split(/\s+/).filter(Boolean).length
    return {
      ...data,
      id,
      path: `/docs/${id}`,
      body: expanded,
      readingTime: `${Math.max(1, Math.round(words / 200))} min`,
    }
  })
  const seen = new Set<number>()
  for (const d of docs) {
    if (seen.has(d.order)) throw new Error(`Duplicate order ${d.order} (${d.id})`)
    seen.add(d.order)
  }
  return docs.sort((a, b) => a.order - b.order)
}

export function groupByCategory(docs: Doc[]): { category: string; docs: Doc[] }[] {
  const groups: { category: string; docs: Doc[] }[] = []
  for (const doc of docs) {
    let g = groups.find((x) => x.category === doc.category)
    if (!g) groups.push((g = { category: doc.category, docs: [] }))
    g.docs.push(doc)
  }
  return groups
}

export function neighbours(docs: Doc[], id: string): { prev: Doc | null; next: Doc | null } {
  const i = docs.findIndex((d) => d.id === id)
  return { prev: i > 0 ? docs[i - 1] : null, next: i >= 0 && i < docs.length - 1 ? docs[i + 1] : null }
}
```

`src/lib/slug.ts`:

```ts
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Flattens React children (strings, numbers, arrays, elements) to plain text.
export function textOf(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const props = (node as { props?: { children?: unknown } }).props
  return props ? textOf(props.children) : ''
}

export const headingId = (children: unknown): string => slugify(textOf(children))

export type TocItem = { id: string; text: string; level: 2 | 3 }

export function extractToc(body: string): TocItem[] {
  const items: TocItem[] = []
  let inCode = false
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    const m = /^(##|###) (.+)$/.exec(line)
    if (!m) continue
    const text = m[2].trim().replace(/`/g, '').replace(/\*\*?/g, '')
    items.push({ id: slugify(text), text, level: m[1] === '##' ? 2 : 3 })
  }
  return items
}
```

`src/lib/links.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add content library for frontmatter, includes, docs, slugs and links"
```

---

### Task 4: Remark plugin (alerts, tabs, directive fallback) and highlighting

**Files:**
- Create: `src/lib/remark-docs.ts`, `src/lib/remark-docs.test.ts`, `src/lib/markdown.ts`

**Interfaces:**
- Produces:
  - `remarkDocs(): (tree: Root, file: VFile) => void` unified plugin.
  - `src/lib/markdown.ts` exports `remarkPlugins`, `rehypePlugins` arrays used by both the renderer and tests.
  - Output HTML contract: alert → `<div data-alert="warning|note|tip|important|caution">`; title paragraph gets class `alert-title`; tabs → `<div data-tabs="true">` containing `<section data-title="Maven">`.

- [ ] **Step 1: Write the failing test**

`src/lib/remark-docs.test.ts`:

```ts
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
  for (const plugin of rehypePlugins) p.use(plugin as never)
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/remark-docs.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the plugin**

`src/lib/remark-docs.ts`:

```ts
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
```

`src/lib/markdown.ts`:

```ts
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import rehypeHighlight from 'rehype-highlight'
import groovy from 'highlight.js/lib/languages/groovy'
import { remarkDocs } from './remark-docs'

export const remarkPlugins = [remarkGfm, remarkDirective, remarkDocs]

export const rehypePlugins = [
  [
    rehypeHighlight,
    { ignoreMissing: true, languages: { groovy }, aliases: { ini: ['properties'] } },
  ],
]
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: all pass. If the directive-fallback test fails because remark-directive consumed `:Note`, fix the fallback branch in `remarkDocs` (the text directive replacement must restore exactly the original characters) rather than weakening the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add remark plugin for alerts, tabs and literal directive fallback"
```

---

### Task 5: Content loading, renderer, layout and routes

**Files:**
- Create: `src/lib/content.ts`, `src/components/MarkdownRenderer.tsx`, `Alert.tsx`, `Tabs.tsx`, `CodeBlock.tsx`, `Navigation.tsx`, `Footer.tsx`, `ThemeToggle.tsx`, `Sidebar.tsx`, `Toc.tsx`, `DocsPage.tsx`, `NotFound.tsx`, `Seo.tsx`, `src/seo.ts`, `src/prerender-data.ts`
- Modify: `src/App.tsx`, `src/index.css`
- Create (temporary fixture, deleted in Task 6): `src/docs/getting-started/installation.md`

**Interfaces:**
- Consumes: everything from Task 3 and 4.
- Produces:
  - `src/lib/content.ts`: `docs: Doc[]`, `includes: Record<string, string>`, `getDoc(id: string): Doc | undefined`
  - `<MarkdownRenderer doc={Doc}>`; `<DocsPage />` reads `useParams()['*']`.
  - `src/seo.ts`: `type PageSeo = { path: string; title: string; description: string }`, `PAGES: PageSeo[]`, `getPageSeo(path: string): PageSeo`, `renderHeadTags(page: PageSeo): string`.
  - `src/prerender-data.ts` re-exports `docs`, `includes`, `PAGES`, `renderHeadTags`, `getPageSeo`, `resolveLink`, `extractToc`.

- [ ] **Step 1: Add a throwaway fixture page so the loader has content**

`src/docs/getting-started/installation.md`:

````markdown
---
title: Installation
description: Add the dedup4j starter to a Spring Boot application.
category: Getting started
order: 1
---
# Installation

## Requirements

Works with `server.address` set.

> [!WARNING]
> **Not yet on Maven Central**
>
> Placeholder until Task 6 moves the real page.

```java
var x = 1;
```
````

- [ ] **Step 2: Create `src/lib/content.ts`**

```ts
import { buildDocs, type Doc } from './docs'

const files = import.meta.glob(['../docs/**/*.md', '!../docs/_includes/**'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

const rawIncludes = import.meta.glob('../docs/_includes/*.md', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

const byName = (map: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k.slice(prefix.length), v]))

export const includes = byName(rawIncludes, '../docs/_includes/')
export const docs: Doc[] = buildDocs(byName(files, '../docs/'), includes)
export const getDoc = (id: string): Doc | undefined => docs.find((d) => d.id === id)
```

- [ ] **Step 3: Create the renderer pieces**

`src/components/Alert.tsx`:

```tsx
import type { ReactNode } from 'react'

const LABELS: Record<string, string> = {
  note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Danger',
}

export function Alert({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <div className="alert" data-kind={kind} role="note">
      <span className="label alert-label">{LABELS[kind] ?? kind}</span>
      {children}
    </div>
  )
}
```

`src/components/Tabs.tsx`:

```tsx
import { Children, isValidElement, useState, type ReactNode } from 'react'

export function Tabs({ children }: { children: ReactNode }) {
  const tabs = Children.toArray(children).filter(isValidElement) as {
    props: { 'data-title'?: string; children?: ReactNode }
  }[]
  const [active, setActive] = useState(0)
  return (
    <div className="tabs">
      <div role="tablist" className="tabs-list">
        {tabs.map((t, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            className="tabs-tab"
            onClick={() => setActive(i)}
          >
            {t.props['data-title']}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs[active]?.props.children}</div>
    </div>
  )
}
```

`src/components/CodeBlock.tsx`:

```tsx
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
```

`src/components/MarkdownRenderer.tsx`:

```tsx
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
```

Note: a `section` with `data-title` is rendered by react-markdown as a plain `<section>` element; `Tabs` reads its `data-title` prop and renders only the active section's children, so no extra component is needed.

- [ ] **Step 4: Create layout components**

`src/components/ThemeToggle.tsx` (reads `localStorage` only inside the click handler, never during render, so first render is identical on server and client):

```tsx
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement
    const dark =
      root.dataset.theme === 'dark' ||
      (root.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const next = dark ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch { /* storage blocked */ }
  }
  return (
    <button type="button" onClick={toggle} className="label border border-line px-3 py-2 hover:bg-tint" aria-label="Toggle colour theme">
      Theme
    </button>
  )
}
```

`src/components/Navigation.tsx`:

```tsx
import { Link, NavLink } from 'react-router'
import { REPO_URL, SITE_NAME } from '../site'
import { ThemeToggle } from './ThemeToggle'

export function Navigation({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="text-lg font-extrabold tracking-tight">{SITE_NAME}</Link>
        <nav className="flex items-center gap-3">
          <NavLink to="/docs" className="label px-2 py-2 hover:text-cobalt">Docs</NavLink>
          <a href={REPO_URL} className="label px-2 py-2 hover:text-cobalt" target="_blank" rel="noreferrer">GitHub</a>
          <button type="button" onClick={onSearch} className="label border border-line px-3 py-2 hover:bg-tint" aria-label="Search">
            Search <span className="text-muted">/</span>
          </button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
```

`src/components/Footer.tsx`:

```tsx
import { REPO_URL } from '../site'

export function Footer() {
  return (
    <footer className="border-t border-line py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5">
        <span>dedup4j · Apache License 2.0</span>
        <a href={REPO_URL} className="hover:text-cobalt">github.com/heyEdem/dedup4j</a>
      </div>
    </footer>
  )
}
```

`src/components/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router'
import { groupByCategory, type Doc } from '../lib/docs'

export function Sidebar({ docs, onNavigate }: { docs: Doc[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="space-y-6">
      {groupByCategory(docs).map((g) => (
        <div key={g.category}>
          <div className="label mb-2 text-muted">{g.category}</div>
          <ul className="space-y-0.5">
            {g.docs.map((d) => (
              <li key={d.id}>
                <NavLink
                  to={d.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block border-l-2 py-1.5 pl-3 text-sm ${
                      isActive ? 'border-cobalt font-semibold text-cobalt' : 'border-transparent text-muted hover:text-ink'
                    }`
                  }
                >
                  {d.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
```

`src/components/Toc.tsx` (scroll-spy runs only in an effect):

```tsx
import { useEffect, useState } from 'react'
import type { TocItem } from '../lib/slug'

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120
      let current = ''
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (el && el.offsetTop <= y) current = item.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [items])

  if (items.length === 0) return null
  return (
    <nav aria-label="On this page">
      <div className="label mb-3 text-muted">On this page</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((t) => (
          <li key={t.id} className={t.level === 3 ? 'pl-3' : ''}>
            <a href={`#${t.id}`} className={active === t.id ? 'text-cobalt font-semibold' : 'text-muted hover:text-ink'}>
              {t.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

`src/components/NotFound.tsx`:

```tsx
import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-24">
      <div className="label text-cobalt">404</div>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">That page doesn't exist.</p>
      <Link to="/docs" className="mt-6 inline-block text-cobalt underline underline-offset-4">Go to the docs</Link>
    </section>
  )
}
```

`src/components/Seo.tsx` (updates the title client-side; the static head comes from the prerender):

```tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { getPageSeo } from '../seo'

export function Seo() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = getPageSeo(pathname).title
  }, [pathname])
  return null
}
```

`src/components/DocsPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { docs, getDoc } from '../lib/content'
import { neighbours } from '../lib/docs'
import { extractToc } from '../lib/slug'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Sidebar } from './Sidebar'
import { Toc } from './Toc'
import { NotFound } from './NotFound'
import { DOCS_REPO_URL } from '../site'

export function DocsPage() {
  const id = useParams()['*'] ?? ''
  const doc = getDoc(id)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!id) return <Navigate to={docs[0].path} replace />
  if (!doc) return <NotFound />
  const { prev, next } = neighbours(docs, doc.id)

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
      <button
        type="button"
        className="label border border-line px-3 py-2 lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Menu
      </button>
      <aside className={`${open ? 'block' : 'hidden'} lg:sticky lg:top-20 lg:block lg:self-start`}>
        <Sidebar docs={docs} onNavigate={() => setOpen(false)} />
      </aside>
      <article className="min-w-0">
        <div className="label text-cobalt">{doc.category}</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-muted">{doc.description} · {doc.readingTime}</p>
        <MarkdownRenderer body={doc.body.replace(/^# .*\n/, '')} fromId={doc.id} />
        <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
          {prev ? <Link to={prev.path} className="hover:text-cobalt">← {prev.title}</Link> : <span />}
          {next ? <Link to={next.path} className="text-right hover:text-cobalt">{next.title} →</Link> : <span />}
        </nav>
        <p className="mt-6 flex gap-4 text-xs text-muted">
          <a href={`${DOCS_REPO_URL}/blob/main/src/docs/${doc.id}.md`} className="hover:text-cobalt">View source</a>
          <button
            type="button"
            className="hover:text-cobalt"
            onClick={() => {
              void navigator.clipboard.writeText(doc.body)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied' : 'Copy page as Markdown'}
          </button>
        </p>
      </article>
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <Toc items={extractToc(doc.body)} />
      </aside>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/seo.ts` and `src/prerender-data.ts`**

`src/seo.ts`:

```ts
import { docs } from './lib/content'
import { SITE_NAME, SITE_URL } from './site'

export type PageSeo = { path: string; title: string; description: string }

const HOME: PageSeo = {
  path: '/',
  title: `${SITE_NAME} — deduplicated blob storage for Spring Boot`,
  description: 'Store identical bytes once — deduplicated blob storage for Spring Boot, backed by your own database and object store.',
}

export const PAGES: PageSeo[] = [
  HOME,
  ...docs.map((d) => ({ path: d.path, title: `${d.title} — ${SITE_NAME}`, description: d.description })),
]

export const getPageSeo = (path: string): PageSeo =>
  PAGES.find((p) => p.path === path.replace(/\/$/, '') || p.path === path) ?? HOME

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function renderHeadTags(page: PageSeo): string {
  const url = `${SITE_URL}${page.path === '/' ? '' : page.path}`
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ')
}
```

`src/prerender-data.ts`:

```ts
export { docs, includes } from './lib/content'
export { PAGES, renderHeadTags, getPageSeo } from './seo'
export { resolveLink } from './lib/links'
export { extractToc } from './lib/slug'
```

- [ ] **Step 6: Create `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { DocsPage } from './components/DocsPage'
import { NotFound } from './components/NotFound'
import { Seo } from './components/Seo'

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if ((e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Seo />
      <Navigation onSearch={() => setSearchOpen(true)} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Navigate to="/docs" replace />} />
          <Route path="/docs/*" element={<DocsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {searchOpen && null}
    </div>
  )
}
```

(The `/` redirect is temporary; Task 7 replaces it with the landing page and Task 8 mounts the search palette in place of `{searchOpen && null}`.)

- [ ] **Step 7: Add prose, alert, tabs, code and hljs styles to `src/index.css`**

```css
.prose-docs { margin-top: 1.5rem; line-height: 1.7; }
.prose-docs > :first-child { margin-top: 0; }
.prose-docs h2 { scroll-margin-top: 5rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; border-top: 1px solid var(--line); padding-top: 2rem; margin: 2.5rem 0 1rem; }
.prose-docs h3 { scroll-margin-top: 5rem; font-size: 1.125rem; font-weight: 700; margin: 1.75rem 0 0.75rem; }
.prose-docs p, .prose-docs li { color: color-mix(in srgb, var(--ink) 88%, transparent); }
.prose-docs p { margin: 1rem 0; overflow-wrap: anywhere; }
.prose-docs ul { list-style: disc; padding-left: 1.25rem; margin: 1rem 0; }
.prose-docs ol { list-style: decimal; padding-left: 1.25rem; margin: 1rem 0; }
.prose-docs li { margin: 0.35rem 0; }
.prose-docs a { color: var(--cobalt); text-decoration: underline; text-underline-offset: 4px; }
.prose-docs hr { border-color: var(--line); margin: 2rem 0; }
.prose-docs strong { font-weight: 600; color: var(--ink); }
.prose-docs :not(pre) > code { font-size: 0.8em; background: var(--tint); border: 1px solid var(--line); padding: 0.1em 0.4em; }
.prose-docs blockquote { border-left: 2px solid var(--cobalt); padding-left: 1rem; font-style: italic; margin: 1rem 0; }

.table-wrap { overflow-x: auto; border: 1px solid var(--line); margin: 1.5rem 0; }
.prose-docs table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
.prose-docs th { background: var(--tint); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.75rem 1rem; border-bottom: 1px solid var(--line); }
.prose-docs td { padding: 0.75rem 1rem; border-top: 1px solid var(--line); vertical-align: top; }

.codeblock { position: relative; margin: 1.25rem 0; border: 1px solid var(--line); background: var(--tint); }
.codeblock pre { overflow-x: auto; padding: 1rem; font-size: 0.8125rem; line-height: 1.6; }
.codeblock-copy { position: absolute; top: 0.4rem; right: 0.5rem; color: var(--muted); }
.codeblock-copy:hover { color: var(--cobalt); }

.alert { margin: 1.5rem 0; padding: 0.9rem 1.1rem; border: 1px solid var(--line); border-left-width: 3px; background: var(--tint); }
.alert > p { margin: 0.5rem 0 0; }
.alert-label { display: block; color: var(--muted); }
.alert .alert-title { margin: 0.25rem 0 0; font-weight: 700; }
.alert[data-kind="warning"] { border-left-color: #d97706; }
.alert[data-kind="caution"] { border-left-color: #dc2626; }
.alert[data-kind="tip"] { border-left-color: #059669; }
.alert[data-kind="note"], .alert[data-kind="important"] { border-left-color: var(--cobalt); }

.tabs { margin: 1.25rem 0; }
.tabs-list { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--line); }
.tabs-tab { padding: 0.5rem 0.9rem; font-size: 0.8125rem; font-weight: 600; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs-tab[aria-selected="true"] { color: var(--cobalt); border-bottom-color: var(--cobalt); }

.hljs-comment, .hljs-quote { color: var(--muted); font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-built_in { color: var(--cobalt); }
.hljs-string, .hljs-attr, .hljs-attribute { color: #0f766e; }
.hljs-number, .hljs-meta, .hljs-name, .hljs-tag { color: #b45309; }
.hljs-title, .hljs-type, .hljs-class .hljs-title { color: #7c3aed; }
:root[data-theme="dark"] .hljs-string, :root[data-theme="dark"] .hljs-attr, :root[data-theme="dark"] .hljs-attribute { color: #5eead4; }
:root[data-theme="dark"] .hljs-number, :root[data-theme="dark"] .hljs-meta, :root[data-theme="dark"] .hljs-name, :root[data-theme="dark"] .hljs-tag { color: #fbbf24; }
:root[data-theme="dark"] .hljs-title, :root[data-theme="dark"] .hljs-type { color: #c4b5fd; }
```

- [ ] **Step 6b: Create a stub `scripts/prerender.mjs` so `npm run build` is valid until Task 9**

```js
// Replaced in Task 9.
console.log('prerender: not implemented yet')
```

- [ ] **Step 7: Verify**

Run: `npx tsc -b && npx vitest run && npm run dev`
Expected: tests pass. Open `http://localhost:5173/docs/getting-started/installation` and confirm: sidebar, title, the Warning alert, highlighted Java block with a Copy button, TOC listing "Requirements", theme toggle works, `/docs/nope` shows the 404 page, `/` redirects to the docs. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: render docs pages with sidebar, toc, alerts, tabs and highlighting"
```

---

### Task 6: Move and convert the pages

**Files:**
- Move: `docs/{architecture,contributing}.md`, `docs/getting-started/*.md`, `docs/guides/*.md`, `docs/reference/*.md` → `src/docs/…` (same relative paths)
- Move: `docs/includes/*.md` → `src/docs/_includes/`
- Delete: `docs/index.md` (content reused in Task 7; read it first and keep a copy in the scratchpad), the throwaway fixture is overwritten by the real installation page.
- Create: `src/lib/content.test.ts`
- Scratchpad (not committed): `convert.mjs`

- [ ] **Step 1: Write the integrity test (it fails until conversion is done)**

`src/lib/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { docs } from './content'
import { resolveLink } from './links'
import { extractToc } from './slug'

const ids = new Set(docs.map((d) => d.id))
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g

describe('converted content', () => {
  it('publishes the 12 expected pages', () => {
    expect(docs.map((d) => d.id)).toEqual([
      'getting-started/installation', 'getting-started/quick-start',
      'guides/spring-boot', 'guides/providers', 'guides/uploading', 'guides/lifecycle', 'guides/observability',
      'reference/configuration', 'reference/api', 'reference/troubleshooting',
      'architecture', 'contributing',
    ])
  })

  it.each(docs.map((d) => [d.id, d] as const))('%s has no MkDocs-only syntax left', (_id, d) => {
    expect(d.body).not.toMatch(/^\s*!!! /m)
    expect(d.body).not.toMatch(/^\s*=== "/m)
    expect(d.body).not.toContain('--8<--')
    expect(d.body).not.toMatch(/\{ \.md-button/)
  })

  it.each(docs.map((d) => [d.id, d] as const))('%s has only resolvable internal links', (_id, d) => {
    for (const m of d.body.matchAll(LINK)) {
      const link = resolveLink(m[1], d.id)
      if (link.kind !== 'doc') continue
      expect(ids.has(link.docId), `${d.id} -> ${m[1]}`).toBe(true)
      if (link.hash) {
        const target = docs.find((x) => x.id === link.docId)!
        expect(extractToc(target.body).some((t) => t.id === link.hash), `${d.id} -> ${m[1]}`).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Move the files**

```bash
mkdir -p src/docs/_includes
git rm -q --cached src/docs/getting-started/installation.md && rm src/docs/getting-started/installation.md
cp docs/index.md "$TMPDIR/index.md.orig" 2>/dev/null || cp docs/index.md /private/tmp/claude-502/-Users-Edem-Documents-IdeaProjects-blob-helper-docs/9901c8c8-43fd-41bd-aa0a-c87490b6f288/scratchpad/index.md.orig
git mv docs/includes/*.md src/docs/_includes/
for d in getting-started guides reference; do mkdir -p src/docs/$d; git mv docs/$d/*.md src/docs/$d/; done
git mv docs/architecture.md docs/contributing.md src/docs/
git rm -q docs/index.md
```

- [ ] **Step 3: Write the converter in the scratchpad and run it**

`convert.mjs` (in the scratchpad dir; run with `node convert.mjs` from the repo root). It converts `!!!` admonitions to GitHub alerts, `===` tab groups to `::::tabs` blocks, and prepends frontmatter:

```js
import fs from 'node:fs'
import path from 'node:path'

const META = {
  'getting-started/installation': ['Installation', 'Add the dedup4j starter to a Spring Boot application.', 'Getting started', 1],
  'getting-started/quick-start': ['Quick start', 'Store, retrieve and release your first blob.', 'Getting started', 2],
  'guides/spring-boot': ['Spring Boot integration', 'How dedup4j auto-configures inside a Spring Boot application.', 'Guides', 3],
  'guides/providers': ['Storage providers', 'Configure the filesystem, S3 or Azure storage provider.', 'Guides', 4],
  'guides/uploading': ['Uploading & deduplication', 'How uploads are hashed, deduplicated and batched.', 'Guides', 5],
  'guides/lifecycle': ['Retrieval, retain & release', 'Read blobs back and manage their reference counts.', 'Guides', 6],
  'guides/observability': ['Observability & dashboards', 'Metrics, actuator endpoints and dashboards for dedup4j.', 'Guides', 7],
  'reference/configuration': ['Configuration properties', 'Every dedup4j configuration property and its default.', 'Reference', 8],
  'reference/api': ['Public API', 'The public types and methods of dedup4j.', 'Reference', 9],
  'reference/troubleshooting': ['Troubleshooting', 'Exceptions, failure modes and how to diagnose them.', 'Reference', 10],
  'architecture': ['Architecture & limitations', 'How dedup4j works, and what it deliberately does not do.', 'Project', 11],
  'contributing': ['Contributing', 'Build dedup4j from source and contribute changes.', 'Project', 12],
}
const KIND = { note: 'NOTE', tip: 'TIP', warning: 'WARNING', danger: 'CAUTION' }

function convertBody(src) {
  const lines = src.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const adm = /^!!! (\w+)(?: "(.*)")?\s*$/.exec(lines[i])
    const tab = /^=== "(.*)"\s*$/.exec(lines[i])
    if (adm) {
      const block = []
      while (i + 1 < lines.length && (lines[i + 1] === '' || lines[i + 1].startsWith('    '))) block.push(lines[++i])
      while (block.length && block[block.length - 1] === '') block.pop()
      out.push(`> [!${KIND[adm[1]] ?? 'NOTE'}]`)
      if (adm[2]) out.push(`> **${adm[2]}**`, '>')
      for (const l of block) out.push(l === '' ? '>' : `> ${l.slice(4)}`)
    } else if (tab) {
      const tabs = []
      let cur = tab
      while (cur) {
        const block = []
        while (i + 1 < lines.length && (lines[i + 1] === '' || lines[i + 1].startsWith('    '))) block.push(lines[++i])
        while (block.length && block[block.length - 1] === '') block.pop()
        tabs.push([cur[1], block.map((l) => l.slice(4))])
        // next line (skipping blanks) starts another tab of the same group?
        let j = i + 1
        while (j < lines.length && lines[j] === '') j++
        const nxt = j < lines.length ? /^=== "(.*)"\s*$/.exec(lines[j]) : null
        if (nxt) i = j
        cur = nxt
      }
      out.push('::::tabs')
      for (const [title, body] of tabs) out.push(`:::tab{title="${title}"}`, ...body, ':::')
      out.push('::::')
    } else {
      out.push(lines[i])
    }
  }
  return out.join('\n')
}

const root = 'src/docs'
for (const f of fs.readdirSync(root, { recursive: true })) {
  if (!String(f).endsWith('.md')) continue
  const file = path.join(root, String(f))
  const raw = fs.readFileSync(file, 'utf8')
  let body = convertBody(raw)
  if (String(f).startsWith('_includes')) { fs.writeFileSync(file, body); continue }
  const id = String(f).replace(/\.md$/, '')
  const m = META[id]
  if (!m) throw new Error(`no META for ${id}`)
  body = body.replace(/^(?:\s*\n)+/, '')
  const fm = `---\ntitle: ${m[0]}\ndescription: ${m[1]}\ncategory: ${m[2]}\norder: ${m[3]}\n---\n`
  fs.writeFileSync(file, fm + body)
}
```

Run: `node <scratchpad>/convert.mjs`

- [ ] **Step 4: Fix the leftovers the converter cannot know about**

- Any link in a moved page that points at an unpublished file (`releases/publishing.md`, `plans/…`, found with `grep -rn "releases/\|plans/" src/docs`) becomes an absolute URL: `https://github.com/heyEdem/dedup4j-docs/blob/main/docs/releases/publishing.md` (or the matching `docs/plans/…` path).
- Remove the `{ .md-button … }` attribute syntax if any remains outside the (deleted) index page.
- Run `grep -rn '^!!!\|^=== \|--8<--' src/docs | grep -v _includes` — `--8<--` lines must remain only as bare `--8<-- "file.md"` include lines at column 0 (they are expanded at load time); no `!!!` or `=== "` may remain.

- [ ] **Step 5: Run the integrity test and fix what it reports**

Run: `npx vitest run src/lib/content.test.ts`
Expected: PASS. For each failure, fix the page (broken relative link, or an anchor that no longer exists) — do not loosen the test.

- [ ] **Step 6: Visual check**

Run `npm run dev` and open every page. Confirm alerts show the right type and title, the Maven/Gradle and Development/Production tabs switch, tables scroll horizontally on a narrow window, and heading anchors work from the TOC. Fix converter misses by hand in the pages.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: move pages to src/docs and convert MkDocs syntax to alerts and tabs"
```

---

### Task 7: Landing page

**Files:**
- Create: `src/components/LandingPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `includes` from `src/lib/content.ts`, `expandIncludes`, `MarkdownRenderer`.

- [ ] **Step 1: Read the original index copy**

Read `index.md.orig` saved in Task 6 (scratchpad). Reuse its wording for the hero paragraph, the feature blocks, and the "Read this before designing around it" warning (rewrite it as a `> [!CAUTION]` alert in the landing markdown below, preserving its text exactly).

- [ ] **Step 2: Create `src/components/LandingPage.tsx`**

The install snippet is rendered from the same `_includes` files the docs use, so coordinates stay single-sourced. Replace the `FEATURES` copy with the wording from `index.md.orig` where it differs; the structure below is final.

```tsx
import { Link } from 'react-router'
import { includes } from '../lib/content'
import { expandIncludes } from '../lib/includes'
import { MarkdownRenderer } from './MarkdownRenderer'

const INSTALL = expandIncludes(
  ['::::tabs', ':::tab{title="Maven"}', '--8<-- "dep-maven.md"', ':::', ':::tab{title="Gradle"}', '--8<-- "dep-gradle.md"', ':::', '::::'].join('\n'),
  includes,
)

const FEATURES = [
  ['Store bytes once', 'Identical content is hashed and stored a single time, however many records point at it.'],
  ['Your database, your store', 'Metadata lives in your own DataSource; bytes go to a filesystem directory, S3 or Azure Blob.'],
  ['Reference counted', 'Retain and release keep the count honest; bytes are deleted only when nobody needs them.'],
  ['Observable', 'Micrometer metrics and actuator endpoints show deduplication savings and failures.'],
]

export function LandingPage() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="label text-cobalt">Spring Boot starter</div>
          <h1 className="mt-4 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Store identical bytes once.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Deduplicated blob storage for Spring Boot, backed by your own database and object store.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/docs/getting-started/quick-start" className="bg-cobalt px-5 py-3 text-sm font-semibold text-white hover:opacity-90">Quick start</Link>
            <Link to="/docs/getting-started/installation" className="border border-line px-5 py-3 text-sm font-semibold hover:bg-tint">Installation</Link>
          </div>
          <div className="mt-10 max-w-2xl">
            <MarkdownRenderer body={INSTALL} fromId="" />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-px border-x border-b border-line bg-line sm:grid-cols-2">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="bg-paper p-8">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-muted">{text}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-5 py-12">
        <MarkdownRenderer
          fromId=""
          body={'> [!CAUTION]\n> **Read this before designing around it**\n>\n> (Paste the exact text of the original warning from index.md.orig here, one `> ` line per original line.)'}
        />
      </section>
    </div>
  )
}
```

The last section's placeholder text in the body string is replaced in this step with the real warning copy from `index.md.orig`; the page must not ship with the parenthesised instruction.

- [ ] **Step 3: Route it**

In `src/App.tsx` replace the `/` route with `<Route path="/" element={<LandingPage />} />` and import `LandingPage`. Keep `/docs` handled by `DocsPage` (which redirects to the first page).

- [ ] **Step 4: Verify**

Run `npm run dev`; `/` shows hero, working Maven/Gradle tabs from the includes, features and the warning; `Quick start` and `Installation` navigate correctly. Run `npx tsc -b`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add landing page"
```

---

### Task 8: Search

**Files:**
- Create: `src/lib/search.ts`, `src/lib/search.test.ts`, `src/components/SearchPalette.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `buildSearch(docs: Doc[]): { search(query: string): SearchHit[] }` with `SearchHit = { id: string; docId: string; path: string; title: string; heading: string; snippet: string }`.

- [ ] **Step 1: Write the failing test**

`src/lib/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDocs } from './docs'
import { buildSearch } from './search'

const fm = (t: string, o: number) => `---\ntitle: ${t}\ndescription: d\ncategory: C\norder: ${o}\n---\n`
const docs = buildDocs(
  {
    'a.md': fm('Uploading', 1) + '# Uploading\n\n## Batches\n\nRetain a blob before you release it.\n\n## Limits\n\nUploads are capped at 25 MB.',
    'b.md': fm('Config', 2) + '# Config\n\n## Properties\n\nSet the storage directory explicitly.',
  },
  {},
)
const { search } = buildSearch(docs)

describe('search', () => {
  it('finds a section by body text and links to its heading', () => {
    const [hit] = search('capped')
    expect(hit.docId).toBe('a')
    expect(hit.path).toBe('/docs/a#limits')
    expect(hit.heading).toBe('Limits')
  })

  it('matches by prefix and tolerates small typos', () => {
    expect(search('direct')[0].docId).toBe('b')
    expect(search('uplaoding').length).toBeGreaterThan(0)
  })

  it('returns nothing for an empty query', () => {
    expect(search('  ')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/search.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/search.ts`**

```ts
import MiniSearch from 'minisearch'
import type { Doc } from './docs'
import { slugify } from './slug'

export type SearchHit = { id: string; docId: string; path: string; title: string; heading: string; snippet: string }

type Section = Omit<SearchHit, 'snippet'> & { text: string }

function sections(doc: Doc): Section[] {
  const out: Section[] = []
  let heading = ''
  let slug = ''
  let buf: string[] = []
  let inCode = false
  const flush = () => {
    const text = buf.join(' ').replace(/\s+/g, ' ').trim()
    if (text || heading) {
      out.push({
        id: `${doc.id}#${slug}`,
        docId: doc.id,
        path: slug ? `${doc.path}#${slug}` : doc.path,
        title: doc.title,
        heading,
        text,
      })
    }
    buf = []
  }
  for (const line of doc.body.split('\n')) {
    if (/^\s*```/.test(line)) { inCode = !inCode; continue }
    const m = !inCode && /^(##|###) (.+)$/.exec(line)
    if (m) {
      flush()
      heading = m[2].replace(/`/g, '').trim()
      slug = slugify(heading)
    } else {
      buf.push(line.replace(/^#+ /, ''))
    }
  }
  flush()
  return out
}

export function buildSearch(docs: Doc[]) {
  const all = docs.flatMap(sections)
  const index = new MiniSearch<Section>({
    fields: ['title', 'heading', 'text'],
    storeFields: ['docId', 'path', 'title', 'heading', 'text'],
    searchOptions: { boost: { heading: 3, title: 2 }, prefix: true, fuzzy: 0.2 },
  })
  index.addAll(all)
  return {
    search(query: string): SearchHit[] {
      if (!query.trim()) return []
      return index.search(query).slice(0, 8).map((r) => ({
        id: String(r.id),
        docId: r.docId as string,
        path: r.path as string,
        title: r.title as string,
        heading: r.heading as string,
        snippet: (r.text as string).slice(0, 140),
      }))
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Create `src/components/SearchPalette.tsx` and mount it**

The index is built lazily on first open so it never runs during SSR.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { docs } from '../lib/content'
import { buildSearch } from '../lib/search'

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const engine = useMemo(() => buildSearch(docs), [])
  const hits = engine.search(q)

  useEffect(() => {
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-label="Search" className="mx-auto max-w-xl border border-line bg-paper" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && hits[0] && go(hits[0].path)}
          placeholder="Search the docs"
          className="w-full border-b border-line bg-transparent px-4 py-3 outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => go(h.path)} className="block w-full px-4 py-3 text-left hover:bg-tint">
                <div className="text-sm font-semibold">{h.title}{h.heading && <span className="text-muted"> › {h.heading}</span>}</div>
                <div className="truncate text-xs text-muted">{h.snippet}</div>
              </button>
            </li>
          ))}
          {q.trim() && hits.length === 0 && <li className="px-4 py-3 text-sm text-muted">No results</li>}
        </ul>
      </div>
    </div>
  )
}
```

In `src/App.tsx` import `SearchPalette` and replace `{searchOpen && null}` with `{searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}`.

- [ ] **Step 6: Verify and commit**

Run `npm run dev`; press `/`, search "presigned", confirm the result opens the right section; Esc closes. Run `npx tsc -b`.

```bash
git add -A
git commit -m "feat: add client-side search palette"
```

---

### Task 9: Prerender, SEO files and internal link check

**Files:**
- Modify: `scripts/prerender.mjs` (replace the stub)

**Interfaces:**
- Consumes: `dist-ssr/entry-server.js` (`render(url)`), `dist-ssr/prerender-data.js` (`docs`, `PAGES`, `renderHeadTags`, `getPageSeo`, `resolveLink`, `extractToc`), `dist/index.html` template with `<!--app-head-->` and `<!--app-html-->`.
- Output layout (Vercel `cleanUrls`): `/` → `dist/index.html`; `/docs/guides/providers` → `dist/docs/guides/providers.html`. Raw markdown at `dist/docs/guides/providers.md`.

- [ ] **Step 1: Write `scripts/prerender.mjs`**

```js
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
  for (const m of doc.body.matchAll(LINK)) {
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
```

- [ ] **Step 2: Verify the full build**

Run: `npm run build`
Expected: ends with `Prerendered 13 pages, ...`; no errors.

- [ ] **Step 3: Verify the output (Review Focus 5)**

```bash
test -f dist/index.html && test -f dist/docs/guides/providers.html && test -f dist/docs/guides/providers.md && test -f dist/404.html && echo layout-ok
grep -c '<h1' dist/docs/guides/providers.html
grep -o '<title>[^<]*' dist/docs/guides/providers.html
grep -c 'dedup4j.churchillakomaning.online/docs/guides/providers' dist/sitemap.xml
head -5 dist/llms.txt
```

Expected: `layout-ok`, `h1` count ≥ 1, the page title, sitemap count 1, llms header. Then `npm run preview`, open `http://localhost:4173/docs/guides/providers` (preview serves `.html` via fallback only for the root, so also open `/` and navigate in-app) and confirm the browser console shows no hydration warnings.

- [ ] **Step 4: Verify the link check fails on a broken link**

Temporarily change one `.md` link in a page to `nope.md`, run `npm run build`, confirm exit code 1 naming that page, then revert the edit.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: prerender pages and generate sitemap, llms files and link check"
```

---

### Task 10: Vercel config, CI, README and cutover

**Files:**
- Create: `vercel.json`, `.github/workflows/ci.yml`
- Modify: `README.md`, `VERIFICATION.md`, `docs/plans/2026-10-10-react-docs-site-design.md`
- Delete (at cutover): `docs/CNAME`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "redirects": [
    { "source": "/docs", "destination": "/docs/getting-started/installation", "permanent": false }
  ],
  "headers": [
    {
      "source": "/(.*)\\.md",
      "headers": [{ "key": "Content-Type", "value": "text/markdown; charset=utf-8" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
# Build and test gate. No deployment: Vercel deploys from main.
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 3: Rewrite `README.md` for the new stack**

Replace the MkDocs/Pages paragraphs with: Vite + React + Markdown stack; `npm install`, `npm run dev`, `npm test`, `npm run build`; pages are `src/docs/**/*.md` with frontmatter (`title`, `description`, `category`, `order`); alert syntax (`> [!NOTE]`/`TIP`/`IMPORTANT`/`WARNING`/`CAUTION` with a bold first line as the title) and tab syntax (`::::tabs` / `:::tab{title="…"}`); coordinates single-sourced in `src/docs/_includes/` via `--8<-- "file.md"` lines; deployed by Vercel from `main`; `docs/plans/` and `docs/releases/` are not published. Update `VERIFICATION.md` anywhere it mentions MkDocs, `mkdocs build --strict` or GitHub Pages so it names `npm run build` and Vercel instead.

- [ ] **Step 4: Amend the spec where this plan differs**

In `docs/plans/2026-10-10-react-docs-site-design.md` add a section:

```markdown
## Amendments (from the implementation plan)

- `includes/*` snippets stay as `--8<-- "file.md"` lines expanded at load time
  (single source preserved, no page rewrite) instead of a `<Dependency />`
  component.
- Alerts use GitHub alert syntax with a bold first line as the title.
- Code highlighting (`rehype-highlight`) is included; MkDocs had it.
- The external link check (`docs-links.yml`, lychee, weekly) is kept and
  repointed at `src/docs/`; internal links are checked by the build.
- A CI workflow runs tests and the build on push and pull requests.
```

- [ ] **Step 5: Verify everything once more**

Run: `npm test && npm run build && npm run lint`
Expected: all pass. Fix lint errors in the new code only.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Vercel config and CI, update README for the React site"
```

- [ ] **Step 7: Cutover (manual, owner)**

1. Push `main`. In Vercel: Add New Project → import the repo → framework preset "Vite" is fine; the build command and output directory come from `vercel.json`.
2. Add the domain `dedup4j.churchillakomaning.online` to the Vercel project and update DNS to the records Vercel shows (this replaces the GitHub Pages CNAME target).
3. Once the Vercel deployment serves the domain, in the GitHub repo settings disable Pages, then remove the leftover file:

```bash
git rm docs/CNAME
git commit -m "chore: drop the GitHub Pages CNAME after the Vercel cutover"
```

4. Smoke-check on the live domain: `/`, `/docs` (redirects), a nested page refresh, `/docs/architecture.md` returns markdown, `/llms.txt`, `/sitemap.xml`, `/nope` shows the 404 page.

---

## Self-Review

**Spec coverage:** every spec section maps to a task: landing + docs (5, 7), Vercel (10), big-bang removal first (1), search (8), frontmatter model (3), alert/tab/include conversion (3, 4, 6), routes (5, 10), layout incl. copy-as-Markdown (5), prerender/sitemap/llms/raw md/headers (9, 10), link check (1, 9), unpublished plans (Global Constraints, 6), README/VERIFICATION (10).

**Placeholders:** the only intentional fill-ins are the landing warning text (copied verbatim from `index.md.orig`, Task 7 step 2 forbids shipping the parenthesised note) and descriptions in `META`, which are written out in full.

**Type consistency:** `Doc`, `TocItem`, `resolveLink`, `buildSearch`, `PageSeo` names match across tasks; `ids`/`docId`/`path` use the same shapes in Tasks 3, 5, 8, 9.
