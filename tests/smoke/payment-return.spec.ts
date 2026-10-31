import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function eventRecord(latestPayment: object | null) {
  return {
    _id: EVENT_ID,
    eventName: 'Unpaid wedding',
    eventType: 'WEDDING',
    description: 'Planner event',
    venue: 'Manila',
    eventDate: '2030-06-01T00:00:00.000Z',
    status: 'ONGOING',
    priceTier: { code: 'BREAD', name: 'Bread', pricePhp: 1000 },
    latestPayment,
  }
}

test('after a proof is submitted, going home does not return to checkout', async ({ page }) => {
  await signIn(page)
  const pending = { _id: 'p1', type: 'EVENT_CREATION_FEE', amount: 1000, transactionId: 'REF-1', status: 'PENDING' }
  let latestPayment: object | null = null

  await stubApi(page, {
    routes: {
      // Checkout tolerates this failing, and a successful update would hide a stale events list.
      [`PATCH /events/${EVENT_ID}`]: route => route.fulfill({
        status: 500,
        json: { success: false, message: 'Could not save event details.' },
      }),
      [`POST /events/${EVENT_ID}/payment-proof`]: (route) => {
        latestPayment = pending
        return route.fulfill({ json: { success: true, status: 201, event: eventRecord(pending), payment: pending } })
      },
      [`GET /events/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, event: eventRecord(latestPayment), guestList: [], rsvpSummary: null, tasks: null },
      }),
      'GET /user/events': route => route.fulfill({
        json: { success: true, status: 200, events: [eventRecord(latestPayment)] },
      }),
    },
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/user\/payment\?/)

  await page.getByPlaceholder('e.g. GCASH reference number').fill('REF-1')
  await page.locator('input[type="file"]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Submit Proof of Payment' }).click()
  await expect(page).toHaveURL(/\/user\/payment-pending/)

  // A client-side navigation, so the events list cached before paying is still in memory.
  await page.evaluate(() => (window as unknown as {
    useNuxtApp: () => { $router: { push: (path: string) => Promise<void> } }
  }).useNuxtApp().$router.push('/'))

  // Home redirects on its own after it loads, so give that time to happen before checking.
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/user\/payment-pending/)
})
