import { EVENT_ID, GATHERING_ID, expect, signIn, stubApi, test } from './helpers'

const EVENT_GRANT = {
  _id: '507f1f77bcf86cd799439061',
  product: 'EVENT',
  priceTier: { _id: '507f1f77bcf86cd799439071', name: 'Bread + Butter', code: 'BREAD_BUTTER', pricePhp: 10000 },
  jamPackage: null,
  packageName: 'Bread + Butter',
  source: 'ADMIN',
  status: 'AVAILABLE',
  currentPricePhp: 10000,
  createdAt: '2026-11-23T00:00:00.000Z',
}

const JAM_PACKAGE = { _id: '507f1f77bcf86cd799439081', name: 'Strawberry', pricePhp: 3500, maxGuests: 80, isEnabled: true }

const JAM_GRANT = {
  ...EVENT_GRANT,
  _id: '507f1f77bcf86cd799439062',
  product: 'JAM',
  priceTier: null,
  jamPackage: JAM_PACKAGE,
  packageName: 'Strawberry',
  currentPricePhp: 3500,
}

const createdEvent = {
  _id: EVENT_ID,
  eventName: 'Ina and Leo',
  eventType: 'WEDDING',
  description: 'Ina and Leo at The Garden',
  venue: 'The Garden',
  eventDate: '2030-06-01T00:00:00.000Z',
  status: 'ONGOING',
  priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter', pricePhp: 10000 },
  complimentary: { grant: EVENT_GRANT._id, listPricePhp: 10000 },
  paymentSummary: { fee: 0, totalReceived: 0, balanceDue: 0, isFullyPaid: true, isComplimentary: true },
}

async function fillEventDetails(page: import('@playwright/test').Page) {
  await page.getByPlaceholder("e.g. Mark & Sarah's Celebration").fill('Ina and Leo')
  await page.locator('input[type="date"]').fill('2030-06-01')
  await page.getByPlaceholder('e.g. Manila Cathedral / Grand Ballroom').fill('The Garden')
}

test('a user with a free credit creates their event without a payment step', async ({ page }) => {
  await signIn(page)
  let createBody = ''
  let grants = [EVENT_GRANT]
  await stubApi(page, {
    routes: {
      'GET /user/complimentary/grants': route => route.fulfill({ json: { success: true, status: 200, grants } }),
      'POST /user/events': (route) => {
        createBody = route.request().postData() ?? ''
        grants = []
        return route.fulfill({ status: 201, json: { success: true, status: 201, event: createdEvent } })
      },
      // The event dashboard loads the new event, which is already paid for.
      [`GET /user/events/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, event: createdEvent, guestList: [], rsvpSummary: null, tasks: null },
      }),
      'GET /user/events': route => route.fulfill({
        json: { success: true, status: 200, events: createBody ? [createdEvent] : [] },
      }),
    },
  })

  await page.goto('/user/create-event')
  await expect(page.getByText('Free Bread + Butter event')).toBeVisible()
  await page.getByRole('button', { name: 'Create my free event' }).click()

  await expect(page.getByText('Free with your credit · no payment needed')).toBeVisible()
  await fillEventDetails(page)
  await page.getByRole('button', { name: 'Create My Free Event' }).click()

  await expect(page).toHaveURL(/\/event\/dashboard-bread-butter\?eventId=/)
  expect(createBody).toContain(EVENT_GRANT._id)
  expect(createBody).toContain('complimentaryGrantId')
  expect(createBody).toContain(EVENT_GRANT.priceTier._id)
  expect(createBody).not.toContain('proofOfPayment')
})

test('redeeming a code on the create page picks the free package straight away', async ({ page }) => {
  await signIn(page)
  const redeemed: unknown[] = []
  await stubApi(page, {
    routes: {
      'GET /user/complimentary/grants': route => route.fulfill({ json: { success: true, status: 200, grants: [] } }),
      'POST /user/redemption-codes/redeem': (route) => {
        const body = route.request().postDataJSON()
        redeemed.push(body)
        if (body.code !== 'FIRST100') {
          return route.fulfill({ status: 404, json: { success: false, message: "That code isn't valid." } })
        }
        return route.fulfill({
          status: 201,
          json: { success: true, status: 201, message: "You've got a free Bread + Butter event.", grant: { ...EVENT_GRANT, source: 'CODE' } },
        })
      },
    },
  })

  await page.goto('/user/create-event')
  const codeInput = page.getByLabel('Redemption code')
  // A click that lands before the page hydrates does nothing, so retry until the box opens.
  await expect(async () => {
    await page.getByRole('button', { name: 'Have a code for a free event or Jam?' }).click()
    await expect(codeInput).toBeVisible({ timeout: 1000 })
  }).toPass()

  await codeInput.fill('nope')
  await page.getByRole('button', { name: 'Redeem' }).click()
  await expect(page.getByText("That code isn't valid.")).toBeVisible()

  await codeInput.fill(' first100 ')
  await page.getByRole('button', { name: 'Redeem' }).click()
  await expect(page.getByText("You've got a free Bread + Butter event.").first()).toBeVisible()
  await expect(page.getByText('Free with your credit · no payment needed')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create My Free Event' })).toBeVisible()
  expect(redeemed).toEqual([{ code: 'NOPE' }, { code: 'FIRST100' }])
})

test('a user with a free Jam credit creates an active Jam without paying', async ({ page }) => {
  await signIn(page)
  let createBody: Record<string, unknown> | null = null
  await stubApi(page, {
    routes: {
      'GET /user/complimentary/grants': route => route.fulfill({ json: { success: true, status: 200, grants: [JAM_GRANT] } }),
      'GET /user/seating/jam-packages': route => route.fulfill({ json: { success: true, status: 200, packages: [JAM_PACKAGE] } }),
      'POST /user/seating/gatherings': (route) => {
        createBody = route.request().postDataJSON()
        return route.fulfill({
          status: 201,
          json: {
            success: true,
            status: 201,
            gathering: {
              _id: GATHERING_ID,
              name: 'Santos reunion',
              status: 'ACTIVE',
              packageName: 'Strawberry',
              pricePhp: 3500,
              maxGuests: 80,
              jamPackage: JAM_PACKAGE._id,
              complimentary: { grant: JAM_GRANT._id, listPricePhp: 3500 },
              payment: { _id: 'p1', amount: 0, status: 'APPROVED', provider: 'COMPLIMENTARY' },
            },
          },
        })
      },
    },
  })

  await page.goto(`/user/create-seating?grant=${JAM_GRANT._id}`)
  await expect(page.getByText('Free with your credit · no payment needed')).toBeVisible()
  await page.getByPlaceholder('Santos reunion').fill('Santos reunion')
  await page.locator('input[type="date"]').fill('2030-06-01')
  await page.getByPlaceholder('The garden hall').fill('The Hall')
  await page.getByRole('button', { name: 'Create my free Jam' }).click()

  await expect(page).toHaveURL(new RegExp(`/jam/dashboard/${GATHERING_ID}`))
  expect(createBody).toMatchObject({
    packageId: JAM_PACKAGE._id,
    name: 'Santos reunion',
    venue: 'The Hall',
    complimentaryGrantId: JAM_GRANT._id,
  })
})
