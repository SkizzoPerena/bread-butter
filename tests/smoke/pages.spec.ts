import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

const PUBLIC_PAGES = [
  { path: '/', expected: 'img' },
  { path: '/faqs', expected: 'main, body' },
  { path: '/contact-us', expected: 'main, body' },
  { path: '/our-suppliers', expected: 'main, body' },
  { path: '/user/login', expected: 'input[type="password"]' },
  { path: '/user/signup', expected: 'input' },
  { path: '/partners/login', expected: 'input[type="password"]' },
]

for (const { path, expected } of PUBLIC_PAGES) {
  test(`${path} loads`, async ({ page }) => {
    await stubApi(page)
    await page.goto(path)
    await expect(page.locator(expected).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Server Error')
    await expect(page.locator('body')).not.toContainText('Page not found')
  })
}

test('a partner can open the modules their tier includes', async ({ page }) => {
  await signIn(page, 'partner')
  await stubApi(page, {
    routes: {
      [`GET /${EVENT_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          event: {
            _id: EVENT_ID,
            eventName: 'Partner wedding',
            venue: 'Manila',
            eventDate: '2030-01-01T00:00:00.000Z',
            eventType: 'WEDDING',
            priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter' },
          },
          guestList: [],
          rsvpSummary: null,
          tasks: null,
        },
      }),
    },
  })

  await page.goto(`/partners/events/${EVENT_ID}`)
  await expect(page.getByText('Partner wedding').first()).toBeVisible()

  for (const module of ['guests', 'website', 'invitation']) {
    await expect(page.locator(`a[href="/partners/events/${EVENT_ID}/${module}"]`)).toBeVisible()
  }
})
