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

test('a saved layout shows after a refresh, however the tables differ', async ({ page }) => {
  await openWorkspace(page, {
    tables: [seatingTable('t1', 'Family', 10, 'Family'), seatingTable('t2', 'Table 2', 4), seatingTable('t3', 'Table 3', 6)],
  })
  await page.reload()
  await page.getByRole('button', { name: /^Tables & Seats \(/ }).click()

  const rows = page.getByTestId('layout-row')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0).getByRole('textbox')).toHaveValue('Family')
  await expect(rows.nth(0).getByRole('spinbutton')).toHaveValue('10')
  await expect(rows.nth(1).getByRole('spinbutton')).toHaveValue('4')
  await expect(rows.nth(2).getByRole('spinbutton')).toHaveValue('6')
})

test('reloading the data after another action keeps a layout still being edited', async ({ page }) => {
  await openWorkspace(page, { tables: [seatingTable('t1', 'Table 1', 8)] })
  await page.getByRole('button', { name: /^Tables & Seats \(/ }).click()
  await page.getByTestId('layout-row').getByRole('spinbutton').fill('5')

  await page.getByRole('button', { name: /^Guests \(/ }).click()
  await page.getByPlaceholder('First name').fill('Otto')
  await page.getByPlaceholder('Last name').fill('Reyes')
  await page.getByPlaceholder('guest@example.com').fill('otto@example.com')
  await page.getByRole('button', { name: 'Add Guest' }).click()
  await expect(page.getByText('otto@example.com')).toBeVisible()

  await page.getByRole('button', { name: /^Tables & Seats \(/ }).click()
  await expect(page.getByTestId('layout-row').getByRole('spinbutton')).toHaveValue('5')
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
