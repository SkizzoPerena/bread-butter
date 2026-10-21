export type GatheringStatus = 'PENDING_PAYMENT' | 'ACTIVE'
export type SeatingPaymentStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export interface JamPackageRecord {
  _id: string
  name: string
  pricePhp: number
  maxGuests: number
  isEnabled: boolean
}

export interface SeatingTable {
  _id: string
  label: string
  capacity: number
  sortOrder: number
}

export interface SeatingPaymentRecord {
  _id: string
  amount: number
  amountReceived?: number | null
  status: SeatingPaymentStatus
  paymentMethod?: string
  transactionId?: string
  proofOfPaymentURL?: string
  denialReason?: string
  provider?: string
  paymongoCheckoutUrl?: string
}

export interface GatheringRecord {
  _id: string
  name: string
  venue: string
  eventDate: string
  status: GatheringStatus
  packageName: string
  pricePhp: number
  maxGuests: number
  jamPackage?: string
  publicToken: string
  publicPath: string
  tables: SeatingTable[]
  guestCount: number
  attendingCount: number
  checkedInCount: number
  payment: SeatingPaymentRecord | null
}

export interface SeatingGuestRecord {
  _id: string
  firstName: string
  lastName: string
  email: string
  partyName: string
  isAttending: boolean
  tableId: string | null
  seatNumber: number | null
  attendanceToken: string
  attendanceQrSentAt: string | null
  checkedInAt: string | null
}

export interface PublicSeatGuest {
  id: string
  name: string
  hint: string
}

export interface PublicSeatList {
  success: boolean
  gatheringName: string
  venue: string
  eventDate: string
  guests: PublicSeatGuest[]
}

export interface PublicSeatDetail {
  success: boolean
  gatheringName: string
  venue: string
  eventDate: string
  name: string
  tableLabel: string | null
  seatNumber: number | null
  seated: boolean
  checkedInAt: string | null
}

export interface CheckInResult {
  id: string
  name: string
  partyName: string
  tableLabel: string | null
  seatNumber: number | null
  checkedInAt: string | null
  attendanceToken: string
}

export function guestDisplayName(guest: Pick<SeatingGuestRecord, 'firstName' | 'lastName'>): string {
  return `${guest.firstName} ${guest.lastName}`.trim()
}
