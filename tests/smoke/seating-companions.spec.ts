import { GATHERING_ID, PASS_TOKEN, expect, stubApi, test } from './helpers'
import { openGuestsPage, openSettingsPage } from './seating-fixtures'

const COMPANIONS_URL = `/guest/seating/rsvp/${PASS_TOKEN}/companions`
const SEATS_URL = `/guest/seating/rsvp/${PASS_TOKEN}/seats`
const COMPANION_ID = '507f1f77bcf86cd799439031'

const companion = (overrides = {}) => ({
  _id: COMPANION_ID,
  firstName: 'Maria\'s companion',
  lastName: '1',
  name: 'Maria\'s companion 1',
  namePending: true,
  tableId: null,
  tableLabel: null,
  seatNumber: null,
  checkedInAt: null,
  attendPath: '/attend/companion-token',
  ...overrides,
})

const pass = (overrides = {}) => ({
  success: true,
  status: 200,
  gatheringName: 'Damson supper',
  name: 'Maria Santos',
  seated: false,
  tableLabel: null,
  seatNumber: null,
  checkedInAt: null,
  isCompanion: false,
  companions: [],
  ...overrides,
})

const seatMap = (overrides = {}) => ({
  success: true,
  status: 200,
  gatheringName: 'Damson supper',
  locked: false,
  seat: null,
  companions: [],
  tables: [{ _id: 't1', label: 'Family', seats: [{ number: 1, status: 'OPEN' }, { number: 2, status: 'OPEN' }] }],
  ...overrides,
})

