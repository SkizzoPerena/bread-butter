import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

const RSVP_ID = '507f1f77bcf86cd799439031'

const NO_RESPONSE_ROW = {
  _id: RSVP_ID,
  name: 'maria santos',
  email: 'maria@example.com',
  status: 'NO_RESPONSE',
  invitedAt: '2030-01-01T00:00:00.000Z',
  rsvpReminderSentAt: '2030-01-15T00:00:00.000Z',
  respondedAt: null,
  answers: [],
}

test('the host sees No Response, its filter, and the reminder date', async ({ page }) => {
  await signIn(page)
  const calls = await stubApi(page, {
    routes: {
      [`GET /rsvps/event/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, page: 1, limit: 25, total: 1, totalPages: 1, rsvps: [NO_RESPONSE_ROW] },
      }),
      [`GET /events/${EVENT_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          event: {
            _id: EVENT_ID,
            eventName: 'RSVP wedding',
            eventType: 'WEDDING',
            eventDate: '2030-06-01T00:00:00.000Z',
            priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter' },
            questions: [],
          },
          guestList: [],
          rsvpSummary: { totalSent: 1, going: 0, notGoing: 0, pending: 0, noResponse: 1 },
          tasks: null,
        },
      }),
    },
  })

  await page.goto(`/event/rsvp?eventId=${EVENT_ID}`)
  await page.getByRole('tab', { name: 'Responses' }).click()

  await expect(page.getByText('No Response', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/Reminder sent/)).toBeVisible()

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'No Response' }).click()
  await expect.poll(() => calls.some(call => call.url.includes('status=NO_RESPONSE'))).toBe(true)
})

test('a guest marked No Response can still reply', async ({ page }) => {
  const calls = await stubApi(page, {
    routes: {
      [`GET /rsvps/${RSVP_ID}/form`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          alreadyResponded: false,
          rsvp: { ...NO_RESPONSE_ROW, subEventId: null },
          invitation: null,
          subEvent: null,
          questions: [],
        },
      }),
      [`PATCH /rsvps/${RSVP_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'RSVP responded.', rsvp: { ...NO_RESPONSE_ROW, status: 'GOING' } },
      }),
    },
  })

  await page.goto(`/rsvp/${RSVP_ID}`)
  await page.getByText('Yes, I will attend').click()
  await page.getByRole('button', { name: 'Submit Response' }).click()

  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toMatchObject({ status: 'GOING' })
})
