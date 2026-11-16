import { INDEXABLE_PATHS, SITE_URL } from '../../shared/seo'
import { expect, stubApi, test } from './helpers'

function headTag(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]
}

const canonicalOf = (html: string) => headTag(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)
const robotsOf = (html: string) => headTag(html, /<meta[^>]+name="robots"[^>]+content="([^"]+)"/)

// What a crawler reads before any JavaScript runs.
for (const path of INDEXABLE_PATHS) {
  test(`${path} is served indexable with its own canonical`, async ({ request }) => {
    const html = await (await request.get(path)).text()
    expect(canonicalOf(html)).toBe(`${SITE_URL}${path}`)
    expect(robotsOf(html)).toBe('index, follow')
    expect(html).toContain(`content="${SITE_URL}/images/og-image.png"`)
  })
}

test('the sitemap lists exactly the indexable pages', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  expect(locs).toEqual(INDEXABLE_PATHS.map(path => `${SITE_URL}${path}`))
})

test('the homepage describes the brand to search engines', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const jsonLd = headTag(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  const types = (JSON.parse(jsonLd ?? '[]') as { '@type': string }[]).map(entry => entry['@type'])
  expect(types).toEqual(['WebSite', 'Organization'])
})

test('page titles carry the brand once', async ({ request }) => {
  const html = await (await request.get('/about/')).text()
  expect(headTag(html, /<title>([^<]*)<\/title>/)).toBe('About - Bread + Butter')
})

for (const path of ['/user/login', '/event/guests', '/rsvp/abc123', '/no-such-page']) {
  test(`${path} is kept out of search results`, async ({ page }) => {
    await stubApi(page)
    await page.goto(path)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  })
}

test('Jam landing aliases point search engines at /jam/', async ({ page }) => {
  await stubApi(page)
  await page.goto('/jam/landing')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}/jam/`)
})
