import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

const TASK_ID = '507f1f77bcf86cd799439071'
const OVERRIDE_KEY = `bpb_task_deadlines_${EVENT_ID}`

const EVENT = {
  _id: EVENT_ID,
  eventName: 'Date change wedding',
  eventType: 'WEDDING',
  description: 'Planner event',
  venue: 'Manila',
  eventDate: '2030-06-01T00:00:00.000Z',
  status: 'ONGOING',
  priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter' },
  paymentSummary: { isFullyPaid: true },
  latestPayment: { status: 'APPROVED' },
}

const TASK = {
  _id: TASK_ID,
  event: EVENT_ID,
  title: 'Book the venue',
  details: '',
  status: 'TODO',
  priority: 2,
  deadline: '2030-03-10T00:00:00.000Z',
  subtasks: [],
}

const eventRoutes = {
  [`GET /tasks/event/${EVENT_ID}`]: route => route.fulfill({ json: { success: true, status: 200, tasks: [TASK] } }),
  [`GET /events/${EVENT_ID}`]: route => route.fulfill({
    json: { success: true, status: 200, event: EVENT, guestList: [], rsvpSummary: null, tasks: null },
  }),
  'GET /user/events': route => route.fulfill({ json: { success: true, status: 200, events: [EVENT] } }),
} as Parameters<typeof stubApi>[1] extends infer O ? O extends { routes?: infer R } ? R : never : never

test('a due date stored in the browser never replaces the one from the API', async ({ page }) => {
  await signIn(page)
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key as string, value as string)
  }, [OVERRIDE_KEY, JSON.stringify({ [TASK_ID]: '2031-11-20T00:00:00.000Z' })])
  await stubApi(page, { routes: eventRoutes })

  await page.goto(`/event/tasks?eventId=${EVENT_ID}`)

  await expect(page.getByText('Book the venue').first()).toBeVisible()
  await expect(page.getByText('Mar 10, 2030').first()).toBeVisible()
  await expect(page.getByText('Nov 20, 2031')).toHaveCount(0)
})

test('a rejected date change leaves stored due dates alone', async ({ page }) => {
  await signIn(page)
  await stubApi(page, {
    routes: {
      ...eventRoutes,
      [`PATCH /events/${EVENT_ID}`]: route => route.fulfill({
        status: 400,
        json: { success: false, message: 'Move sub-events that fall on or after the new event date before changing it.' },
      }),
    },
  })

  await page.goto(`/event/settings?eventId=${EVENT_ID}`)
  await page.getByRole('button', { name: 'Change Date' }).click()
  await page.getByRole('dialog').getByRole('button').last().click()
  await page.locator('input[type="date"]').fill('2030-08-01')
  await page.getByRole('button', { name: 'Save Settings' }).click()

  await expect(page.getByText('Could not update event').first()).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), OVERRIDE_KEY)).toBeNull()
})
