import { PASS_TOKEN, expect, test } from './helpers'
import { checkInCalls, openCheckIn, openWorkspace, passQr, png } from './seating-fixtures'

test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

test('upload checks the guest in and leaves the camera running', async ({ page }) => {
  const calls = await openWorkspace(page)
  await openCheckIn(page)
  const video = page.locator('#seating-checkin-scanner video')
  await expect(video).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles(png(await passQr()))
  // Exact, because a toast briefly has a hidden screen-reader copy of its text.
  await expect(page.getByText('Maria Santos checked in!', { exact: true })).toBeVisible()
  expect(checkInCalls(calls).map(call => call.body)).toEqual([{ token: PASS_TOKEN }])
  await expect(video).toBeVisible()
})
