import { GATHERING_ID, expect, test } from './helpers'
import { openWorkspace } from './seating-fixtures'

const API = `/gatherings/${GATHERING_ID}`

const preview = (overrides = {}) => ({
  success: true,
  status: 200,
  requested: 3,
  toInvite: 2,
  invalidEmails: [],
  duplicateCount: 0,
  alreadyOnList: 0,
  creditsRemaining: 5,
  shortBy: 0,
  canSend: true,
  ...overrides,
})

const sendResult = (overrides = {}) => ({
  success: true,
  status: 200,
  message: 'Sent 2 invitations.',
  created: 2,
  alreadyOnList: 0,
  sent: 2,
  skipped: 0,
  creditsRemaining: 3,
  ...overrides,
})

test('a host pastes emails, sees the counts, then sends', async ({ page }) => {
  const calls = await openWorkspace(page, {
    routes: {
      [`POST ${API}/invites/bulk/preview`]: route => route.fulfill({
        json: preview({ duplicateCount: 1, alreadyOnList: 1 }),
      }),
      [`POST ${API}/invites/bulk`]: route => route.fulfill({ json: sendResult() }),
    },
  })
  const panel = page.getByTestId('bulk-invite')
  await expect(panel.getByRole('button', { name: /Send .*Invitations/ })).toBeDisabled()

  await panel.getByLabel('Email addresses').fill('ana@example.com, ben@example.com;\ncal@example.com')
  await panel.getByRole('button', { name: 'Check List' }).click()

  const counts = page.getByTestId('bulk-preview')
  await expect(counts).toContainText('2 new · 5 email credits left')
  await expect(counts).toContainText('1 repeated')
  await expect(counts).toContainText('1 already on your list')
  expect(calls.find(call => call.url.endsWith('/bulk/preview'))?.body).toEqual({
    emails: ['ana@example.com', 'ben@example.com', 'cal@example.com'],
  })

  await panel.getByRole('button', { name: 'Send 2 Invitations' }).click()
  await expect(panel.getByRole('status')).toContainText('2 added · 2 emailed · 3 credits left')
  await expect(panel.getByLabel('Email addresses')).toHaveValue('')
})

test('over the limit blocks sending and offers an upgrade', async ({ page }) => {
  await openWorkspace(page, {
    routes: {
      [`POST ${API}/invites/bulk/preview`]: route => route.fulfill({
        json: preview({ toInvite: 7, creditsRemaining: 5, shortBy: 2, canSend: false }),
      }),
    },
  })
  const panel = page.getByTestId('bulk-invite')
  await panel.getByLabel('Email addresses').fill('a@example.com')
  await panel.getByRole('button', { name: 'Check List' }).click()

  await expect(page.getByTestId('bulk-preview')).toContainText("That's 2 more than you have credits for.")
  await expect(panel.getByRole('link', { name: 'Upgrade your plan' })).toHaveAttribute('href', `/user/seating-upgrade/${GATHERING_ID}`)
  await expect(panel.getByRole('button', { name: /Send .*Invitations/ })).toBeDisabled()
})

test('an invalid address must be fixed, and editing the list needs a fresh check', async ({ page }) => {
  await openWorkspace(page, {
    routes: {
      [`POST ${API}/invites/bulk/preview`]: route => route.fulfill({
        json: route.request().postDataJSON().emails.includes('nope')
          ? preview({ invalidEmails: ['nope'], canSend: false })
          : preview(),
      }),
    },
  })
  const panel = page.getByTestId('bulk-invite')
  await panel.getByLabel('Email addresses').fill('nope, ana@example.com')
  await panel.getByRole('button', { name: 'Check List' }).click()
  await expect(page.getByTestId('bulk-preview')).toContainText('Fix these first: nope')
  await expect(panel.getByRole('button', { name: /Send .*Invitations/ })).toBeDisabled()

  await panel.getByLabel('Email addresses').fill('ben@example.com, ana@example.com')
  await expect(page.getByTestId('bulk-preview')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Check List' }).click()
  await expect(panel.getByRole('button', { name: 'Send 2 Invitations' })).toBeEnabled()
})

test('a guest who could not be emailed can be tried again', async ({ page }) => {
  const calls = await openWorkspace(page, {
    routes: {
      [`POST ${API}/invites/bulk/preview`]: route => route.fulfill({ json: preview() }),
      [`POST ${API}/invites/bulk`]: route => route.fulfill({ json: sendResult({ sent: 1, skipped: 1 }) }),
      [`POST ${API}/invites`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'Sent 1 invitation.', sent: 1, skipped: 0 },
      }),
    },
  })
  const panel = page.getByTestId('bulk-invite')
  await panel.getByLabel('Email addresses').fill('a@example.com b@example.com')
  await panel.getByRole('button', { name: 'Check List' }).click()
  await panel.getByRole('button', { name: 'Send 2 Invitations' }).click()

  await expect(panel.getByRole('status')).toContainText("1 couldn't be emailed")
  await panel.getByRole('button', { name: 'Try Again' }).click()
  await expect(panel.getByRole('status')).toContainText('2 added · 2 emailed')
  await expect(panel.getByRole('status')).not.toContainText("couldn't be emailed")
  expect(calls.filter(call => call.method === 'POST' && call.url.endsWith('/invites'))).toHaveLength(1)
})

test('an unnamed guest shows their email, and needs a name to be marked as coming', async ({ page }) => {
  const unnamed = {
    _id: 'g9',
    firstName: undefined,
    lastName: undefined,
    email: 'unnamed@example.com',
    rsvpStatus: 'PENDING',
    isAttending: false,
    isBulkInvite: true,
  }
  const calls = await openWorkspace(page, {
    guests: [unnamed],
    routes: {
      [`PATCH ${API}/guests/g9`]: route => route.fulfill({
        json: { success: true, status: 200, guest: { ...unnamed, firstName: 'Lea', lastName: 'Santos', rsvpStatus: 'GOING' } },
      }),
    },
  })
  await expect(page.getByText('Waiting for name')).toBeVisible()
  await expect(page.getByText('undefined')).toHaveCount(0)

  const status = page.locator('select').filter({ has: page.getByRole('option', { name: 'Attending' }) }).first()
  await status.selectOption('GOING')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('unnamed@example.com')
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(0)

  await dialog.getByLabel('First name').fill('Lea')
  await dialog.getByLabel('Last name').fill('Santos')
  await dialog.getByRole('button', { name: 'Mark as Attending' }).click()

  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toEqual({
    rsvpStatus: 'GOING',
    firstName: 'Lea',
    lastName: 'Santos',
  })
})
