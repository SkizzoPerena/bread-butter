import type { Page, Route } from '@playwright/test'
import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

const SUB_EVENT_ID = '507f1f77bcf86cd799439041'
const RSVP_ID = '507f1f77bcf86cd799439042'

const EVENT = {
  _id: EVENT_ID,
  eventName: 'Sub-event wedding',
  eventType: 'WEDDING',
  eventDate: '2030-06-01T00:00:00.000Z',
  priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter' },
  paymentSummary: { isFullyPaid: true },
  latestPayment: { status: 'APPROVED' },
  remainingEmails: 50,
}

// Noon, so the date reads the same in any time zone a developer runs this from.
const SUB_EVENT = {
  _id: SUB_EVENT_ID,
  event: EVENT_ID,
  name: 'Rehearsal Dinner',
  description: 'Dinner the night before',
  venue: 'Garden Terrace',
  eventDate: '2030-03-09T12:00:00.000Z',
}

function guest(id: number, firstName: string, status: string | null) {
  return {
    _id: `507f1f77bcf86cd7994390${50 + id}`,
    firstName,
    lastName: 'Santos',
    email: `${firstName.toLowerCase()}@example.com`,
    rsvp: status
      ? {
          _id: `507f1f77bcf86cd7994391${50 + id}`,
          status,
          invitedAt: '2030-01-01T00:00:00.000Z',
          inviteEmailSentAt: '2030-01-01T00:00:00.000Z',
          respondedAt: null,
        }
      : null,
  }
}

const ANA = guest(0, 'Ana', 'GOING')
const BEN = guest(1, 'Ben', null)
const CARA = guest(2, 'Cara', null)

type Responder = (route: Route) => unknown

async function stubSubEventApi(
  page: Page,
  {
    subEvents = () => [SUB_EVENT],
    guests = () => [ANA, BEN, CARA],
    routes = {},
  }: { subEvents?: () => object[], guests?: () => object[], routes?: Record<string, Responder> } = {},
) {
  await signIn(page)
  return stubApi(page, {
    routes: {
      'GET /user/events': route => route.fulfill({ json: { success: true, status: 200, events: [EVENT] } }),
      [`GET /events/${EVENT_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          event: EVENT,
          guestList: [],
          rsvpSummary: { totalSent: 0, going: 0, notGoing: 0, pending: 0, noResponse: 0 },
          tasks: null,
        },
      }),
      [`GET /sub-events/event/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, subEvents: subEvents() },
      }),
      [`GET /guests/event/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, guests: guests() },
      }),
      [`GET /rsvps/sub-event/${SUB_EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, page: 1, limit: 100, total: 0, totalPages: 1, rsvps: [] },
      }),
      ...routes,
    },
  })
}

const subEventUrl = `/event/sub-event?eventId=${EVENT_ID}&subEventId=${SUB_EVENT_ID}`

test('the schedules page lists a sub-event and opens it', async ({ page }) => {
  await stubSubEventApi(page)

  await page.goto(`/event/schedules?eventId=${EVENT_ID}`)
  await expect(page.getByText('Garden Terrace')).toBeVisible()
  await page.getByText('Rehearsal Dinner').click()

  await expect(page).toHaveURL(new RegExp(`/event/sub-event\\?.*subEventId=${SUB_EVENT_ID}`))
  await expect(page.getByRole('button', { name: 'Edit Event' })).toBeVisible()
})

test('the sub-event page shows its details and who is invited', async ({ page }) => {
  await stubSubEventApi(page)

  await page.goto(subEventUrl)

  await expect(page.getByText('Rehearsal Dinner')).toBeVisible()
  await expect(page.getByText('Mar 9, 2030')).toBeVisible()
  await expect(page.getByText('Garden Terrace')).toBeVisible()
  await expect(page.getByText('Dinner the night before')).toBeVisible()

  const anaRow = page.getByRole('row').filter({ hasText: ANA.email })
  await expect(anaRow.getByText('Attending', { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: BEN.email })).toHaveCount(0)
})

