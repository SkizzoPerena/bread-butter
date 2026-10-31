import { GATHERING_ID, PASS_TOKEN, expect, stubApi, test } from './helpers'
import { BLANK_PNG, openWorkspace, png } from './seating-fixtures'

const design = {
  requestLine: 'Please join us for',
  headline: 'Ana turns 30',
  eventTime: '6:00 PM',
  deadlineText: 'Kindly reply by March 1',
  paletteName: 'Cabernet',
  typographyName: 'Elegant Serif',
  bannerImageUrl: 'https://files.example.com/banner.png',
}

test('a guest sees the invitation the host designed', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/site/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false },
      }),
      [`POST /guest/seating/site/${PASS_TOKEN}/unlock`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gatheringName: 'Damson supper',
          venue: 'The Hall',
          eventDate: '2030-01-15T00:00:00.000Z',
          invitationMessage: 'Come <b>hungry</b>.',
          design,
        },
      }),
    },
  })
  await page.goto(`/jam/${PASS_TOKEN}`)

  const card = page.getByTestId('jam-invitation-card')
  await expect(card.getByRole('heading', { name: 'Ana turns 30' })).toBeVisible()
  await expect(card).toContainText('Please join us for')
  await expect(card).toContainText('6:00 PM')
  await expect(card).toContainText('The Hall')
  await expect(card).toContainText('Kindly reply by March 1')
  await expect(card.locator('img')).toHaveAttribute('src', design.bannerImageUrl)
  // The host's text is shown as written, never as HTML.
  await expect(card).toContainText('Come <b>hungry</b>.')
  await expect(card).toHaveCSS('background-color', 'rgb(242, 208, 217)')
})

test('a guest sees the host\'s own image, whole, with the details as text', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/seating/site/${PASS_TOKEN}`]: route => route.fulfill({
        json: { success: true, status: 200, gatheringName: 'Damson supper', passcodeRequired: false },
      }),
      [`POST /guest/seating/site/${PASS_TOKEN}/unlock`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gatheringName: 'Damson supper',
          venue: 'The Hall',
          eventDate: '2030-01-15T00:00:00.000Z',
          invitationMessage: 'Come hungry.',
          design: { ...design, mode: 'IMAGE', imageUrl: 'https://files.example.com/card.png' },
        },
      }),
    },
  })
  await page.goto(`/jam/${PASS_TOKEN}`)

  const card = page.getByTestId('jam-invitation-card')
  const image = card.getByRole('img', { name: 'Invitation to Damson supper' })
  await expect(image).toHaveAttribute('src', 'https://files.example.com/card.png')
  await expect(image).not.toHaveClass(/object-cover/)
  await expect(card).toContainText('The Hall')
  await expect(card.getByRole('heading')).toHaveCount(0)
})

test('a host uploads their own image, and can go back to the maker', async ({ page }) => {
  const gathering = {
    _id: GATHERING_ID,
    name: 'Damson supper',
    venue: 'The Hall',
    eventDate: '2030-01-15T00:00:00.000Z',
    status: 'ACTIVE',
    tables: [],
  }
  const calls = await openWorkspace(page, {
    routes: {
      [`PATCH /gatherings/${GATHERING_ID}/invitation/images/invitation`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gathering: { ...gathering, invitationDesign: { mode: 'IMAGE', imageUrl: 'https://files.example.com/card.png' } },
        },
      }),
      [`PATCH /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gathering: { ...gathering, invitationDesign: { mode: 'MAKER', imageUrl: 'https://files.example.com/card.png' } },
        },
      }),
    },
  })
  await page.getByRole('button', { name: 'Invitation & Passcode' }).click()
  await expect(page.getByRole('button', { name: 'Use my own image' })).toBeDisabled()

  await page.getByLabel('Upload your own invitation image').setInputFiles(png(BLANK_PNG, 'card.png'))
  const card = page.getByTestId('jam-invitation-card')
  await expect(card.getByRole('img', { name: 'Invitation to Damson supper' })).toHaveAttribute('src', 'https://files.example.com/card.png')
  await expect(page.getByLabel('Headline')).toHaveCount(0)

  await page.getByRole('button', { name: 'Use the invitation maker' }).click()
  await expect(page.getByLabel('Headline')).toBeVisible()
  expect(calls.find(call => call.method === 'PATCH' && call.url.endsWith(GATHERING_ID))?.body).toEqual({
    invitationDesign: { mode: 'MAKER' },
  })
})

test('a host designs the invitation with a live preview, and saves it', async ({ page }) => {
  const calls = await openWorkspace(page, {
    routes: {
      [`PATCH /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gathering: { _id: GATHERING_ID, name: 'Damson supper', venue: 'The Hall', eventDate: '2030-01-15T00:00:00.000Z', status: 'ACTIVE', tables: [] },
        },
      }),
      [`PATCH /gatherings/${GATHERING_ID}/invitation/images/banner`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          gathering: {
            _id: GATHERING_ID,
            name: 'Damson supper',
            venue: 'The Hall',
            eventDate: '2030-01-15T00:00:00.000Z',
            status: 'ACTIVE',
            tables: [],
            invitationDesign: { bannerImageUrl: design.bannerImageUrl },
          },
        },
      }),
    },
  })
  await page.getByRole('button', { name: 'Invitation & Passcode' }).click()

  const card = page.getByTestId('jam-invitation-card')
  await expect(card.getByRole('heading', { name: 'Damson supper' })).toBeVisible()

  await page.getByLabel('Headline').fill('Ana turns 30')
  await page.getByLabel('Time').fill('6:00 PM')
  await expect(card.getByRole('heading', { name: 'Ana turns 30' })).toBeVisible()
  await expect(card).toContainText('6:00 PM')

  await page.getByRole('combobox', { name: 'Colors' }).click()
  await page.getByRole('option', { name: 'Cabernet' }).click()
  await expect(card).toHaveCSS('background-color', 'rgb(242, 208, 217)')

  await page.getByRole('button', { name: 'Save Design' }).click()
  await expect.poll(() => calls.find(call => call.method === 'PATCH')?.body).toMatchObject({
    invitationDesign: { headline: 'Ana turns 30', eventTime: '6:00 PM', paletteName: 'Cabernet' },
  })

  await page.getByLabel('Upload a banner image').setInputFiles(png(BLANK_PNG, 'banner.png'))
  await expect(card.locator('img')).toHaveAttribute('src', design.bannerImageUrl)
  await expect(page.getByRole('button', { name: 'Remove banner' })).toBeVisible()
})
