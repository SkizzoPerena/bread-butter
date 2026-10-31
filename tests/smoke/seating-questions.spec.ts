import { GATHERING_ID, PASS_TOKEN, expect, stubApi, test } from './helpers'
import { openWorkspace } from './seating-fixtures'

const QUESTIONS = [
  { question: 'Any dietary needs?', type: 'TEXT' },
  { question: 'Need parking?', type: 'YES/NO' },
]

async function openReply(page: Parameters<typeof stubApi>[0], unlocked = {}) {
  return stubApi(page, {
    routes: {
      [`GET /guest/seating/rsvp/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false, needsName: false },
      }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}/unlock`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', questions: QUESTIONS, answers: [], rsvpStatus: 'PENDING', needsName: false, ...unlocked },
      }),
      [`POST /guest/seating/rsvp/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, message: 'You are marked as coming.', rsvpStatus: 'GOING', attendPath: `/attend/${PASS_TOKEN}` },
      }),
      [`GET /guest/seating/rsvp/${PASS_TOKEN}/seats`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', locked: false, seat: null, tables: [] },
      }),
    },
  })
}

const replyBody = (calls: Awaited<ReturnType<typeof stubApi>>) =>
  calls.find(call => call.method === 'POST' && call.url.endsWith(`/rsvp/${PASS_TOKEN}`))?.body

test('a guest answers the questions to say yes, and is told what is missing first', async ({ page }) => {
  const calls = await openReply(page)
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)

  await expect(page.getByText('Any dietary needs?')).toHaveCount(0)
  await page.getByLabel('Yes, I will attend').check()
  await expect(page.getByText('1. Any dietary needs?')).toBeVisible()

  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByRole('alert')).toHaveText('An answer is required for "Any dietary needs?".')
  expect(replyBody(calls)).toBeUndefined()

  await page.getByPlaceholder('Your answer').fill('No nuts')
  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Send reply' }).click()

  await expect(page.getByText('You are marked as coming.')).toBeVisible()
  expect(replyBody(calls)).toEqual({
    passcode: '',
    rsvpStatus: 'GOING',
    answers: [
      { question: 'Any dietary needs?', answer: 'No nuts', notes: '' },
      { question: 'Need parking?', answer: true, notes: '' },
    ],
  })
})

test('a guest who declines is not asked the questions', async ({ page }) => {
  const calls = await openReply(page)
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)

  await page.getByLabel('No, I cannot attend').check()
  await expect(page.getByText('1. Any dietary needs?')).toHaveCount(0)
  await page.getByRole('button', { name: 'Send reply' }).click()

  await expect.poll(() => replyBody(calls)).toEqual({ passcode: '', rsvpStatus: 'NOT_GOING', answers: [] })
})

test('a guest who has not given a name is asked for one to say yes', async ({ page }) => {
  const calls = await openReply(page, { questions: [], needsName: true })
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)

  await page.getByLabel('Yes, I will attend').check()
  await page.getByLabel('First name').fill('Mina')
  await page.getByLabel('Last name').fill('Reyes')
  await page.getByRole('button', { name: 'Send reply' }).click()

  await expect.poll(() => replyBody(calls)).toEqual({
    passcode: '',
    rsvpStatus: 'GOING',
    answers: [],
    firstName: 'Mina',
    lastName: 'Reyes',
  })
})

test('earlier answers come back when a guest replies again', async ({ page }) => {
  await openReply(page, {
    rsvpStatus: 'GOING',
    answers: [{ question: 'Any dietary needs?', answer: 'No nuts', notes: '' }, { question: 'Need parking?', answer: true, notes: '' }],
  })
  await page.goto(`/jam/rsvp/${PASS_TOKEN}`)
  await expect(page.getByPlaceholder('Your answer')).toHaveValue('No nuts')
})

test('a host writes questions, and reads the answers on the guest list', async ({ page }) => {
  const calls = await openWorkspace(page, {
    guests: [{ answers: [{ question: 'Main course', answer: 'Fish', notes: 'No bones' }, { question: 'Need parking?', answer: true, notes: '' }] }],
    routes: {
      [`PATCH /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: { _id: GATHERING_ID, status: 'ACTIVE', tables: [], questions: [{ question: 'Bring a plus one?', type: 'YES/NO' }] } },
      }),
    },
  })

  await page.getByText('Answers (2)').click()
  await expect(page.getByText('Main course: Fish (No bones)')).toBeVisible()
  await expect(page.getByText('Need parking?: Yes')).toBeVisible()

  await page.getByRole('button', { name: 'Invitation & Passcode' }).click()
  await page.getByRole('button', { name: 'RSVP Questions (0)' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Do you have any dietary restrictions?').fill('Bring a plus one?')
  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Yes / No' }).click()
  await dialog.getByRole('button', { name: 'Save Questions' }).click()

  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toEqual({
    questions: [{ question: 'Bring a plus one?', type: 'YES/NO' }],
  })
  await expect(page.getByRole('button', { name: 'RSVP Questions (1)' })).toBeVisible()
})
