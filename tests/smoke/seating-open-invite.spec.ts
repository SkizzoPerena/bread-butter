import { GATHERING_ID, PASS_TOKEN, expect, stubApi, test } from './helpers'
import { openWorkspace } from './seating-fixtures'

const OPEN_TOKEN = PASS_TOKEN
const GUEST_TOKEN = 'f'.repeat(48)

const invitation = {
  success: true,
  status: 200,
  gatheringName: 'Damson supper',
  venue: 'The Hall',
  eventDate: '2030-01-01T00:00:00.000Z',
  invitationMessage: 'Come hungry.',
  questions: [] as unknown[],
}

async function openLinkPage(page: Parameters<typeof stubApi>[0], { register = {} as object, status = 201, unlock = invitation } = {}) {
  return stubApi(page, {
    routes: {
      [`GET /guest/seating/open/${OPEN_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false },
      }),
      [`POST /guest/seating/open/${OPEN_TOKEN}/unlock`]: route => route.fulfill({ json: unlock }),
      [`POST /guest/seating/open/${OPEN_TOKEN}/register`]: route => route.fulfill({
        status,
        json: {
          success: status < 400,
          status,
          message: 'You are on the guest list.',
          attendanceToken: GUEST_TOKEN,
          attendPath: `/attend/${GUEST_TOKEN}`,
          ...register,
        },
      }),
      [`GET /guest/seating/rsvp/${GUEST_TOKEN}/seats`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gatheringName: 'Damson supper',
          locked: false,
          seat: null,
          tables: [{ _id: 't1', label: 'Family', seats: [{ number: 1, status: 'OPEN' }] }],
        },
      }),
    },
  })
}

async function fillDetails(page: Parameters<typeof stubApi>[0]) {
  await page.getByLabel('First name').fill('Mina')
  await page.getByLabel('Last name').fill('Reyes')
  await page.getByLabel('Email address').fill('mina@example.com')
}

test('someone with the link registers as coming, and can then choose a seat', async ({ page }) => {
  const calls = await openLinkPage(page)
  await page.goto(`/jam/open/${OPEN_TOKEN}`)
  await expect(page.getByText('Come hungry.')).toBeVisible()

  await fillDetails(page)
  await page.getByRole('button', { name: "I'm coming" }).click()

  await expect(page.getByRole('status').first()).toHaveText('You are on the guest list.')
  await expect(page.getByRole('button', { name: 'Sit here: Family, seat 1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'See my seat pass' })).toHaveAttribute('href', `/attend/${GUEST_TOKEN}`)
  expect(calls.find(call => call.url.endsWith('/register'))?.body).toEqual({
    passcode: '',
    firstName: 'Mina',
    lastName: 'Reyes',
    email: 'mina@example.com',
    answers: [],
  })
})

test('the host questions are asked, without asking again whether they are coming', async ({ page }) => {
  await openLinkPage(page, { unlock: { ...invitation, questions: [{ question: 'Any dietary needs?', type: 'TEXT' }] } })
  await page.goto(`/jam/open/${OPEN_TOKEN}`)
  await expect(page.getByText('1. Any dietary needs?')).toBeVisible()
  await expect(page.getByText('Will you attend?')).toHaveCount(0)

  await fillDetails(page)
  await page.getByRole('button', { name: "I'm coming" }).click()
  await expect(page.getByRole('alert')).toHaveText('An answer is required for "Any dietary needs?".')
})

test('an email already on the list is pointed to its inbox, with no seat picker', async ({ page }) => {
  await openLinkPage(page, {
    status: 200,
    register: {
      alreadyRegistered: true,
      message: 'That email is already on the guest list. We sent its invitation link there.',
      attendanceToken: undefined,
      attendPath: undefined,
    },
  })
  await page.goto(`/jam/open/${OPEN_TOKEN}`)
  await fillDetails(page)
  await page.getByRole('button', { name: "I'm coming" }).click()

  await expect(page.getByRole('status').first()).toHaveText('That email is already on the guest list. We sent its invitation link there.')
  await expect(page.getByRole('heading', { name: 'Choose your seat' })).toHaveCount(0)
})

test('a full plan explains itself, and a link that is off says so', async ({ page }) => {
  await openLinkPage(page, { status: 409, register: { message: 'This gathering is full. Please contact the host.' } })
  await page.goto(`/jam/open/${OPEN_TOKEN}`)
  await fillDetails(page)
  await page.getByRole('button', { name: "I'm coming" }).click()
  await expect(page.getByRole('alert')).toHaveText('This gathering is full. Please contact the host.')

  await page.route(`**/guest/seating/open/${OPEN_TOKEN}`, route => route.fulfill({
    status: 404,
    json: { success: false, message: 'This invite link is not available.' },
  }))
  await page.reload()
  await expect(page.getByRole('alert')).toHaveText('This invite link is not available.')
  await expect(page.getByLabel('First name')).toHaveCount(0)
})

test('a host turns the link on, copies it, and can replace it', async ({ page }) => {
  let state = { enabled: false, token: null as string | null }
  const calls = await openWorkspace(page, {
    routes: {
      [`GET /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [], maxGuests: 10, openInvite: state } },
      }),
      [`PATCH /gatherings/${GATHERING_ID}/open-invite`]: (route) => {
        const body = route.request().postDataJSON()
        state = {
          enabled: body.enabled ?? state.enabled,
          token: body.regenerate ? 'b'.repeat(48) : (state.token ?? OPEN_TOKEN),
        }
        return route.fulfill({
          json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [], maxGuests: 10, openInvite: state } },
        })
      },
    },
  })
  await page.getByRole('button', { name: 'Invitation & Passcode' }).click()

  await page.getByRole('button', { name: 'Turn On Open Invite' }).click()
  await expect(page.getByTestId('open-invite-link')).toContainText(`/jam/open/${OPEN_TOKEN}`)

  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Replace Link' }).click()
  await expect(page.getByTestId('open-invite-link')).toContainText(`/jam/open/${'b'.repeat(48)}`)

  await page.getByRole('button', { name: 'Turn Off Open Invite' }).click()
  await expect(page.getByTestId('open-invite-link')).toHaveCount(0)
  expect(calls.filter(call => call.url.endsWith('/open-invite')).map(call => call.body)).toEqual([
    { enabled: true },
    { regenerate: true },
    { enabled: false },
  ])
})
