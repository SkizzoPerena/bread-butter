import { GATHERING_ID, expect, test } from './helpers'
import { openWorkspace } from './seating-fixtures'

const SOURCE_ID = '507f1f77bcf86cd799439099'

const importable = (overrides = {}) => ({
  guests: [
    { _id: 'g1', firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.com', partyName: '', alreadyOnList: false },
    { _id: 'g2', firstName: 'Ben', lastName: 'Lim', email: 'ben@example.com', partyName: '', alreadyOnList: true },
    { _id: 'g3', firstName: '', lastName: '', email: 'cal@example.com', partyName: '', alreadyOnList: false },
  ],
  creditsRemaining: 5,
  success: true,
  status: 200,
  ...overrides,
})

function routes(listing = importable()) {
  return {
    'GET /user/seating/gatherings': (route: { fulfill: (options: object) => unknown }) => route.fulfill({
      json: {
        success: true,
        status: 200,
        gatherings: [{ _id: GATHERING_ID, name: 'This Jam' }, { _id: SOURCE_ID, name: 'Last year' }],
      },
    }),
    [`GET /gatherings/${GATHERING_ID}/guest-import/${SOURCE_ID}`]: (route: { fulfill: (options: object) => unknown }) => route.fulfill({ json: listing }),
    [`POST /gatherings/${GATHERING_ID}/guest-import/${SOURCE_ID}`]: (route: { fulfill: (options: object) => unknown }) => route.fulfill({
      json: { success: true, status: 200, message: 'Added 2 guests.', created: 2, creditsRemaining: 3 },
    }),
  }
}

test('a host with no guests is offered another Jam, and adds the people they choose', async ({ page }) => {
  const calls = await openWorkspace(page, { guests: [], routes: routes() as never })

  const panel = page.getByTestId('guest-import')
  await expect(panel.getByLabel('Copy guests from')).toBeVisible()
  await expect(panel.getByRole('option', { name: 'This Jam' })).toHaveCount(0)

  await panel.getByLabel('Copy guests from').selectOption(SOURCE_ID)
  await expect(panel.getByRole('checkbox', { name: /Ana Cruz/ })).toBeChecked()
  await expect(panel.getByRole('checkbox', { name: /Ben Lim/ })).toBeDisabled()
  await expect(panel.getByRole('checkbox', { name: /Ben Lim/ })).not.toBeChecked()
  await expect(panel.getByRole('checkbox', { name: /cal@example.com/ })).toBeChecked()
  await expect(panel).toContainText('2 selected · 5 guest slots left')

  await panel.getByRole('button', { name: 'Add Selected Guests' }).click()
  await expect(page.getByText('Added 2 guests.', { exact: true })).toBeVisible()
  expect(calls.find(call => call.method === 'POST' && call.url.includes('/guest-import/'))?.body).toEqual({
    guestIds: ['g1', 'g3'],
  })
})

test('choosing more than the plan has room for offers an upgrade instead', async ({ page }) => {
  await openWorkspace(page, { guests: [], routes: routes(importable({ creditsRemaining: 1 })) as never })
  const panel = page.getByTestId('guest-import')
  await panel.getByLabel('Copy guests from').selectOption(SOURCE_ID)

  await expect(panel.getByRole('button', { name: 'Add Selected Guests' })).toBeDisabled()
  await expect(panel.getByRole('link', { name: 'Upgrade your plan' })).toHaveAttribute('href', `/user/seating-upgrade/${GATHERING_ID}`)

  await panel.getByRole('checkbox', { name: /Ana Cruz/ }).uncheck()
  await expect(panel.getByRole('button', { name: 'Add Selected Guests' })).toBeEnabled()
})

test('a host with guests already sees the offer closed, and a first Jam sees none', async ({ page }) => {
  await openWorkspace(page, { routes: routes() as never })
  await expect(page.getByTestId('guest-import')).toBeVisible()
  await expect(page.getByTestId('guest-import').getByLabel('Copy guests from')).toBeHidden()

  await openWorkspace(page, {
    guests: [],
    routes: {
      'GET /user/seating/gatherings': route => route.fulfill({
        json: { success: true, status: 200, gatherings: [{ _id: GATHERING_ID, name: 'This Jam' }] },
      }),
    },
  })
  await expect(page.getByTestId('guest-import')).toHaveCount(0)
})
