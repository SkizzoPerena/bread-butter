import type { Page } from '@playwright/test'
import { GATHERING_ID, expect, signIn, stubApi, test } from './helpers'
import { BLANK_PNG, openWorkspace } from './seating-fixtures'

const UPGRADE_PATH = `/user/seating-upgrade/${GATHERING_ID}`
const API = `/gatherings/${GATHERING_ID}`

const OPTIONS = {
  success: true,
  status: 200,
  current: { packageId: 'p1', packageName: 'Apricot', pricePhp: 1500, maxGuests: 20 },
  options: [{ _id: 'p2', name: 'Strawberry', pricePhp: 3500, maxGuests: 80, priceDifferencePhp: 2000, additionalGuests: 60 }],
  pendingUpgrade: null as object | null,
}

const upgradePayment = (overrides = {}) => ({
  _id: 'up1',
  type: 'SEATING_UPGRADE',
  status: 'PENDING',
  provider: 'MANUAL',
  amount: 2000,
  upgrade: { packageName: 'Strawberry', maxGuests: 80, fromPackageName: 'Apricot', fromMaxGuests: 20 },
  ...overrides,
})

async function openUpgrade(
  page: Page,
  {
    options = OPTIONS,
    payments = [] as object[],
    routes = {} as NonNullable<NonNullable<Parameters<typeof stubApi>[1]>['routes']>,
    path = UPGRADE_PATH,
  } = {},
) {
  await signIn(page)
  const calls = await stubApi(page, {
    routes: {
      [`GET ${API}/upgrade-options`]: route => route.fulfill({ json: options }),
      [`GET ${API}/payments`]: route => route.fulfill({ json: { success: true, status: 200, payments } }),
      ...routes,
    },
  })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Upgrade your plan' })).toBeVisible()
  return calls
}

test('a host pays the difference with a manual proof, and sees it waiting for review', async ({ page }) => {
  const options = { ...OPTIONS }
  const calls = await openUpgrade(page, {
    options,
    routes: {
      [`POST ${API}/upgrade/payment-proof`]: (route) => {
        options.pendingUpgrade = upgradePayment()
        return route.fulfill({ status: 201, json: { success: true, status: 201, payment: upgradePayment() } })
      },
    },
  })
  await expect(page.getByTestId('upgrade-option')).toContainText('Pay ₱2,000')
  await expect(page.getByTestId('upgrade-option')).toContainText('60 more')

  await page.getByRole('button', { name: 'Choose Strawberry' }).click()
  await page.getByPlaceholder(/reference|transaction/i).first().fill('REF-1')
  await page.locator('input[type="file"]').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: BLANK_PNG })
  await page.getByRole('button', { name: /submit/i }).click()

  await expect(page.getByTestId('pending-upgrade')).toContainText('reviewing your payment of ₱2,000')
  await expect(page.getByTestId('upgrade-option')).toHaveCount(0)
  expect(calls.find(call => call.url.endsWith('/upgrade/payment-proof'))).toBeTruthy()
})

test('a pending manual proof blocks starting another upgrade', async ({ page }) => {
  await openUpgrade(page, { options: { ...OPTIONS, pendingUpgrade: upgradePayment() } })
  await expect(page.getByTestId('pending-upgrade')).toContainText('Upgrade to Strawberry in progress')
  await expect(page.getByRole('button', { name: 'Choose Strawberry' })).toHaveCount(0)
})

test('an open checkout can be resumed, or replaced by choosing again', async ({ page }) => {
  await openUpgrade(page, {
    options: {
      ...OPTIONS,
      pendingUpgrade: upgradePayment({ provider: 'PAYMONGO', paymongoCheckoutUrl: 'https://checkout.example.com/cs_1' }),
    },
  })
  await expect(page.getByRole('link', { name: 'Resume checkout' })).toHaveAttribute('href', 'https://checkout.example.com/cs_1')
  await expect(page.getByRole('button', { name: 'Choose Strawberry' })).toBeVisible()
})

test('a real denial is explained, but a replaced checkout is not called a denial', async ({ page }) => {
  await openUpgrade(page, { payments: [upgradePayment({ status: 'DENIED', denialReason: 'Blurry proof' })] })
  await expect(page.getByRole('alert')).toContainText('denied: Blurry proof')

  await openUpgrade(page, { payments: [upgradePayment({ status: 'DENIED', denialReason: 'Replaced by a newer upgrade request.' })] })
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('the largest plan says so, and a cancelled checkout reassures the host', async ({ page }) => {
  await openUpgrade(page, { options: { ...OPTIONS, options: [] }, path: `${UPGRADE_PATH}?cancelled=1` })
  await expect(page.getByText("You're on our largest plan.")).toBeVisible()
  await expect(page.getByText("You weren't charged")).toBeVisible()
})

test('the workspace links to the upgrade page, more prominently once the list is full', async ({ page }) => {
  await openWorkspace(page, { guests: Array.from({ length: 10 }, (_, index) => ({ _id: `g${index}`, email: `g${index}@example.com` })) })
  await expect(page.getByRole('link', { name: 'Upgrade Plan' })).toHaveAttribute('href', UPGRADE_PATH)
  await expect(page.getByText('Your guest list is full.')).toBeVisible()
})

test('returning from PayMongo with payment_id confirms the payment', async ({ page }) => {
  await signIn(page)
  await stubApi(page, {
    routes: {
      'GET /user/seating/checkout/pay1': route => route.fulfill({
        json: {
          success: true,
          status: 200,
          payment: { _id: 'pay1', status: 'APPROVED', type: 'SEATING_UPGRADE' },
          gatheringId: GATHERING_ID,
          gatheringName: 'Damson supper',
        },
      }),
    },
  })
  await page.goto(`/user/seating-payment/success?payment_id=pay1&gatheringId=${GATHERING_ID}&upgrade=1`)

  await expect(page.getByRole('heading', { name: 'Your plan is upgraded' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open seating plan' })).toHaveAttribute('href', `/seating/${GATHERING_ID}`)
})
