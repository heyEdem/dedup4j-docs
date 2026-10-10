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
