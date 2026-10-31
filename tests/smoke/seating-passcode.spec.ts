import { GATHERING_ID, PASS_TOKEN, expect, test } from './helpers'
import { stubApi } from './helpers'
import { openWorkspace } from './seating-fixtures'

const invitation = {
  success: true,
  status: 200,
  gatheringName: 'Damson supper',
  venue: 'The Hall',
  eventDate: '2030-01-01T00:00:00.000Z',
  invitationMessage: 'Come hungry.',
}

test('an invitation with no passcode opens straight away', async ({ page }) => {
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/site/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false },
      }),
      [`POST /guest/seating/site/${PASS_TOKEN}/unlock`]: route => route.fulfill({ json: invitation }),
    },
  })
  await page.goto(`/jam/${PASS_TOKEN}`)

  await expect(page.getByText('Come hungry.')).toBeVisible()
  await expect(page.getByLabel('Passcode')).toHaveCount(0)
  expect(calls.filter(call => call.url.endsWith('/unlock'))).toHaveLength(1)
})

test('an invitation with a passcode still asks for it', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/site/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: true },
      }),
      [`POST /guest/seating/site/${PASS_TOKEN}/unlock`]: route => route.fulfill({ json: invitation }),
    },
  })
  await page.goto(`/jam/${PASS_TOKEN}`)

  await expect(page.getByText('Come hungry.')).toHaveCount(0)
  await page.getByLabel('Passcode').fill('jam-door')
  await page.getByRole('button', { name: 'Open invitation' }).click()
  await expect(page.getByText('Come hungry.')).toBeVisible()
})

test('a guest replies with no passcode step when the plan has none', async ({ page }) => {
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/rsvp/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false, needsName: false },
      }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'You are marked as not coming.', rsvpStatus: 'NOT_GOING' },
      }),
    },
  })
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)

  await expect(page.getByLabel('Passcode')).toHaveCount(0)
  await page.getByLabel('No, I cannot attend').check()
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByText('You are marked as not coming.')).toBeVisible()
  const reply = calls.find(call => call.method === 'POST' && call.url.endsWith(`/rsvp/${PASS_TOKEN}`))
  expect(reply?.body).toEqual({ passcode: '', rsvpStatus: 'NOT_GOING', answers: [] })
})

test('a host can save an invitation with the passcode left empty', async ({ page }) => {
  const calls = await openWorkspace(page, {
    routes: {
      [`PATCH /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [], passcode: '' } },
      }),
    },
  })
  await page.getByRole('button', { name: 'Invitation & Passcode' }).click()
  await page.getByRole('button', { name: 'Save Invitation' }).click()

  await expect.poll(() => calls.filter(call => call.method === 'PATCH').length).toBe(1)
  expect(calls.find(call => call.method === 'PATCH')?.body).toMatchObject({ passcode: '' })
})
