import type { Page } from '@playwright/test'
import QRCode from 'qrcode'
import { type ApiCall, GATHERING_ID, PASS_TOKEN, expect, signIn, stubApi } from './helpers'

export const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const GATHERING = {
  _id: GATHERING_ID,
  name: 'Damson supper',
  venue: 'The Hall',
  eventDate: '2030-01-01T00:00:00.000Z',
  status: 'ACTIVE',
  packageName: 'Damson',
  pricePhp: 1500,
  maxGuests: 10,
  publicToken: PASS_TOKEN,
  publicPath: `/seat/${PASS_TOKEN}`,
  tables: [],
  guestCount: 1,
  attendingCount: 1,
  checkedInCount: 0,
  payment: null,
}

function guestRecord(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439021',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@example.com',
    partyName: '',
    rsvpStatus: 'GOING',
    isAttending: true,
    tableId: null,
    seatNumber: null,
    attendanceToken: PASS_TOKEN,
    attendanceQrSentAt: null,
    checkedInAt: null,
    ...overrides,
  }
}

export function png(buffer: Buffer, name = 'pass.png') {
  return { name, mimeType: 'image/png', buffer }
}

export const passQr = () => QRCode.toBuffer(`https://example.com/attend/${PASS_TOKEN}?checkin=1`, { width: 480, margin: 1 })
export const gatheringQr = () => QRCode.toBuffer(`https://example.com/seat/${PASS_TOKEN}`, { width: 480, margin: 1 })

export async function openWorkspace(page: Page) {
  await signIn(page)
  const guests = [guestRecord()]
  const calls = await stubApi(page, {
    routes: {
      [`GET /gatherings/${GATHERING_ID}/guests`]: route => route.fulfill({
        json: { success: true, status: 200, guests, maxGuests: 10, guestCount: guests.length, attendingCount: 1 },
      }),
      [`GET /gatherings/${GATHERING_ID}`]: route => route.fulfill({
        json: { success: true, status: 200, gathering: GATHERING },
      }),
      [`POST /gatherings/${GATHERING_ID}/guests`]: async (route) => {
        const guest = guestRecord({
          ...route.request().postDataJSON(),
          _id: '507f1f77bcf86cd799439022',
          rsvpStatus: 'PENDING',
          isAttending: false,
        })
        guests.push(guest)
        await route.fulfill({ status: 201, json: { success: true, status: 201, guest } })
      },
      [`POST /gatherings/${GATHERING_ID}/check-in`]: route => route.fulfill({
        json: {
          success: true,
          status: 200,
          guest: { id: 'g1', name: 'Maria Santos', tableLabel: 'Table 1', seatNumber: 2, checkedInAt: new Date().toISOString() },
        },
      }),
    },
  })
  await page.goto(`/seating/${GATHERING_ID}`)
  await expect(page.getByRole('heading', { name: 'Damson supper' })).toBeVisible()
  return calls
}

export function checkInCalls(calls: ApiCall[]) {
  return calls.filter(call => call.method === 'POST' && call.url.endsWith('/check-in'))
}
