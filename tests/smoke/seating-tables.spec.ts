import type { Page } from '@playwright/test'
import { GATHERING_ID, expect, test } from './helpers'
import { openTablesPage, seatingTable } from './seating-fixtures'

const TABLES_URL = `/gatherings/${GATHERING_ID}/tables`
const GUEST_ID = '507f1f77bcf86cd799439021'
const SECOND_GUEST_ID = '507f1f77bcf86cd799439022'
const SEAT_URL = `/gatherings/${GATHERING_ID}/guests/${GUEST_ID}/seat`

const seats = (capacity: number, unavailable: number[] = []) => Array.from({ length: capacity }, (_, index) => ({
  number: index + 1,
  unavailable: unavailable.includes(index + 1),
  guest: null,
}))

const table = (_id: string, position: number, capacity = 4, customLabel = '', unavailable: number[] = []) => ({
  ...seatingTable(_id, customLabel || `Table ${position}`, capacity, customLabel),
  sortOrder: position - 1,
  seats: seats(capacity, unavailable),
})

const tableCards = (page: Page) => page.getByTestId('jam-table')
const tableHeader = (page: Page, index: number) => tableCards(page).nth(index).locator('[draggable="true"]').first()
const seatCell = (page: Page, tableIndex: number, seatIndex: number) =>
  tableCards(page).nth(tableIndex).getByTestId('host-seat').nth(seatIndex)
const moved = (overrides: object) => ({
  _id: GUEST_ID,
  firstName: 'Maria',
  lastName: 'Santos',
  email: 'maria@example.com',
  partyName: '',
  rsvpStatus: 'GOING',
  isAttending: true,
  attendanceToken: 'token',
  attendanceQrSentAt: null,
  checkedInAt: null,
  ...overrides,
})

test('dragging one table onto another swaps them, and guests stay with their table', async ({ page }) => {
  const tables = [table('t1', 1, 4, 'Family'), table('t2', 2)]
  const calls = await openTablesPage(page, {
    tables,
    guests: [{ tableId: 't1', seatNumber: 1 }],
    routes: {
      [`POST ${TABLES_URL}/swap`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [{ ...tables[1], label: 'Table 1' }, tables[0]] },
        },
      }),
    },
  })

  await tableHeader(page, 0).dragTo(tableCards(page).nth(1))

  await expect.poll(() => calls.find(call => call.url.endsWith('/tables/swap'))?.body).toEqual({ tableId: 't1', withTableId: 't2' })
  await expect(tableCards(page).nth(0)).toContainText('Table 1')
  await expect(tableCards(page).nth(1)).toContainText('Family')
  await expect(tableCards(page).nth(1)).toContainText('Table 2')
  await expect(tableCards(page).nth(1)).toContainText('Maria Santos')
})

test('swapping with a filter on swaps the tables that are shown', async ({ page }) => {
  const tables = [table('t1', 1, 2, 'Family'), table('t2', 2, 2, 'Friends'), table('t3', 3, 2, 'Friends two')]
  const calls = await openTablesPage(page, {
    tables,
    routes: {
      [`POST ${TABLES_URL}/swap`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [tables[0], tables[2], tables[1]] } },
      }),
    },
  })

  await page.getByPlaceholder('Filter tables or search seated guest...').fill('Friends')
  await expect(tableCards(page)).toHaveCount(2)
  await tableHeader(page, 0).dragTo(tableCards(page).nth(1))

  await expect.poll(() => calls.find(call => call.url.endsWith('/tables/swap'))?.body).toEqual({ tableId: 't2', withTableId: 't3' })
})

test('seats show their real numbers, including a guest who chose a later seat', async ({ page }) => {
  await openTablesPage(page, {
    tables: [table('t1', 1, 4, '', [2])],
    guests: [{ tableId: 't1', seatNumber: 3 }],
  })

  await expect(seatCell(page, 0, 2)).toContainText('Maria Santos')
  await expect(seatCell(page, 0, 0)).toContainText('Available')
  await expect(seatCell(page, 0, 1)).toContainText('Unavailable')
})

test('dropping a guest on a table lets the server choose the seat', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1)],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Seat updated.', guest: moved({ tableId: 't1', seatNumber: 3 }), swappedGuest: null, seatVersion: 5 },
      }),
    },
  })

  await page.getByText('Maria Santos').dragTo(tableHeader(page, 0))

  await expect.poll(() => calls.find(call => call.url.endsWith(SEAT_URL))?.body).toEqual({ tableId: 't1' })
  await expect(seatCell(page, 0, 2)).toContainText('Maria Santos')
})

test('dropping a guest on an empty seat takes that seat, if it is still empty', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1)],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Seat updated.', guest: moved({ tableId: 't1', seatNumber: 2 }), swappedGuest: null, seatVersion: 5 },
      }),
    },
  })

  await page.getByText('Maria Santos').dragTo(seatCell(page, 0, 1))

  await expect.poll(() => calls.find(call => call.url.endsWith(SEAT_URL))?.body).toEqual({ tableId: 't1', seatNumber: 2, expectedGuestId: null })
  await expect(seatCell(page, 0, 1)).toContainText('Maria Santos')
})

