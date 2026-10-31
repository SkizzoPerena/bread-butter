import { EVENT_ID, expect, signIn, stubApi, test } from './helpers'

function guest(id: number, firstName: string, status: string | null) {
  const email = `${firstName.toLowerCase()}@example.com`
  return {
    _id: `507f1f77bcf86cd7994390${60 + id}`,
    firstName,
    lastName: 'Santos',
    email,
    rsvp: status
      ? {
          _id: `507f1f77bcf86cd7994391${60 + id}`,
          status,
          invitedAt: '2030-01-01T00:00:00.000Z',
          inviteEmailSentAt: '2030-01-01T00:00:00.000Z',
          respondedAt: null,
        }
      : null,
  }
}

const GUESTS = [
  { row: guest(0, 'Ana', 'GOING'), label: 'Attending', color: 'success' },
  { row: guest(1, 'Ben', 'NOT_GOING'), label: 'Not Attending', color: 'error' },
  { row: guest(2, 'Cara', 'PENDING'), label: 'Pending', color: 'secondary' },
  { row: guest(3, 'Dan', 'NO_RESPONSE'), label: 'No Response', color: 'warning' },
  { row: guest(4, 'Eva', null), label: 'Pending', color: 'secondary' },
]

test('the guest list shows each guest\'s RSVP status', async ({ page }) => {
  await signIn(page)
  await stubApi(page, {
    routes: {
      [`GET /guests/event/${EVENT_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, guests: GUESTS.map(item => item.row) },
      }),
      [`GET /events/${EVENT_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          event: {
            _id: EVENT_ID,
            eventName: 'Guest list wedding',
            eventType: 'WEDDING',
            eventDate: '2030-06-01T00:00:00.000Z',
            priceTier: { code: 'BREAD_BUTTER', name: 'Bread + Butter' },
          },
          guestList: GUESTS.map(item => item.row),
          rsvpSummary: { totalSent: 4, going: 1, notGoing: 1, pending: 1, noResponse: 1 },
          tasks: null,
        },
      }),
    },
  })

  await page.goto(`/event/guests?eventId=${EVENT_ID}`)

  for (const { row, label, color } of GUESTS) {
    const tableRow = page.getByRole('row').filter({ hasText: row.email })
    await expect(tableRow).toBeVisible()
    const badge = tableRow.getByText(label, { exact: true })
    await expect(badge).toBeVisible()
    await expect(badge).toHaveClass(new RegExp(color))
  }
})
