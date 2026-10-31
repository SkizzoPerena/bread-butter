export type GatheringStatus = 'PENDING_PAYMENT' | 'ACTIVE'
export type SeatingPaymentStatus = 'PENDING' | 'APPROVED' | 'DENIED'
export type RsvpStatus = 'PENDING' | 'GOING' | 'NOT_GOING'

export interface JamPackageRecord {
  _id: string
  name: string
  pricePhp: number
  maxGuests: number
  isEnabled: boolean
}

export interface SeatingSeat {
  number: number
  unavailable: boolean
  guest: string | null
}

export interface SeatingTable {
  _id: string
  /** What to show: the host's label, or "Table 2" by position. */
  label: string
  /** What the host typed, which may be empty. */
  customLabel?: string
  capacity: number
  sortOrder: number
  seats?: SeatingSeat[]
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
  passcode?: string
  invitationSubject?: string
  invitationMessage?: string
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
  rsvpStatus: RsvpStatus
  respondedAt?: string | null
  inviteSentAt?: string | null
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

export interface JamSitePreview {
  gatheringName: string
}

export interface JamInvitation {
  gatheringName: string
  venue: string
  eventDate: string
  invitationMessage: string
}

export interface JamRsvpResult {
  message: string
  rsvpStatus: RsvpStatus
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