test('a guest adds a named companion and one with no name yet, up to the limit', async ({ page }) => {
  const saved = [
    companion({ firstName: 'Ana', lastName: 'Reyes', name: 'Ana Reyes', namePending: false }),
    companion({ _id: '507f1f77bcf86cd799439032', name: 'Maria\'s companion 1' }),
  ]
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({ json: pass() }),
      [`GET ${SEATS_URL}`]: route => route.fulfill({ json: seatMap() }),
      [`GET ${COMPANIONS_URL}`]: route => route.fulfill({ json: { success: true, status: 200, maxCompanions: 2, companions: [] } }),
      [`PUT ${COMPANIONS_URL}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Your companions are saved.', maxCompanions: 2, companions: saved },
      }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Bringing anyone?' })).toBeVisible()

  await page.getByRole('button', { name: 'Add a companion' }).click()
  await page.getByRole('button', { name: 'Add a companion' }).click()
  await expect(page.getByRole('button', { name: 'Add a companion' })).toHaveCount(0)

  const rows = page.getByTestId('companion-row')
  await rows.nth(0).getByLabel('First name').fill('Ana')
  await rows.nth(0).getByLabel('Last name').fill('Reyes')
  await page.getByRole('button', { name: 'Save companions' }).click()

  await expect(page.getByRole('status')).toHaveText('Your companions are saved.')
  expect(calls.find(call => call.method === 'PUT')?.body).toEqual({
    companions: [{ firstName: 'Ana', lastName: 'Reyes' }, {}],
  })
  await expect(rows.nth(1).getByLabel('First name')).toHaveAttribute('placeholder', 'Maria\'s companion 1')
})

test('half a name is caught before anything is sent', async ({ page }) => {
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({ json: pass() }),
      [`GET ${SEATS_URL}`]: route => route.fulfill({ json: seatMap() }),
      [`GET ${COMPANIONS_URL}`]: route => route.fulfill({ json: { success: true, status: 200, maxCompanions: 1, companions: [] } }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  await page.getByRole('button', { name: 'Add a companion' }).click()
  await page.getByTestId('companion-row').getByLabel('First name').fill('Ana')
  await page.getByRole('button', { name: 'Save companions' }).click()

  await expect(page.getByRole('alert')).toContainText('Enter both a first and last name')
  expect(calls.filter(call => call.method === 'PUT')).toHaveLength(0)
})

test('the form stays hidden when the host has not allowed companions', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({ json: pass() }),
      [`GET ${SEATS_URL}`]: route => route.fulfill({ json: seatMap() }),
      [`GET ${COMPANIONS_URL}`]: route => route.fulfill({ json: { success: true, status: 200, maxCompanions: 0, companions: [] } }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  await expect(page.getByRole('heading', { name: 'Damson supper' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bringing anyone?' })).toHaveCount(0)
})

test.skip('a guest chooses a seat for their companion, and sees it as theirs', async ({ page }) => {
  const named = { _id: COMPANION_ID, name: 'Ana Reyes', seat: null }
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({ json: pass() }),
      [`GET ${COMPANIONS_URL}`]: route => route.fulfill({ json: { success: true, status: 200, maxCompanions: 1, companions: [] } }),
      [`GET ${SEATS_URL}`]: route => route.fulfill({ json: seatMap({ companions: [named] }) }),
      [`POST ${SEATS_URL}`]: route => route.fulfill({
        json: seatMap({
          message: 'Their seat is saved.',
          companions: [{ ...named, seat: { tableId: 't1', tableLabel: 'Family', seatNumber: 1 } }],
          tables: [{ _id: 't1', label: 'Family', seats: [{ number: 1, status: 'COMPANION', companionId: COMPANION_ID }, { number: 2, status: 'OPEN' }] }],
        }),
      }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  await page.getByLabel('Who is this seat for?').selectOption({ label: 'Ana Reyes' })
  await expect(page.getByText('Ana Reyes doesn\'t have a seat yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Sit here: Family, seat 1' }).click()

  await expect(page.getByText('Ana Reyes is at Family, seat 1.')).toBeVisible()
  expect(calls.find(call => call.method === 'POST' && call.url.endsWith('/seats'))?.body).toEqual({
    tableId: 't1',
    seatNumber: 1,
    companionId: COMPANION_ID,
  })
})

test('a guest\'s pass links to each companion\'s pass', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({
        json: pass({ companions: [companion({ name: 'Ana Reyes', namePending: false, tableLabel: 'Family', seatNumber: 2 })] }),
      }),
      [`GET ${SEATS_URL}`]: route => route.fulfill({ json: seatMap() }),
      [`GET ${COMPANIONS_URL}`]: route => route.fulfill({ json: { success: true, status: 200, maxCompanions: 1, companions: [] } }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  const section = page.getByTestId('pass-companions')
  await expect(section).toContainText('Ana Reyes')
  await expect(section).toContainText('Family, seat 2')
  await expect(section.getByRole('link', { name: 'Open pass' })).toHaveAttribute('href', '/attend/companion-token')
})

test('a companion\'s own pass shows their seat, but no picker or form', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({
        json: pass({ name: 'Ana Reyes', isCompanion: true, seated: true, tableLabel: 'Family', seatNumber: 2 }),
      }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  await expect(page.getByText('Family, seat 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose your seat' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Bringing anyone?' })).toHaveCount(0)
})

test('a host sets how many companions each guest can bring', async ({ page }) => {
  const calls = await openSettingsPage(page, {
    gathering: { maxCompanionsPerGuest: 1 },
    routes: {
      [`GET /gatherings/${GATHERING_ID}/upgrade-options`]: route => route.fulfill({
        json: { success: true, status: 200, current: {}, options: [], pendingUpgrade: null },
      }),
      [`PATCH /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, name: 'Damson supper', status: 'ACTIVE', tables: [], maxGuests: 10 } },
      }),
    },
  })
  await expect(page.getByTestId('max-companions')).toHaveText('1')

  await page.getByRole('button', { name: 'Allow more companions' }).click()
  await page.getByRole('button', { name: 'Save Jam Settings' }).click()

  await expect.poll(() => calls.some(call => (
    call.method === 'PATCH' && (call.body as { maxCompanionsPerGuest?: number })?.maxCompanionsPerGuest === 2
  ))).toBe(true)
})

test('a companion on the guest list has no email actions or reply control', async ({ page }) => {
  await openGuestsPage(page, {
    guests: [
      {},
      {
        _id: COMPANION_ID,
        companionOf: '507f1f77bcf86cd799439021',
        firstName: 'Maria\'s companion',
        lastName: '1',
        email: undefined,
      },
    ],
  })

  const row = page.getByRole('row').filter({ hasText: 'Maria\'s companion 1' })
  await expect(row).toContainText('+1 of Maria Santos')
  await expect(row.getByTitle('Send / Resend Invitation Email')).toHaveCount(0)
  await expect(row.getByTitle('Resend QR Pass')).toHaveCount(0)
  await expect(row.getByRole('combobox')).toHaveCount(0)

  const primary = page.getByRole('row').filter({ hasText: 'maria@example.com' })
  await expect(primary.getByTitle('Send / Resend Invitation Email')).toBeVisible()
})
