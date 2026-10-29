import type {
  CheckInResult,
  GatheringRecord,
  JamInvitation,
  JamPackageRecord,
  JamRsvpResult,
  JamSitePreview,
  PublicSeatDetail,
  PublicSeatList,
  RsvpStatus,
  SeatingGuestRecord,
  SeatingPaymentRecord,
  SeatingTable,
} from '~/types/seating'

interface GatheringResponse {
  gathering: GatheringRecord
}

interface GatheringsResponse {
  gatherings: GatheringRecord[]
}

interface PackagesResponse {
  packages: JamPackageRecord[]
}

interface GuestsResponse {
  guests: SeatingGuestRecord[]
  maxGuests: number
  guestCount: number
  attendingCount: number
  goingCount?: number
  notGoingCount?: number
  pendingCount?: number
}

interface GuestResponse {
  guest: SeatingGuestRecord
  message?: string
}

interface AssignResponse {
  guests: SeatingGuestRecord[]
  gathering: GatheringRecord
  splitParties: string[]
  assignedCount: number
  unassignedCount: number
  message: string
}

interface PaymentResponse {
  payment: SeatingPaymentRecord
  message?: string
}

interface CheckoutResponse {
  checkoutUrl: string | null
  checkoutId?: string
  paymentId?: string
  alreadyPaid?: boolean
  message?: string
  gatheringId?: string
  gatheringName?: string
  payment?: SeatingPaymentRecord
}

const MOCK_PACKAGES: JamPackageRecord[] = [
  { _id: 'mock-apricot', name: 'Apricot', pricePhp: 1500, maxGuests: 20, isEnabled: true },
  { _id: 'mock-strawberry', name: 'Strawberry', pricePhp: 3500, maxGuests: 80, isEnabled: true },
  { _id: 'mock-fig', name: 'Fig', pricePhp: 6000, maxGuests: 150, isEnabled: true },
]

