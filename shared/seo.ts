// Single source of truth for what search engines may index.
// Drives the canonical tag, the robots meta tag (app/app.vue) and /sitemap.xml
// (server/routes/sitemap.xml.ts). Every other route is served with noindex.

export const SITE_URL = 'https://www.bread-plus-butter.com'

// Paths are written with the trailing slash the live server redirects to.
export const INDEXABLE_PATHS = [
  '/',
  '/jam/',
  '/about/',
  '/our-suppliers/',
  '/useful-tips/',
  '/news-and-events/',
  '/faqs/',
  '/contact-us/',
  '/terms/',
] as const

// Duplicate routes that render an indexable page; they point their canonical at it.
const CANONICAL_ALIASES: Record<string, string> = {
  '/jam/landing/': '/jam/',
  '/jam-landing/': '/jam/',
}

export function normalizePath(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}

export function canonicalPath(path: string): string {
  const normalized = normalizePath(path)
  return CANONICAL_ALIASES[normalized] ?? normalized
}

export function isIndexablePath(path: string): boolean {
  return (INDEXABLE_PATHS as readonly string[]).includes(normalizePath(path))
}
