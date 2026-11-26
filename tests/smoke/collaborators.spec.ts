import { EVENT_ID, GATHERING_ID, expect, signIn, stubApi, test } from './helpers'

// The fake access token's account id, so the signed-in person is the host (or, as a partner, the coordinator).
const VIEWER_ID = GATHERING_ID
const PARTNER_ID = '507f1f77bcf86cd799439081'
const FRIEND_ID = '507f1f77bcf86cd799439082'

const eventOn = (code: string) => ({
  _id: EVENT_ID,
  eventName: 'Garden wedding',
  eventType: 'WEDDING',
  description: 'Planner event',
  venue: 'Manila',
  eventDate: '2030-06-01T00:00:00.000Z',
  status: 'ONGOING',
  priceTier: { code, name: code },
  paymentSummary: { isFullyPaid: true },
  latestPayment: { status: 'APPROVED' },
})

function eventRoutes(code: string) {
  const event = eventOn(code)
  return {
    [`GET /events/${EVENT_ID}`]: route => route.fulfill({
      json: { success: true, status: 200, event, guestList: [], rsvpSummary: null, tasks: null },
    }),
    'GET /user/events': route => route.fulfill({ json: { success: true, status: 200, events: [event] } }),
  } satisfies Record<string, (route: import('@playwright/test').Route) => unknown>
}

const roster = (partnerId: string) => ({
  success: true,
  status: 200,
  owner: { _id: VIEWER_ID, firstName: 'Jane', lastName: 'Host', email: 'host@example.com' },
  collaborators: [{ _id: FRIEND_ID, firstName: 'Mia', lastName: 'Friend', email: 'mia@example.com' }],
  partnerCollaborators: [
    { _id: partnerId, firstName: 'Cora', lastName: 'Coordinator', email: 'cora@example.com', joinedVia: 'VOUCHER' },
  ],
})

test('the host sees everyone, invites a coordinator, and removes one who joined via voucher', async ({ page }) => {
  await signIn(page)
  const calls = await stubApi(page, {
    routes: {
      ...eventRoutes('BREAD_BUTTER'),
      [`GET /user/events/${EVENT_ID}/collaborators`]: route => route.fulfill({ json: roster(PARTNER_ID) }),
      [`GET /user/events/${EVENT_ID}/collaborations`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          invites: [{ _id: 'inv1', inviteeEmail: 'newbie@example.com', inviteeType: 'USER', awaitingSignup: true }],
        },
      }),
      [`POST /user/events/${EVENT_ID}/collaborations`]: route => route.fulfill({
        status: 201,
        json: { success: true, status: 201, message: 'Collaboration invite sent.' },
      }),
      [`DELETE /user/events/${EVENT_ID}/collaborators/${PARTNER_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Collaborator access revoked.' },
      }),
    },
  })

  await page.goto(`/event/settings?eventId=${EVENT_ID}`)

  await expect(page.getByText('Collaborators', { exact: true })).toBeVisible()
  await expect(page.getByText('Cora Coordinator')).toBeVisible()
  await expect(page.getByText('Joined via voucher')).toBeVisible()
  await expect(page.getByText('Mia Friend')).toBeVisible()
  await expect(page.getByText('newbie@example.com')).toBeVisible()
  await expect(page.getByText("hasn't signed up yet")).toBeVisible()

  await page.getByPlaceholder('name@example.com').fill('coord@example.com')
  await page.getByText('Coordinator', { exact: true }).last().click()
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect.poll(() => calls.find(call => call.method === 'POST' && call.url.includes('/collaborations'))?.body)
    .toEqual({ email: 'coord@example.com', role: 'PARTNER' })

  const coraRow = page.getByRole('listitem').filter({ hasText: 'Cora Coordinator' })
  await coraRow.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Their voucher discount and earnings on this booking stay as they are.')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
  await expect.poll(() => calls.some(call => call.method === 'DELETE' && call.url.endsWith(`/collaborators/${PARTNER_ID}`)))
    .toBe(true)
})

test('below Bread + Butter the card points the host to an upgrade instead', async ({ page }) => {
  await signIn(page)
  const calls = await stubApi(page, { routes: eventRoutes('BUTTER') })

  await page.goto(`/event/settings?eventId=${EVENT_ID}`)

  await expect(page.getByText('Collaborators come with the Bread + Butter package.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'See upgrade options' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send invite' })).toHaveCount(0)
  expect(calls.some(call => call.url.includes('/collaborators'))).toBe(false)
})

test('a coordinator sees the team and can only leave, through the partner API', async ({ page }) => {
  await signIn(page, 'partner')
  const calls = await stubApi(page, {
    routes: {
      ...eventRoutes('BREAD_BUTTER'),
      [`GET /partner/events/${EVENT_ID}/collaborators`]: route => route.fulfill({
        json: { ...roster(VIEWER_ID), owner: { _id: FRIEND_ID, firstName: 'Jane', lastName: 'Host', email: 'host@example.com' } },
      }),
    },
  })

  await page.goto(`/event/settings?eventId=${EVENT_ID}&role=partner`)

  const ownRow = page.getByRole('listitem').filter({ hasText: 'Cora Coordinator' })
  await expect(ownRow.getByRole('button', { name: 'Leave' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Send invite' })).toHaveCount(0)
  expect(calls.some(call => call.url.includes(`/user/events/${EVENT_ID}/collaborat`))).toBe(false)
})

test('an invited user accepts from their invites page and lands on the event', async ({ page }) => {
  await signIn(page)
  const calls = await stubApi(page, {
    routes: {
      ...eventRoutes('BREAD_BUTTER'),
      'GET /user/collaborations/incoming': route => route.fulfill({
        json: {
          success: true,
          status: 200,
          collaborations: [{
            _id: 'c1',
            event: { _id: EVENT_ID, eventName: 'Garden wedding', venue: 'Manila' },
            invitedBy: { firstName: 'Jane', lastName: 'Host', email: 'host@example.com' },
          }],
        },
      }),
      'PATCH /user/collaborations/c1/accept': route => route.fulfill({
        json: { success: true, status: 200, message: 'Collaboration invite accepted.', eventId: EVENT_ID },
      }),
    },
  })

  await page.goto('/user/collaborations')
  await expect(page.getByText('Garden wedding')).toBeVisible()
  await expect(page.getByText('Invited by: Jane Host')).toBeVisible()

  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page).toHaveURL(new RegExp(`/event/dashboard-bread-butter\\?eventId=${EVENT_ID}`))
  expect(calls.some(call => call.method === 'PATCH' && call.url.endsWith('/user/collaborations/c1/accept'))).toBe(true)
})

test('the invite link fills in the email on the signup pages', async ({ page }) => {
  await stubApi(page)

  await page.goto('/partners/signup?invite=cora%40example.com')
  await expect(page.getByPlaceholder('Enter your email')).toHaveValue('cora@example.com')

  await page.goto('/user/signup?invite=mia%40example.com')
  await expect(page.getByPlaceholder('Enter your email')).toHaveValue('mia@example.com')
})
