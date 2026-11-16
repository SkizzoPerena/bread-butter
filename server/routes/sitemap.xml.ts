import { INDEXABLE_PATHS, SITE_URL } from '#shared/seo'

// Prerendered by `nuxt generate` (see nitro.prerender.routes in nuxt.config.ts).
export default defineEventHandler((event) => {
  const urls = INDEXABLE_PATHS
    .map(path => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n  </url>`)
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