function mockToken() {
  return Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function recount(gathering: GatheringRecord, guests: SeatingGuestRecord[]) {
  gathering.guestCount = guests.length
  gathering.attendingCount = guests.filter((guest) => guest.isAttending).length
  gathering.checkedInCount = guests.filter((guest) => guest.checkedInAt).length
}

export function useSeating() {
  const { apiRequest, apiUpload, isUiOnlyMode } = useApiMode()
  const packages = useState<JamPackageRecord[]>('seating-mock-packages', () => MOCK_PACKAGES.map((item) => ({ ...item })))
  const gatherings = useState<GatheringRecord[]>('seating-mock-gatherings', () => [])
  const guestsByGathering = useState<Record<string, SeatingGuestRecord[]>>('seating-mock-guests', () => ({}))

  function mockGuests(gatheringId: string) {
    if (!guestsByGathering.value[gatheringId]) guestsByGathering.value[gatheringId] = []
    return guestsByGathering.value[gatheringId]
  }

  async function listPackages(): Promise<JamPackageRecord[]> {
    if (isUiOnlyMode.value) return packages.value.filter((item) => item.isEnabled)
    const response = await apiRequest<PackagesResponse>('/user/seating/jam-packages')
    return response.packages
  }

  async function listGatherings(): Promise<GatheringRecord[]> {
    if (isUiOnlyMode.value) return gatherings.value
    const response = await apiRequest<GatheringsResponse>('/user/seating/gatherings')
    return response.gatherings
  }

  async function getGathering(gatheringId: string): Promise<GatheringRecord> {
    if (isUiOnlyMode.value) {
      const gathering = gatherings.value.find((item) => item._id === gatheringId)
      if (!gathering) throw new Error('Seating plan not found.')
      return gathering
    }
    const response = await apiRequest<GatheringResponse>(`/user/seating/gatherings/${gatheringId}`)
    return response.gathering
  }

  async function createGathering(body: {
    packageId: string
    name: string
    venue: string
    eventDate: string
  }): Promise<GatheringRecord> {
    if (isUiOnlyMode.value) {
      const jamPackage = packages.value.find((item) => item._id === body.packageId)
      if (!jamPackage) throw new Error('This package is not available.')
      const gathering: GatheringRecord = {
        _id: `mock-gathering-${Date.now()}`,
        name: body.name,
        venue: body.venue,
        eventDate: body.eventDate,
        status: 'PENDING_PAYMENT',
        packageName: jamPackage.name,
        pricePhp: jamPackage.pricePhp,
        maxGuests: jamPackage.maxGuests,
        jamPackage: jamPackage._id,
        publicToken: mockToken(),
        publicPath: '',
        passcode: '',
        invitationSubject: '',
        invitationMessage: '',
        tables: [],
        guestCount: 0,
        attendingCount: 0,
        checkedInCount: 0,
        payment: null,
      }
      gathering.publicPath = `/seat/${gathering.publicToken}`
      gatherings.value = [gathering, ...gatherings.value]
      return gathering
    }
    const response = await apiRequest<GatheringResponse>('/user/seating/gatherings', {
      method: 'POST',
      body,
    })
    return response.gathering
  }

  async function submitProof(gatheringId: string, payload: {
    transactionId: string
    paymentMethod: string
    proofOfPayment: File
  }): Promise<SeatingPaymentRecord> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      gathering.payment = {
        _id: `mock-payment-${Date.now()}`,
        amount: gathering.pricePhp,
        status: 'APPROVED',
        amountReceived: gathering.pricePhp,
        paymentMethod: payload.paymentMethod,
        transactionId: payload.transactionId,
        provider: 'MANUAL',
      }
      gathering.status = 'ACTIVE'
      return gathering.payment
    }
    const form = new FormData()
    form.append('transactionId', payload.transactionId)
    form.append('paymentMethod', payload.paymentMethod)
    form.append('proofOfPayment', payload.proofOfPayment)
    const response = await apiUpload<PaymentResponse>(
      `/user/seating/gatherings/${gatheringId}/payment-proof`,
      form,
    )
    return response.payment
  }

  async function submitDraftProof(details: {
    packageId: string
    name: string
    venue: string
    eventDate: string
  }, payload: {
    transactionId: string
    paymentMethod: string
    proofOfPayment: File
  }): Promise<{ gatheringId: string }> {
    if (isUiOnlyMode.value) {
      const gathering = await createGathering(details)
      gathering.payment = {
        _id: `mock-payment-${Date.now()}`,
        amount: gathering.pricePhp,
        status: 'PENDING',
        paymentMethod: payload.paymentMethod,
        transactionId: payload.transactionId,
        provider: 'MANUAL',
      }
      return { gatheringId: gathering._id }
    }
    const form = new FormData()
    form.append('packageId', details.packageId)
    form.append('name', details.name)
    form.append('venue', details.venue)
    form.append('eventDate', details.eventDate)
    form.append('transactionId', payload.transactionId)
    form.append('paymentMethod', payload.paymentMethod)
    form.append('proofOfPayment', payload.proofOfPayment)
    const response = await apiUpload<PaymentResponse & { gathering?: { _id: string } }>(
      '/user/seating/payment-proof',
      form,
    )
    return { gatheringId: String(response.gathering?._id || '') }
  }

  async function createCheckout(gatheringId: string, cancelPath: string): Promise<CheckoutResponse> {
    if (isUiOnlyMode.value) {
      return {
        checkoutUrl: `/user/seating-payment/success?gatheringId=${gatheringId}&payment_id=mock-payment`,
        checkoutId: 'cs_mock',
        paymentId: 'mock-payment',
      }
    }
    return apiRequest<CheckoutResponse>(`/user/seating/gatherings/${gatheringId}/checkout-session`, {
      method: 'POST',
      body: { cancelPath },
    })
  }

  async function getCheckoutStatus(checkoutId: string): Promise<CheckoutResponse> {
    if (isUiOnlyMode.value) {
      return { checkoutUrl: null, alreadyPaid: true, gatheringName: 'Preview seating plan' }
    }
    return apiRequest<CheckoutResponse>(`/user/seating/checkout/${checkoutId}`)
  }

  async function listGuests(gatheringId: string): Promise<GuestsResponse> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guests = mockGuests(gatheringId)
      return {
        guests,
        maxGuests: gathering.maxGuests,
        guestCount: guests.length,
        attendingCount: guests.filter((guest) => guest.isAttending).length,
      }
    }
    return apiRequest<GuestsResponse>(`/user/seating/gatherings/${gatheringId}/guests`)
  }

  async function createGuest(gatheringId: string, body: {
    firstName: string
    lastName: string
    email: string
    partyName?: string
    isAttending?: boolean
    rsvpStatus?: RsvpStatus
  }): Promise<SeatingGuestRecord> {
    const rsvpStatus: RsvpStatus = body.rsvpStatus
      || (body.isAttending ? 'GOING' : 'PENDING')
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guests = mockGuests(gatheringId)
      if (guests.length >= gathering.maxGuests) throw new Error('This package has reached its guest cap.')
      const guest: SeatingGuestRecord = {
        _id: `mock-guest-${Date.now()}`,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        partyName: body.partyName || '',
        rsvpStatus,
        isAttending: rsvpStatus === 'GOING',
        tableId: null,
        seatNumber: null,
        attendanceToken: mockToken(),
        attendanceQrSentAt: null,
        checkedInAt: null,
      }
      guests.push(guest)
      recount(gathering, guests)
      return guest
    }
    const response = await apiRequest<GuestResponse>(`/user/seating/gatherings/${gatheringId}/guests`, {
      method: 'POST',
      body,
    })
    return response.guest
  }

  async function updateGuest(gatheringId: string, guestId: string, body: Partial<{
    firstName: string
    lastName: string
    email: string
    partyName: string
    isAttending: boolean
    rsvpStatus: RsvpStatus
  }>): Promise<SeatingGuestRecord> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guest = mockGuests(gatheringId).find((item) => item._id === guestId)
      if (!guest) throw new Error('Guest not found.')
      Object.assign(guest, body)
      const status = body.rsvpStatus || (body.isAttending === true ? 'GOING' : body.isAttending === false ? 'NOT_GOING' : guest.rsvpStatus)
      guest.rsvpStatus = status
      guest.isAttending = status === 'GOING'
      if (status !== 'GOING') {
        guest.tableId = null
        guest.seatNumber = null
      }
      recount(gathering, mockGuests(gatheringId))
      return guest
    }
    const response = await apiRequest<GuestResponse>(
      `/user/seating/gatherings/${gatheringId}/guests/${guestId}`,
      { method: 'PATCH', body },
    )
    return response.guest
  }

  async function deleteGuest(gatheringId: string, guestId: string): Promise<void> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      guestsByGathering.value[gatheringId] = mockGuests(gatheringId).filter((guest) => guest._id !== guestId)
      recount(gathering, guestsByGathering.value[gatheringId])
      return
    }
    await apiRequest(`/user/seating/gatherings/${gatheringId}/guests/${guestId}`, { method: 'DELETE' })
  }

  async function replaceTables(gatheringId: string, tables: { capacity: number }[], confirmClear = false) {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const sum = tables.reduce((total, table) => total + table.capacity, 0)
      if (sum > gathering.maxGuests) throw new Error('Total seats cannot exceed the package guest cap.')
      gathering.tables = tables.map((table, index) => ({
        _id: `mock-table-${gatheringId}-${index}`,
        label: `Table ${index + 1}`,
        capacity: table.capacity,
        sortOrder: index,
      }))
      for (const guest of mockGuests(gatheringId)) {
        guest.tableId = null
        guest.seatNumber = null
      }
      return gathering
    }
    const response = await apiRequest<GatheringResponse>(`/user/seating/gatherings/${gatheringId}/tables`, {
      method: 'PUT',
      body: { tables, confirmClear },
    })
    return response.gathering
  }

  async function updateTableCapacity(
    gatheringId: string,
    tableId: string,
    capacity: number,
    confirmClear = false,
  ): Promise<GatheringRecord> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const table = gathering.tables.find((item) => item._id === tableId)
      if (!table) throw new Error('Table not found.')
      const otherSeats = gathering.tables.reduce(
        (sum, item) => sum + (item._id === tableId ? 0 : item.capacity),
        0,
      )
      if (otherSeats + capacity > gathering.maxGuests) {
        throw new Error('Total seats cannot exceed the package guest cap.')
      }
      if (capacity < table.capacity && !confirmClear) {
        const overflow = mockGuests(gatheringId).some(
          (guest) => guest.tableId === tableId && (guest.seatNumber || 0) > capacity,
        )
        if (overflow) throw new Error('This capacity removes guests from seats. Confirm to continue.')
      }
      table.capacity = capacity
      if (confirmClear) {
        for (const guest of mockGuests(gatheringId)) {
          if (guest.tableId === tableId && (guest.seatNumber || 0) > capacity) {
            guest.tableId = null
            guest.seatNumber = null
          }
        }
      }
      return gathering
    }
    const response = await apiRequest<GatheringResponse>(
      `/user/seating/gatherings/${gatheringId}/tables/${tableId}`,
      { method: 'PATCH', body: { capacity, confirmClear } },
    )
    return response.gathering
  }

  async function autoAssign(gatheringId: string): Promise<AssignResponse> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guests = mockGuests(gatheringId)
      const seats: { tableId: string, seatNumber: number }[] = []
      for (const table of gathering.tables) {
        for (let seatNumber = 1; seatNumber <= table.capacity; seatNumber += 1) {
          seats.push({ tableId: table._id, seatNumber })
        }
      }
      for (const guest of guests) {
        guest.tableId = null
        guest.seatNumber = null
      }
      let index = 0
      for (const guest of guests.filter((item) => item.isAttending)) {
        const seat = seats[index]
        index += 1
        if (!seat) break
        guest.tableId = seat.tableId
        guest.seatNumber = seat.seatNumber
      }
      return {
        guests,
        gathering,
        splitParties: [],
        assignedCount: guests.filter((guest) => guest.seatNumber != null).length,
        unassignedCount: guests.filter((guest) => guest.isAttending && guest.seatNumber == null).length,
        message: 'Seats assigned.',
      }
    }
    return apiRequest<AssignResponse>(`/user/seating/gatherings/${gatheringId}/auto-assign`, { method: 'POST' })
  }

  async function moveSeat(gatheringId: string, guestId: string, tableId: string | null, seatNumber: number | null) {
    if (isUiOnlyMode.value) {
      const guests = mockGuests(gatheringId)
      const guest = guests.find((item) => item._id === guestId)
      if (!guest) throw new Error('Guest not found.')
      if (tableId && seatNumber) {
        const occupant = guests.find((item) => item.tableId === tableId && item.seatNumber === seatNumber && item._id !== guestId)
        if (occupant) {
          occupant.tableId = guest.tableId
          occupant.seatNumber = guest.seatNumber
        }
        guest.tableId = tableId
        guest.seatNumber = seatNumber
      } else {
        guest.tableId = null
        guest.seatNumber = null
      }
      return
    }
    await apiRequest(`/user/seating/gatherings/${gatheringId}/guests/${guestId}/seat`, {
      method: 'PATCH',
      body: { tableId, seatNumber },
    })
  }

  async function resendPass(gatheringId: string, guestId: string) {
    if (isUiOnlyMode.value) return
    await apiRequest(`/user/seating/gatherings/${gatheringId}/guests/${guestId}/resend-qr`, { method: 'POST' })
  }

  async function checkInGuest(gatheringId: string, guestId: string): Promise<CheckInResult> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guest = mockGuests(gatheringId).find((item) => item._id === guestId)
      if (!guest) throw new Error('Guest not found.')
      guest.checkedInAt = guest.checkedInAt || new Date().toISOString()
      recount(gathering, mockGuests(gatheringId))
      return presentMockCheckIn(gathering, guest)
    }
    const response = await apiRequest<{ guest: CheckInResult }>(
      `/user/seating/gatherings/${gatheringId}/guests/${guestId}/check-in`,
      { method: 'POST' },
    )
    return response.guest
  }

  async function undoCheckIn(gatheringId: string, guestId: string): Promise<CheckInResult> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guest = mockGuests(gatheringId).find((item) => item._id === guestId)
      if (!guest) throw new Error('Guest not found.')
      guest.checkedInAt = null
      recount(gathering, mockGuests(gatheringId))
      return presentMockCheckIn(gathering, guest)
    }
    const response = await apiRequest<{ guest: CheckInResult }>(
      `/user/seating/gatherings/${gatheringId}/guests/${guestId}/undo-check-in`,
      { method: 'POST' },
    )
    return response.guest
  }

  async function checkInByToken(gatheringId: string, token: string): Promise<CheckInResult> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const guest = mockGuests(gatheringId).find((item) => item.attendanceToken === token)
      if (!guest) throw new Error('Pass not found.')
      return checkInGuest(gatheringId, guest._id)
    }
    const response = await apiRequest<{ guest: CheckInResult }>(
      `/user/seating/gatherings/${gatheringId}/check-in`,
      { method: 'POST', body: { token } },
    )
    return response.guest
  }

  async function fetchPublicSeatList(publicToken: string): Promise<PublicSeatList> {
    if (isUiOnlyMode.value) {
      const gathering = gatherings.value.find((item) => item.publicToken === publicToken)
      if (!gathering) throw new Error('Seating plan not found.')
      const guests = mockGuests(gathering._id).filter((guest) => guest.isAttending)
      return {
        success: true,
        gatheringName: gathering.name,
        venue: gathering.venue,
        eventDate: gathering.eventDate,
        guests: guests.map((guest) => ({
          id: guest._id,
          name: `${guest.firstName} ${guest.lastName}`,
          hint: guest.partyName,
        })),
      }
    }
    return apiRequest<PublicSeatList>(`/guest/seating/seat/${publicToken}`, { authenticated: false })
  }

  async function fetchPublicGuestSeat(publicToken: string, guestId: string): Promise<PublicSeatDetail> {
    if (isUiOnlyMode.value) {
      const gathering = gatherings.value.find((item) => item.publicToken === publicToken)
      const guest = gathering ? mockGuests(gathering._id).find((item) => item._id === guestId && item.isAttending) : null
      if (!gathering || !guest) throw new Error('Guest not found.')
      const table = gathering.tables.find((item) => item._id === guest.tableId)
      return {
        success: true,
        gatheringName: gathering.name,
        venue: gathering.venue,
        eventDate: gathering.eventDate,
        name: `${guest.firstName} ${guest.lastName}`,
        tableLabel: table?.label || null,
        seatNumber: guest.seatNumber,
        seated: Boolean(table && guest.seatNumber != null),
        checkedInAt: guest.checkedInAt,
      }
    }
    return apiRequest<PublicSeatDetail>(`/guest/seating/seat/${publicToken}/guests/${guestId}`, {
      authenticated: false,
    })
  }

  async function fetchAttendance(token: string, checkIn = false): Promise<PublicSeatDetail> {
    if (isUiOnlyMode.value) {
      for (const gathering of gatherings.value) {
        const guest = mockGuests(gathering._id).find((item) => item.attendanceToken === token && item.isAttending)
        if (!guest) continue
        if (checkIn && !guest.checkedInAt) guest.checkedInAt = new Date().toISOString()
        const table = gathering.tables.find((item) => item._id === guest.tableId)
        return {
          success: true,
          gatheringName: gathering.name,
          venue: gathering.venue,
          eventDate: gathering.eventDate,
          name: `${guest.firstName} ${guest.lastName}`,
          tableLabel: table?.label || null,
          seatNumber: guest.seatNumber,
          seated: Boolean(table && guest.seatNumber != null),
          checkedInAt: guest.checkedInAt,
        }
      }
      throw new Error('Pass not found.')
    }
    const query = checkIn ? '?checkin=1' : ''
    return apiRequest<PublicSeatDetail>(`/guest/seating/attend/${token}${query}`, { authenticated: false })
  }

  async function updateGathering(gatheringId: string, body: {
    packageId?: string
    name?: string
    venue?: string
    eventDate?: string
  }): Promise<GatheringRecord> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      if (gathering.status !== 'PENDING_PAYMENT') throw new Error('The package can only be changed before payment is approved.')
      if (body.packageId) {
        const jamPackage = packages.value.find((item) => item._id === body.packageId)
        if (!jamPackage) throw new Error('This package is not available.')
        gathering.jamPackage = jamPackage._id
        gathering.packageName = jamPackage.name
        gathering.pricePhp = jamPackage.pricePhp
        gathering.maxGuests = jamPackage.maxGuests
      }
      if (body.name !== undefined) gathering.name = body.name
      if (body.venue !== undefined) gathering.venue = body.venue
      if (body.eventDate !== undefined) gathering.eventDate = body.eventDate
      return gathering
    }
    const response = await apiRequest<GatheringResponse>(`/user/seating/gatherings/${gatheringId}`, {
      method: 'PATCH',
      body,
    })
    return response.gathering
  }

  async function saveInvitation(gatheringId: string, body: {
    passcode?: string
    invitationSubject?: string
    invitationMessage?: string
  }): Promise<GatheringRecord> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      Object.assign(gathering, body)
      return gathering
    }
    const response = await apiRequest<GatheringResponse>(`/user/seating/gatherings/${gatheringId}`, {
      method: 'PATCH',
      body,
    })
    return response.gathering
  }

  async function sendInvites(gatheringId: string, guestIds?: string[]): Promise<{ message: string, sent: number, skipped: number }> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      if (!gathering.passcode) throw new Error('Set a passcode before sending invitations.')
      const guests = mockGuests(gatheringId).filter((guest) =>
        guestIds?.length ? guestIds.includes(guest._id) : guest.rsvpStatus === 'PENDING',
      )
      if (!guests.length) throw new Error('No guests to invite.')
      return { message: 'Invitations were not sent.', sent: 0, skipped: guests.length }
    }
    return apiRequest(`/user/seating/gatherings/${gatheringId}/invites`, {
      method: 'POST',
      body: guestIds?.length ? { guestIds } : {},
    })
  }

  async function exportGuests(gatheringId: string): Promise<Blob> {
    if (isUiOnlyMode.value) {
      const gathering = await getGathering(gatheringId)
      const rows = ['name,email,party,response,table,seat,checked in']
      for (const guest of mockGuests(gatheringId)) {
        const table = gathering.tables.find((item) => item._id === guest.tableId)
        rows.push([
          `${guest.firstName} ${guest.lastName}`,
          guest.email,
          guest.partyName,
          guest.rsvpStatus,
          table?.label || '',
          guest.seatNumber ?? '',
          guest.checkedInAt ? 'yes' : 'no',
        ].join(','))
      }
      return new Blob([rows.join('\n')], { type: 'text/csv' })
    }
    return apiRequest<Blob>(`/user/seating/gatherings/${gatheringId}/export`, { responseType: 'blob' })
  }

  async function fetchJamSite(publicToken: string): Promise<JamSitePreview> {
    if (isUiOnlyMode.value) {
      const gathering = gatherings.value.find((item) => item.publicToken === publicToken)
      if (!gathering) throw new Error('Seating plan not found.')
      return { gatheringName: gathering.name }
    }
    return apiRequest<JamSitePreview>(`/guest/seating/site/${publicToken}`, { authenticated: false })
  }

  async function unlockJamSite(publicToken: string, passcode: string): Promise<JamInvitation> {
    if (isUiOnlyMode.value) {
      const gathering = gatherings.value.find((item) => item.publicToken === publicToken)
      if (!gathering || gathering.passcode !== passcode) throw new Error('Incorrect passcode.')
      return {
        gatheringName: gathering.name,
        venue: gathering.venue,
        eventDate: gathering.eventDate,
        invitationMessage: gathering.invitationMessage || '',
      }
    }
    return apiRequest<JamInvitation>(`/guest/seating/site/${publicToken}/unlock`, {
      method: 'POST',
      body: { passcode },
      authenticated: false,
    })
  }

  async function respondToJamInvite(token: string, passcode: string, rsvpStatus: 'GOING' | 'NOT_GOING'): Promise<JamRsvpResult> {
    if (isUiOnlyMode.value) {
      for (const gathering of gatherings.value) {
        const guest = mockGuests(gathering._id).find((item) => item.attendanceToken === token)
        if (!guest) continue
        if (gathering.passcode !== passcode) throw new Error('Incorrect passcode.')
        guest.rsvpStatus = rsvpStatus
        guest.isAttending = rsvpStatus === 'GOING'
        if (rsvpStatus !== 'GOING') {
          guest.tableId = null
          guest.seatNumber = null
        }
        return {
          message: rsvpStatus === 'GOING' ? 'You are marked as coming.' : 'You are marked as not coming.',
          rsvpStatus,
        }
      }
      throw new Error('Invitation not found.')
    }
    return apiRequest<JamRsvpResult>(`/guest/seating/rsvp/${token}`, {
      method: 'POST',
      body: { passcode, rsvpStatus },
      authenticated: false,
    })
  }

  return {
    listPackages,
    listGatherings,
    getGathering,
    createGathering,
    updateGathering,
    submitProof,
    submitDraftProof,
    createCheckout,
    getCheckoutStatus,
    listGuests,
    createGuest,
    updateGuest,
    deleteGuest,
    replaceTables,
    updateTableCapacity,
    autoAssign,
    moveSeat,
    resendPass,
    checkInGuest,
    undoCheckIn,
    checkInByToken,
    fetchPublicSeatList,
    fetchPublicGuestSeat,
    fetchAttendance,
    saveInvitation,
    sendInvites,
    exportGuests,
    fetchJamSite,
    unlockJamSite,
    respondToJamInvite,
  }
}

function presentMockCheckIn(gathering: GatheringRecord, guest: SeatingGuestRecord): CheckInResult {
  const table = gathering.tables.find((item) => item._id === guest.tableId)
  return {
    id: guest._id,
    name: `${guest.firstName} ${guest.lastName}`,
    partyName: guest.partyName,
    tableLabel: table?.label || null,
    seatNumber: guest.seatNumber,
    checkedInAt: guest.checkedInAt,
    attendanceToken: guest.attendanceToken,
  }
}

export type { SeatingTable }
