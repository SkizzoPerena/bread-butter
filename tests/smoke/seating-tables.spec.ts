import type { Page, Route } from '@playwright/test'
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

  await page.getByPlaceholder('Filter tables, groups, or seated guests...').fill('Friends')
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

test('dropping a guest on a seat auto-assigns to the table', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1)],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Seat updated.', guest: moved({ tableId: 't1', seatNumber: 2 }), swappedGuest: null, seatVersion: 5 },
      }),
    },
  })

  await page.getByText('Maria Santos').dragTo(seatCell(page, 0, 1))

  await expect.poll(() => calls.find(call => call.url.endsWith(SEAT_URL))?.body).toEqual({ tableId: 't1' })
  await expect(seatCell(page, 0, 1)).toContainText('Maria Santos')
})

test('dropping a seated guest onto another table auto-assigns them', async ({ page }) => {
  const other = { _id: SECOND_GUEST_ID, firstName: 'Ben', lastName: 'Cruz', email: 'ben@example.com' }
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 2), table('t2', 2, 2)],
    guests: [{ tableId: 't1', seatNumber: 1 }, { ...other, tableId: 't2', seatNumber: 2 }],
    routes: {
      [`PATCH ${SEAT_URL}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          message: 'Seat updated.',
          guest: moved({ tableId: 't2', seatNumber: 1 }),
          swappedGuest: null,
          seatVersion: 5,
        },
      }),
    },
  })

  await seatCell(page, 0, 0).locator('[draggable="true"]').dragTo(seatCell(page, 1, 1))

  await expect.poll(() => calls.find(call => call.url.endsWith(SEAT_URL))?.body).toEqual({
    tableId: 't2',
  })
  await expect(seatCell(page, 1, 0)).toContainText('Maria Santos')
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

test('a table keeps its name readable in a narrow card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openTablesPage(page, {
    tables: [table('t1', 1, 2, 'Family'), table('t2', 2, 2, 'Friends'), table('t3', 3, 2, 'Colleagues')],
  })

  const name = page.getByRole('heading', { name: 'Family' })
  await expect(name).toBeVisible()
  expect((await name.boundingBox())?.width).toBeGreaterThan(30)
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

const GROUPS_URL = `/gatherings/${GATHERING_ID}/table-groups`
const ALLOTMENTS_URL = `/gatherings/${GATHERING_ID}/party-allotments`
const twoGroups = [
  { id: 'grp_1', name: 'Bride Side', color: 'rose' },
  { id: 'grp_2', name: 'Groom Side', color: 'blue' },
]

/** Answers a table-groups save with what was sent, as the server does. */
const savedGroups = (tables: unknown[]) => (route: Route) => {
  const body = route.request().postDataJSON()
  return route.fulfill({
    json: {
      success: true,
      status: 200,
      gathering: {
        _id: GATHERING_ID,
        status: 'ACTIVE',
        tables,
        tableGroups: body.groups,
        tableGroupAssignments: body.assignments,
        partyAllotments: {},
      },
    },
  })
}

const savedAllotments = (tables: unknown[], groups: object) => (route: Route) => route.fulfill({
  json: {
    success: true,
    status: 200,
    gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables, ...groups, partyAllotments: route.request().postDataJSON().allotments },
  },
})

test('table groups come from the plan, so they show on any device', async ({ page }) => {
  const calls = await openTablesPage(page, {
    tables: [table('t1', 1, 4, 'Family'), table('t2', 2)],
    gathering: { tableGroups: [twoGroups[0]], tableGroupAssignments: { t1: 'grp_1' }, partyAllotments: {} },
  })

  await expect(page.getByText('Bride Side').first()).toBeVisible()
  await expect(page.getByText('Ungrouped Tables')).toBeVisible()
  expect(calls.some(call => call.url.endsWith(GROUPS_URL))).toBe(false)
})

test('creating a table group saves it and its tables to the plan', async ({ page }) => {
  const tables = [table('t1', 1, 4, 'Family'), table('t2', 2)]
  const calls = await openTablesPage(page, {
    tables,
    routes: { [`PUT ${GROUPS_URL}`]: savedGroups(tables) },
  })

  await page.getByRole('button', { name: 'Create Table Group' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder("e.g. VIP / Presidential, Bride's Family, Entourage").fill('Bride Side')
  await dialog.getByRole('button', { name: /Family/ }).click()
  await dialog.getByRole('button', { name: 'Create Group' }).click()

  await expect.poll(() => calls.find(call => call.url.endsWith(GROUPS_URL))?.body).toBeTruthy()
  const body = calls.find(call => call.url.endsWith(GROUPS_URL))?.body as {
    groups: { id: string, name: string, color: string }[]
    assignments: Record<string, string>
  }
  expect(body.groups).toEqual([{ id: expect.stringMatching(/^grp_\d+$/), name: 'Bride Side', color: 'blue' }])
  expect(body.assignments).toEqual({ t1: body.groups[0]?.id })
})

test('allotting a party to a table group saves the allotment', async ({ page }) => {
  const tables = [table('t1', 1, 4, 'Family')]
  const groups = { tableGroups: twoGroups, tableGroupAssignments: { t1: 'grp_1' } }
  const calls = await openTablesPage(page, {
    tables,
    guests: [{ partyName: 'Reyes Family' }],
    gathering: { ...groups, partyAllotments: {} },
    routes: { [`PUT ${ALLOTMENTS_URL}`]: savedAllotments(tables, groups) },
  })

  await page.getByRole('button', { name: 'Auto-Sort by Groups' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: /Reyes Family/ }).click()

  await expect.poll(() => calls.findLast(call => call.url.endsWith(ALLOTMENTS_URL))?.body)
    .toEqual({ allotments: { grp_1: ['Reyes Family'] } })
})

test('the auto-sort dialog keeps saved allotments instead of guessing again', async ({ page }) => {
  // "Reyes" would be guessed into the first group, so seeing it stay in the second proves the saved choice won.
  const tables = [table('t1', 1, 4, 'Family')]
  const groups = {
    tableGroups: [{ id: 'grp_1', name: 'Reyes', color: 'rose' }, twoGroups[1]],
    tableGroupAssignments: { t1: 'grp_1' },
  }
  const calls = await openTablesPage(page, {
    tables,
    guests: [{ partyName: 'Reyes Family' }],
    gathering: { ...groups, partyAllotments: { grp_2: ['Reyes Family'] } },
    routes: { [`PUT ${ALLOTMENTS_URL}`]: savedAllotments(tables, groups) },
  })

  await page.getByRole('button', { name: 'Auto-Sort by Groups' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Execute Auto-Sort' }).click()

  await expect.poll(() => calls.findLast(call => call.url.endsWith(ALLOTMENTS_URL))?.body)
    .toEqual({ allotments: { grp_2: ['Reyes Family'] } })
})

test('groups saved only in this browser move to the plan once', async ({ page }) => {
  const tables = [table('t1', 1, 4, 'Family'), table('t2', 2)]
  await page.addInitScript((id) => {
    localStorage.setItem(`jam_table_groups_${id}`, JSON.stringify([
      { id: 'grp_1', name: 'Bride Side', color: 'rose' },
      { id: 'brides-side', name: 'Old sample', color: 'rose' },
    ]))
    // t9 was deleted since, so it must not be sent.
    localStorage.setItem(`jam_table_assignments_${id}`, JSON.stringify({ t1: 'grp_1', t9: 'grp_1' }))
  }, GATHERING_ID)
  const calls = await openTablesPage(page, {
    tables,
    routes: { [`PUT ${GROUPS_URL}`]: savedGroups(tables) },
  })

  await expect.poll(() => calls.find(call => call.url.endsWith(GROUPS_URL))?.body).toEqual({
    groups: [{ id: 'grp_1', name: 'Bride Side', color: 'rose' }],
    assignments: { t1: 'grp_1' },
  })
  await expect.poll(() => page.evaluate(id => localStorage.getItem(`jam_table_groups_${id}`), GATHERING_ID)).toBeNull()
  expect(calls.filter(call => call.url.endsWith(GROUPS_URL))).toHaveLength(1)
})
