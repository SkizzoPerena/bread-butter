import { PASS_TOKEN, expect, test } from './helpers'
import type { Page } from '@playwright/test'
import { stubApi } from './helpers'

const seatMap = (seats: { number: number, status: string }[], overrides = {}) => ({
  success: true,
  status: 200,
  gatheringName: 'Damson supper',
  locked: false,
  seat: null,
  tables: [{ _id: 't1', label: 'Family', seats }],
  ...overrides,
})

const OPEN = [{ number: 1, status: 'OPEN' }, { number: 2, status: 'OPEN' }, { number: 3, status: 'UNAVAILABLE' }, { number: 4, status: 'TAKEN' }]

async function openPass(page: Page, { map = seatMap(OPEN), claim = (_route: Parameters<Parameters<typeof page.route>[1]>[0]): unknown => null } = {}) {
  let current = map
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', name: 'Maria Santos', seated: false, tableLabel: null, seatNumber: null, checkedInAt: null },
      }),
      [`GET /guest/seating/rsvp/${PASS_TOKEN}/seats`]: route => route.fulfill({ json: current }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}/seats`]: async (route) => {
        const handled = await claim(route)
        if (handled) {
          current = handled as typeof current
          return route.fulfill({ json: handled })
        }
      },
      [`DELETE /guest/seating/rsvp/${PASS_TOKEN}/seats`]: (route) => {
        current = seatMap(OPEN, { message: 'You gave up your seat.' })
        return route.fulfill({ json: current })
      },
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Choose your seat' })).toBeVisible()
  return calls
}

test('a guest sees every seat and takes an open one with "Sit here", then can give it up', async ({ page }) => {
  const calls = await openPass(page, {
    claim: () => seatMap(
      [{ number: 1, status: 'YOURS' }, { number: 2, status: 'OPEN' }, { number: 3, status: 'UNAVAILABLE' }, { number: 4, status: 'TAKEN' }],
      { seat: { tableId: 't1', tableLabel: 'Family', seatNumber: 1 }, message: 'Your seat is saved.' },
    ),
  })

  await expect(page.getByRole('button', { name: 'Sit here' })).toHaveCount(2)
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible()
  await expect(page.getByText('Taken', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Sit here: Family, seat 1' }).click()
  await expect(page.getByRole('status')).toHaveText('Your seat is saved.')
  await expect(page.getByText('You are at Family, seat 1.')).toBeVisible()
  expect(calls.find(call => call.method === 'POST' && call.url.endsWith('/seats'))?.body).toEqual({ tableId: 't1', seatNumber: 1 })

  await page.getByRole('button', { name: 'Give up my seat' }).click()
  await expect(page.getByText("You don't have a seat yet.")).toBeVisible()
})

test('losing a seat to someone else explains it and shows the seats as they are now', async ({ page }) => {
  let reload = false
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', name: 'Maria Santos', seated: false, checkedInAt: null },
      }),
      [`GET /guest/seating/rsvp/${PASS_TOKEN}/seats`]: route => route.fulfill({
        json: seatMap(reload ? [{ number: 1, status: 'TAKEN' }] : [{ number: 1, status: 'OPEN' }]),
      }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}/seats`]: (route) => {
        reload = true
        return route.fulfill({ status: 409, json: { success: false, message: 'That seat was just taken. Please choose another.' } })
      },
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}`)

  await page.getByRole('button', { name: 'Sit here: Family, seat 1' }).click()
  await expect(page.getByRole('alert')).toHaveText('That seat was just taken. Please choose another.')
  await expect(page.getByRole('button', { name: 'Sit here' })).toHaveCount(0)
  await expect(page.getByText('Taken', { exact: true })).toBeVisible()
})

test('a locked plan shows the seats with nothing to press', async ({ page }) => {
  await openPass(page, { map: seatMap(OPEN, { locked: true }) })
  await expect(page.getByText('The host has locked seat selection.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sit here' })).toHaveCount(0)
})

test('the door scan shows the pass without the seat picker', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/attend/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', name: 'Maria Santos', seated: true, tableLabel: 'Family', seatNumber: 1, checkedInAt: '2030-01-01T00:00:00.000Z' },
      }),
    },
  })
  await page.goto(`/attend/${PASS_TOKEN}?checkin=1`)
  await expect(page.getByText('Family, seat 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose your seat' })).toHaveCount(0)
})

test('saying yes to the invitation leads straight to choosing a seat', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`POST /guest/seating/rsvp/${PASS_TOKEN}/unlock`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', questions: [], answers: [], rsvpStatus: 'PENDING', needsName: false },
      }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'You are marked as coming.', rsvpStatus: 'GOING', attendPath: `/attend/${PASS_TOKEN}` },
      }),
      [`GET /guest/seating/rsvp/${PASS_TOKEN}/seats`]: route => route.fulfill({ json: seatMap(OPEN) }),
    },
  })
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)
  await page.getByLabel('Yes, I will attend').check()
  await page.getByRole('button', { name: 'Send reply' }).click()

  await expect(page.getByText('You are marked as coming.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose your seat' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'See my seat pass' })).toHaveAttribute('href', `/attend/${PASS_TOKEN}`)
})
