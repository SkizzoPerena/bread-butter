import { GATHERING_ID, PASS_TOKEN, expect, signIn, stubApi, test } from './helpers'

const PUBLIC_PAGES = [
  `/attend/${PASS_TOKEN}?checkin=1`,
  `/seat/${PASS_TOKEN}`,
  `/jam/${PASS_TOKEN}`,
  `/jam/rsvp/${PASS_TOKEN}`,
]

test.describe('with seating off', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path.slice(0, 11)} goes to the unavailable page`, async ({ page }) => {
      const calls = await stubApi(page, { seatingEnabled: false })
      await page.goto(path)
      await expect(page).toHaveURL(/\/seating-unavailable$/)
      await expect(page.getByText('Seating is not available right now')).toBeVisible()
      expect(calls.filter(call => call.url.includes('/seating/'))).toEqual([])
    })
  }

  test('the host workspace goes to the unavailable page', async ({ page }) => {
    await signIn(page)
    await stubApi(page, { seatingEnabled: false })
    await page.goto(`/seating/${GATHERING_ID}`)
    await expect(page).toHaveURL(/\/seating-unavailable$/)
  })

  for (const path of ['/user/seating-payment', '/user/seating-payment/success']) {
    test(`${path} reassures a host who already paid`, async ({ page }) => {
      await signIn(page)
      await stubApi(page, { seatingEnabled: false })
      await page.goto(`${path}?gatheringId=${GATHERING_ID}`)
      await expect(page).toHaveURL(/\/seating-unavailable\?from=payment$/)
      await expect(page.getByText('your payment and seating plan are saved')).toBeVisible()
    })
  }
})

test.describe('with seating on', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path.slice(0, 11)} stays open`, async ({ page }) => {
      await stubApi(page, { seatingEnabled: true })
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page).not.toHaveURL(/seating-unavailable/)
    })
  }
})
