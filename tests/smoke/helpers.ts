import { expect, test as base, type Page, type Route } from '@playwright/test'

export const GATHERING_ID = '507f1f77bcf86cd799439011'
export const EVENT_ID = '507f1f77bcf86cd799439012'
export const PASS_TOKEN = 'a1b2c3'.repeat(8)

type Responder = (route: Route) => unknown
export type ApiCall = { method: string, url: string, body: unknown }

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

const FAKE_JWT = [
  encode({ alg: 'HS256', typ: 'JWT' }),
  encode({ id: GATHERING_ID, sub: GATHERING_ID, exp: Math.floor(Date.now() / 1000) + 86400 }),
  'signature',
].join('.')

/** Every smoke test fails on an uncaught browser error, whatever else it checks. */
export const test = base.extend<{ pageErrors: void }>({
  pageErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await use()
    expect(errors, 'Uncaught errors in the browser').toEqual([])
  }, { auto: true }],
})

export { expect }

/**
 * Answers every API call in the browser. `routes` matches "METHOD /path-fragment"; anything
 * else gets a generic success, so a page never reaches a real server.
 */
export async function stubApi(
  page: Page,
  { seatingEnabled = true, routes = {} }: { seatingEnabled?: boolean, routes?: Record<string, Responder> } = {},
) {
  const calls: ApiCall[] = []
  const handlers = Object.entries(routes)
    .map(([key, respond]) => {
      const [method, fragment] = key.split(' ') as [string, string]
      return { method, fragment, respond }
    })
    // The most specific path wins, so a list route can't swallow its children.
    .sort((a, b) => b.fragment.length - a.fragment.length)

  await page.route('**/api/**', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    let body: unknown = null
    try {
      body = request.postDataJSON()
    } catch {
      // A file upload is not JSON. Tests that care read the raw request.
    }
    calls.push({ method: request.method(), url: url.pathname + url.search, body })

    if (url.pathname.endsWith('/public/platform-settings')) {
      return route.fulfill({ json: { success: true, status: 200, seatingPlansEnabled: seatingEnabled } })
    }
    const handler = handlers.find(item => item.method === request.method() && url.pathname.includes(item.fragment))
    if (handler) return handler.respond(route)

    return route.fulfill({
      json: {
        success: true,
        status: 200,
        accessToken: FAKE_JWT,
        events: [],
        gatherings: [],
        user: { _id: GATHERING_ID, firstName: 'Host', lastName: 'Person', email: 'host@example.com' },
      },
    })
  })
  return calls
}

export async function signIn(page: Page, role: 'user' | 'partner' = 'user') {
  await page.addInitScript(([key, token, activeRole]) => {
    localStorage.setItem(key as string, token as string)
    localStorage.setItem('bpb_active_auth_role', activeRole as string)
  }, [`bpb_${role}_access_token`, FAKE_JWT, role])
}
