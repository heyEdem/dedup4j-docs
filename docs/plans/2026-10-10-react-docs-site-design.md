# Rebuild the dedup4j docs site in React

Date: 2026-10-10 · Status: approved design, awaiting spec review

## Goal

Replace the MkDocs Material site with a Vite + React site that renders
Markdown pages, following the style and architecture of
[kwasii1/straden-docs](https://github.com/kwasii1/straden-docs). Existing
content is kept and converted. MkDocs is removed. The site moves from
GitHub Pages to Vercel.

## Decisions

| Topic | Decision |
|---|---|
| Scope | Landing page + docs |
| Hosting | Vercel (replaces GitHub Pages and the CNAME) |
| Migration | Big-bang: remove MkDocs first, then build. Work directly on `main` in small commits |
| Search | Client-side, built from page content (MkDocs had search; avoid a regression) |
| Plans | `docs/plans/*` stays in the repo and is not published |

## Stack

Vite, React 19, TypeScript, Tailwind v4, `react-router`, `react-markdown`
+ `remark-gfm`. Same as straden-docs.

## Content model

- Pages are `.md` files under `src/docs/`, keeping the folders
  `getting-started/`, `guides/`, `reference/`, `releases/`. Loaded with
  `import.meta.glob('../docs/**/*.md', { query: '?raw', import: 'default', eager: true })`.
- Each page has YAML frontmatter: `title`, `description`, `category`,
  `order`. A small loader parses it, so adding a page means adding one
  file. (Deviation from straden, which hand-maintains a metadata map.)
- MkDocs-only syntax is converted when each page is moved:
  - `!!! note` admonitions -> GitHub-style alerts (`> [!NOTE]`), rendered
    by a component.
  - `=== "Maven"` tabs -> a `:::tabs` block, rendered as a tab component.
  - `includes/*` snippets -> a `<Dependency />` component so the
    coordinates live in one place.

## Routes

- `/` landing page.
- `/docs` redirects to `/docs/getting-started/installation`.
- `/docs/*` renders a page by path.
- Anything else renders a 404 page.

## Docs layout

- Left sidebar grouped by `category`; drawer on mobile.
- Right table of contents with scroll-spy, from `##` and `###` headings.
- Prev/next links, copy button on code blocks, "copy page as Markdown".
- Light/dark following the system setting.
- Search palette (`/` or Cmd+K) over a client-side index (MiniSearch).

## Landing page

Hero with the tagline ("Store identical bytes once"), install snippet, 3-4
feature blocks from `index.md`, links into the docs. Copy is drafted from
`index.md` and `README.md`, then edited by the owner.

## Build and SEO

`vite build` plus an SSR build; a prerender script writes static HTML for
every route and generates `sitemap.xml`, `llms.txt`, `llms-full.txt` and a
raw `.md` copy of each page. `vercel.json` sets `cleanUrls`, the `/docs`
redirect, `text/markdown` for `.md`, and immutable caching for `/assets`.
A build-time script fails on broken internal links (replaces
`docs-links.yml`).

## Migration order

1. Remove MkDocs and Pages scaffolding: `mkdocs.yml`, `requirements.txt`,
   `.venv`/`site/` ignores, the three workflows. Keep `docs/plans/`.
   Keep `docs/CNAME` until the Vercel domain is set.
2. Scaffold the Vite app.
3. Move and convert pages.
4. Landing page.
5. Prerender, SEO files, link check, search.
6. `vercel.json`, Vercel project, domain cutover, delete `docs/CNAME`.

## Out of scope

Versioned docs, i18n, an About/architecture-diagram page, publishing
`docs/plans/`.

## Open items

- Vercel project and domain setup is manual (owner).
- `VERIFICATION.md` and `README.md` need updating for the new stack.

## Amendments (from the implementation plan)

- `includes/*` snippets stay as `--8<-- "file.md"` lines expanded at load time
  (single source preserved, no page rewrite) instead of a `<Dependency />`
  component. Expansion skips fenced code so pages can document the syntax.
- Alerts use GitHub alert syntax with a bold first line as the title.
- Code highlighting (`rehype-highlight`) is included; MkDocs had it.
- The external link check (`docs-links.yml`, lychee, weekly) is kept and
  repointed at `src/docs/`; internal links are checked by the build.
- A CI workflow runs tests and the build on push and pull requests.
- Rendering is verified in headless Chrome against a fresh build: all routes
  hydrate with no React hydration errors.