test('inviting lists only uninvited guests and sends the chosen ones', async ({ page }) => {
  let sent = false
  const calls = await stubSubEventApi(page, {
    guests: () => [ANA, sent ? guest(1, 'Ben', 'PENDING') : BEN, CARA],
    routes: {
      [`POST /rsvps/sub-event/${SUB_EVENT_ID}/send`]: (route) => {
        sent = true
        return route.fulfill({
          status: 201,
          json: { success: true, status: 201, created: 1, skippedAlreadyInvited: 0, emailsQueued: 1, emailsFailed: 0, remainingEmails: 49 },
        })
      },
    },
  })

  await page.goto(subEventUrl)
  // Exact, because each row's "Uninvite guest" button contains the same words.
  await page.getByRole('button', { name: 'Invite Guest', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Ben Santos')).toBeVisible()
  await expect(dialog.getByText(BEN.email)).toBeVisible()
  await expect(dialog.getByText('Cara Santos')).toBeVisible()
  await expect(dialog.getByText(CARA.email)).toBeVisible()
  await expect(dialog.getByText(ANA.email)).toHaveCount(0)

  await dialog.getByRole('checkbox', { name: 'Select Ben Santos' }).click()
  await dialog.getByRole('button', { name: 'Send Invitations (1)' }).click()

  await expect.poll(() => calls.find(call => call.method === 'POST' && call.url.includes('/send'))?.body)
    .toEqual({ guestIds: [BEN._id] })
  await expect(dialog).toBeHidden()

  const benRow = page.getByRole('row').filter({ hasText: BEN.email })
  await expect(benRow.getByText('Pending', { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: CARA.email })).toHaveCount(0)
})

test('editing a sub-event sends the changes and shows them', async ({ page }) => {
  const calls = await stubSubEventApi(page, {
    routes: {
      [`PATCH /sub-events/${SUB_EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, subEvent: { ...SUB_EVENT, name: 'Welcome Dinner', venue: 'Beach House' } },
      }),
    },
  })

  await page.goto(subEventUrl)
  await page.getByRole('button', { name: 'Edit Event' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('Welcome Dinner')
  await dialog.getByLabel('Venue').fill('Beach House')
  await dialog.getByRole('button', { name: 'Save Changes' }).click()

  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toMatchObject({
    name: 'Welcome Dinner',
    venue: 'Beach House',
    description: 'Dinner the night before',
    eventDate: expect.stringMatching(/^2030-03-09/),
  })
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Welcome Dinner')).toBeVisible()
  await expect(page.getByText('Beach House')).toBeVisible()
})

test('deleting a sub-event returns to the schedules page', async ({ page }) => {
  let deleted = false
  const calls = await stubSubEventApi(page, {
    subEvents: () => (deleted ? [] : [SUB_EVENT]),
    routes: {
      [`DELETE /sub-events/${SUB_EVENT_ID}`]: (route) => {
        deleted = true
        return route.fulfill({ json: { success: true, status: 200 } })
      },
    },
  })

  await page.goto(subEventUrl)
  await page.getByRole('button', { name: 'Delete Sub-Event' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete Sub-Event' }).click()

  await expect(page).toHaveURL(new RegExp(`/event/schedules\\?eventId=${EVENT_ID}`))
  expect(calls.some(call => call.method === 'DELETE' && call.url.includes(SUB_EVENT_ID))).toBe(true)
  await expect(page.getByText('No sub-events yet')).toBeVisible()
  await expect(page.getByText('Garden Terrace')).toHaveCount(0)
})

test('a guest sees the sub-event details and can reply', async ({ page }) => {
  const rsvp = {
    _id: RSVP_ID,
    name: 'ana santos',
    email: ANA.email,
    status: 'PENDING',
    invitedAt: '2030-01-01T00:00:00.000Z',
    respondedAt: null,
    answers: [],
    subEventId: SUB_EVENT_ID,
  }
  const calls = await stubApi(page, {
    routes: {
      [`GET /rsvps/${RSVP_ID}/form`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          alreadyResponded: false,
          rsvp,
          invitation: null,
          subEvent: {
            name: SUB_EVENT.name,
            eventDate: SUB_EVENT.eventDate,
            venue: SUB_EVENT.venue,
            description: SUB_EVENT.description,
          },
          questions: [],
        },
      }),
      [`PATCH /rsvps/${RSVP_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'RSVP responded.', rsvp: { ...rsvp, status: 'GOING' } },
      }),
    },
  })

  await page.goto(`/rsvp/${RSVP_ID}`)

  await expect(page.getByRole('heading', { name: 'Rehearsal Dinner' })).toBeVisible()
  await expect(page.getByText(/March 9, 2030/)).toBeVisible()
  await expect(page.getByText('Garden Terrace')).toBeVisible()
  await expect(page.getByText('Dinner the night before')).toBeVisible()

  await page.getByText('Yes, I will attend').click()
  await page.getByRole('button', { name: 'Submit Response' }).click()

  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toMatchObject({ status: 'GOING' })
})
