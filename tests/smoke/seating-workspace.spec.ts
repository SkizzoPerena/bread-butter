import { PASS_TOKEN, expect, test } from './helpers'
import { BLANK_PNG, checkInCalls, gatheringQr, openCheckIn, openWorkspace, passQr, png } from './seating-fixtures'

test('with the camera unavailable, upload checks the guest in and rejects anything else', async ({ page }) => {
  const calls = await openWorkspace(page)
  await openCheckIn(page)
  await expect(page.getByText('Camera scanning is unavailable')).toBeVisible()

  const upload = page.locator('input[type="file"]')

  await upload.setInputFiles(png(await gatheringQr()))
  await expect(page.getByText('This QR code is not a guest pass.')).toBeVisible()

  await upload.setInputFiles(png(BLANK_PNG))
  await expect(page.getByText('No QR code was found in that image.')).toBeVisible()
  expect(checkInCalls(calls)).toEqual([])

  await upload.setInputFiles(png(await passQr()))
  // Exact, because a toast briefly has a hidden screen-reader copy of its text.
  await expect(page.getByText('Maria Santos checked in!', { exact: true })).toBeVisible()
  expect(checkInCalls(calls).map(call => call.body)).toEqual([{ token: PASS_TOKEN }])
  await expect(page.getByText('No QR code was found in that image.')).toHaveCount(0)
})

test('a new guest starts as pending, with no status choice on the form', async ({ page }) => {
  const calls = await openWorkspace(page)
  const form = page.locator('form').filter({ has: page.getByPlaceholder('First name') })
  await expect(form.locator('select')).toHaveCount(0)

  await page.getByPlaceholder('First name').fill('Otto')
  await page.getByPlaceholder('Last name').fill('Reyes')
  await page.getByPlaceholder('guest@example.com').fill('otto@example.com')
  await page.getByRole('button', { name: 'Add guest' }).click()

  const row = page.locator('div', { hasText: 'otto@example.com' }).locator('select').last()
  await expect(row).toHaveValue('PENDING')

  const created = calls.find(call => call.method === 'POST' && call.url.endsWith('/guests'))
  expect(created?.body).not.toHaveProperty('rsvpStatus')
  expect(created?.body).not.toHaveProperty('isAttending')
})