test('dropping a guest on a taken seat swaps the two guests', async ({ page }) => {
  const other = { _id: SECOND_GUEST_ID, firstName: 'Ben', lastName: 'Cruz', email: 'ben@example.com' }
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 2), table('t2', 2, 2)],
    guests: [{ tableId: 't1', seatNumber: 1 }, { ...other, tableId: 't2', seatNumber: 2 }],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          message: 'Seats swapped.',
          guest: moved({ tableId: 't2', seatNumber: 2 }),
          swappedGuest: moved({ ...other, tableId: 't1', seatNumber: 1 }),
          seatVersion: 5,
        },
      }),
    },
  })

  await seatCell(page, 0, 0).locator('[draggable="true"]').dragTo(seatCell(page, 1, 1))

  await expect.poll(() => calls.find(call => call.url.endsWith(SEAT_URL))?.body).toEqual({
    tableId: 't2',
    seatNumber: 2,
    expectedGuestId: SECOND_GUEST_ID,
  })
  await expect(seatCell(page, 0, 0)).toContainText('Ben Cruz')
  await expect(seatCell(page, 1, 1)).toContainText('Maria Santos')
})

test('a seat someone just took is explained, and the plan reloads', async ({ page }) => {
  await openTablesPage(page, {
    tables: [table('t1', 1)],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        status: 409,
        json: { success: false, message: 'That seat just changed. Refresh and try again.' },
      }),
    },
  })

  await page.getByText('Maria Santos').dragTo(seatCell(page, 0, 0))

  await expect(page.getByText('That seat just changed. Refresh and try again.').first()).toBeVisible()
  await expect(seatCell(page, 0, 0)).toContainText('Available')
})

test('deleting a table with guests asks first, then sends the confirmation', async ({ page }) => {
  const tables = [table('t1', 1), table('t2', 2)]
  const calls = await openTablesPage(page, {
    tables,
    guests: [{ tableId: 't1', seatNumber: 1 }],
    routes: {
      [`PUT ${TABLES_URL}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [{ ...tables[1], label: 'Table 1' }] } },
      }),
    },
  })
  const saves = () => calls.filter(call => call.method === 'PUT' && call.url.endsWith(TABLES_URL))

  page.once('dialog', dialog => dialog.dismiss())
  await tableCards(page).nth(0).getByTitle('Delete Table').click()
  await expect(tableCards(page)).toHaveCount(2)
  expect(saves()).toHaveLength(0)

  page.once('dialog', dialog => dialog.accept())
  await tableCards(page).nth(0).getByTitle('Delete Table').click()
  await expect.poll(() => saves()[0]?.body).toEqual({
    tables: [{ _id: 't2', label: '', capacity: 4 }],
    confirmClear: true,
  })
  await expect(tableCards(page)).toHaveCount(1)
})

test('shrinking a table past a seated guest asks first, then saves once', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 2)],
    guests: [{ tableId: 't1', seatNumber: 2 }],
    routes: {
      [`PATCH ${TABLES_URL}/t1`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [table('t1', 1, 1)] } },
      }),
    },
  })

  page.once('dialog', dialog => dialog.accept())
  await tableCards(page).nth(0).getByRole('button', { name: '-', exact: true }).click()

  await expect.poll(() => calls.find(call => call.url.endsWith(`${TABLES_URL}/t1`))?.body).toEqual({ capacity: 1, confirmClear: true })
  await expect(page.getByText('Unassigned Guests')).toBeVisible()
  await expect(tableCards(page).nth(0).getByTestId('host-seat')).toHaveCount(1)
})

test('renaming sends only the name, and an empty name goes back to the position', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 2, 'Family')],
    routes: {
      [`PATCH ${TABLES_URL}/t1`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [table('t1', 1, 2)] } },
      }),
    },
  })

  await page.getByRole('heading', { name: 'Family' }).click()
  await page.getByPlaceholder('e.g. VIP Table, Presidential, Family').fill('')
  await page.getByRole('button', { name: 'Change table name' }).click()

  await expect.poll(() => calls.find(call => call.url.endsWith(`${TABLES_URL}/t1`))?.body).toEqual({ label: '' })
  await expect(tableCards(page).nth(0)).toContainText('Table 1')
})

test('a host marks an empty seat unavailable', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 2)],
    routes: {
      [`PATCH ${TABLES_URL}/t1/seats/1`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [table('t1', 1, 2, '', [1])] } },
      }),
    },
  })

  await page.getByRole('button', { name: 'Make unavailable: Table 1, seat 1' }).click()

  await expect(seatCell(page, 0, 0)).toContainText('Unavailable')
  expect(calls.find(call => call.url.endsWith('/seats/1'))?.body).toEqual({ unavailable: true })
})
