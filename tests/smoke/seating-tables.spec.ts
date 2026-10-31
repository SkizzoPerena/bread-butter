import { GATHERING_ID, expect, test } from './helpers'
import { openWorkspace, seatingTable } from './seating-fixtures'

const TABLES_URL = `/gatherings/${GATHERING_ID}/tables`

const layoutSaves = (calls: { method: string, url: string, body: unknown }[]) =>
  calls.filter(call => call.method === 'PUT' && call.url.endsWith(TABLES_URL)).map(call => call.body)

test('a host gives each table its own size and an optional label', async ({ page }) => {
  const calls = await openWorkspace(page, {
    tables: [seatingTable('t1', 'Family', 8, 'Family')],
    routes: {
      [`PUT ${TABLES_URL}`]: route => route.fulfill({ json: { success: true, status: 200, gathering: {} } }),
    },
  })
  await page.getByRole('button', { name: /^Tables & Seats \(/ }).click()

  await page.getByLabel('Tables to add').fill('2')
  await page.getByLabel('Seats each').fill('4')
  await page.getByRole('button', { name: 'Add Tables' }).click()

  const rows = page.getByTestId('layout-row')
  await expect(rows).toHaveCount(3)
  await rows.nth(2).getByRole('spinbutton').fill('12')
  await rows.nth(1).getByRole('textbox').fill('Friends')
  await page.getByRole('button', { name: 'Save Layout' }).click()

  await expect.poll(() => layoutSaves(calls).length).toBe(1)
  expect(layoutSaves(calls)[0]).toEqual({
    confirmClear: false,
    tables: [
      { _id: 't1', label: 'Family', capacity: 8 },
      { label: 'Friends', capacity: 4 },
      { label: '', capacity: 12 },
    ],
  })
})

test('removing a seated guest asks first, and only then sends the confirmation', async ({ page }) => {
  let attempts = 0
  const calls = await openWorkspace(page, {
    tables: [seatingTable('t1', 'Table 1', 2)],
    routes: {
      [`PUT ${TABLES_URL}`]: (route) => {
        attempts += 1
        return attempts === 1
          ? route.fulfill({
              status: 409,
              json: { success: false, message: 'This layout removes guests from seats. Confirm to continue.' },
            })
          : route.fulfill({ json: { success: true, status: 200, gathering: {} } })
      },
    },
  })
  await page.getByRole('button', { name: /^Tables & Seats \(/ }).click()
  page.on('dialog', dialog => dialog.accept())

  await page.getByTestId('layout-row').getByRole('spinbutton').fill('1')
  await page.getByRole('button', { name: 'Save Layout' }).click()

  await expect.poll(() => layoutSaves(calls).length).toBe(2)
  expect(layoutSaves(calls).map(body => (body as { confirmClear: boolean }).confirmClear)).toEqual([false, true])
})
