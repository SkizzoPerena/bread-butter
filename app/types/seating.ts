import type { EventQuestion } from '~/types/event'
import type { RsvpAnswer } from '~/types/rsvp'

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

export interface JamInvitationDesign {
  mode?: 'MAKER' | 'IMAGE'
  imageUrl?: string
  requestLine?: string
  headline?: string
  eventTime?: string
  deadlineText?: string
  paletteName?: string
  typographyName?: string
  bannerImageUrl?: string
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
  invitationDesign?: JamInvitationDesign
  tables: SeatingTable[]
  openInvite?: { enabled: boolean, token: string | null }
  questions?: EventQuestion[]
  seatSelectionLocked?: boolean
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
  answers?: RsvpAnswer[]
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
  passcodeRequired?: boolean
}

export interface JamInviteDetails {
  gatheringName: string
  passcodeRequired?: boolean
  needsName?: boolean
}

export interface JamInviteUnlocked {
  gatheringName: string
  questions?: EventQuestion[]
  answers?: RsvpAnswer[]
  rsvpStatus?: RsvpStatus
  needsName?: boolean
}

export interface JamOpenInvitation {
  gatheringName: string
  venue: string
  eventDate: string
  invitationMessage: string
  design?: JamInvitationDesign
  questions?: EventQuestion[]
}

export interface JamOpenRegistration {
  message: string
  alreadyRegistered?: boolean
  attendanceToken?: string
  attendPath?: string
}

export interface JamImportableGuest {
  _id: string
  firstName: string
  lastName: string
  email: string
  partyName: string
  alreadyOnList: boolean
}

export interface JamReplyBody {
  passcode: string
  rsvpStatus: 'GOING' | 'NOT_GOING'
  answers?: RsvpAnswer[]
  firstName?: string
  lastName?: string
}

export interface JamInvitation {
  gatheringName: string
  venue: string
  eventDate: string
  invitationMessage: string
  design?: JamInvitationDesign
}

export interface JamRsvpResult {
  message: string
  rsvpStatus: RsvpStatus
  attendPath?: string
}

export type JamSeatStatus = 'OPEN' | 'TAKEN' | 'UNAVAILABLE' | 'YOURS'

export interface JamSeatMap {
  gatheringName: string
  locked: boolean
  message?: string
  seat: { tableId: string, tableLabel: string, seatNumber: number } | null
  tables: { _id: string, label: string, seats: { number: number, status: JamSeatStatus }[] }[]
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
