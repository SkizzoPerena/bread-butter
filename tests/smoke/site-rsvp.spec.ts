import { expect, stubApi, test } from './helpers'

const SITE = 'lea-and-otto'
const RSVP_ID = '507f1f77bcf86cd799439081'
const ACCESS_TOKEN = 'site-access-token'

const CUSTOM_SITE = {
  _id: '507f1f77bcf86cd799439082',
  event: '507f1f77bcf86cd799439083',
  siteName: SITE,
  title: 'Lea and Otto',
  subtitle: 'Join us',
  templateType: 'CUSTOM',
  headerImageURL: '',
  singlePageSite: true,
  enabledComponents: ['rsvp'],
  isPublished: true,
}

const rsvpForm = route => route.fulfill({
  json: {
    success: true,
    status: 200,
    alreadyResponded: false,
    rsvp: { _id: RSVP_ID, name: 'lea santos', email: 'lea@example.com', status: 'PENDING', answers: [], subEventId: null },
    invitation: null,
    subEvent: null,
    questions: [],
  },
})

function siteRoute(passwordProtected = false) {
  return route => route.fulfill({
    json: { success: true, status: 200, passwordProtected, siteName: SITE, customSite: CUSTOM_SITE },
  })
}

test('an invited guest finds their RSVP by email', async ({ page }) => {
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/custom-site/site/${SITE}`]: siteRoute(),
      'POST /guest/rsvps/lookup': route => route.fulfill({ json: { success: true, status: 200, rsvpId: RSVP_ID } }),
      [`GET /rsvps/${RSVP_ID}/form`]: rsvpForm,
    },
  })

  await page.goto(`/sites/${SITE}`)
  await page.getByRole('button', { name: 'RSVP Here' }).click()
  await page.getByRole('dialog').getByPlaceholder('you@example.com').fill('Lea@Example.com')
  await page.getByRole('dialog').getByRole('button', { name: 'Find my RSVP' }).click()

  await expect(page).toHaveURL(new RegExp(`/rsvp/${RSVP_ID}$`))
  expect(calls.find(call => call.url.endsWith('/rsvps/lookup'))?.body).toMatchObject({
    siteName: SITE,
    email: 'Lea@Example.com',
  })
})

test('an email that is not on the list explains what to do', async ({ page }) => {
  await stubApi(page, {
    routes: {
      [`GET /guest/custom-site/site/${SITE}`]: siteRoute(),
      'POST /guest/rsvps/lookup': route => route.fulfill({ status: 404, json: { success: false, message: 'RSVP not found.' } }),
    },
  })

  await page.goto(`/sites/${SITE}`)
  await page.getByRole('button', { name: 'RSVP Here' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('you@example.com').fill('stranger@example.com')
  await dialog.getByRole('button', { name: 'Find my RSVP' }).click()

  await expect(dialog.getByText(/couldn't find an invitation for that email/i)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/sites/${SITE}`))
})

test('a guest on a passcode-protected site sends the site token with the lookup', async ({ page, context }) => {
  await context.addCookies([{
    name: `bpb_site_access_${SITE}`,
    value: ACCESS_TOKEN,
    domain: '127.0.0.1',
    path: '/',
  }])
  const calls = await stubApi(page, {
    routes: {
      [`GET /guest/custom-site/site/${SITE}`]: siteRoute(true),
      'POST /guest/rsvps/lookup': route => route.fulfill({ json: { success: true, status: 200, rsvpId: RSVP_ID } }),
      [`GET /rsvps/${RSVP_ID}/form`]: rsvpForm,
    },
  })

  await page.goto(`/sites/${SITE}`)
  await page.getByRole('button', { name: 'RSVP Here' }).click()
  await page.getByRole('dialog').getByPlaceholder('you@example.com').fill('lea@example.com')
  await page.getByRole('dialog').getByRole('button', { name: 'Find my RSVP' }).click()

  await expect(page).toHaveURL(new RegExp(`/rsvp/${RSVP_ID}$`))
  expect(calls.find(call => call.url.endsWith('/rsvps/lookup'))?.body).toMatchObject({ accessToken: ACCESS_TOKEN })
})
