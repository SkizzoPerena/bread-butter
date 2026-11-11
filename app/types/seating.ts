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
  accentColor?: string
  bannerImageUrl?: string
  templateId?: string
  headerLabel?: string
  hostName?: string
  primaryName?: string
  scheduleType?: 'single' | 'dual'
  ceremonyTitle?: string
  ceremonyTime?: string
  ceremonyVenue?: string
  receptionTitle?: string
  receptionTime?: string
  receptionVenue?: string
  celebrationTitle?: string
  ctaText?: string
  cardImageUrl?: string
  cardImageUpdatedAt?: string
}

export interface SeatingUpgradeSnapshot {
  packageName: string
  pricePhp?: number
  maxGuests: number
  fromPackageName: string
  fromPricePhp?: number
  fromMaxGuests: number
}

export interface SeatingPaymentRecord {
  _id: string
  type?: 'SEATING_PACKAGE' | 'SEATING_UPGRADE'
  upgrade?: SeatingUpgradeSnapshot | null
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

export type TableGroupColor = 'amber' | 'rose' | 'blue' | 'purple' | 'teal' | 'emerald' | 'stone'

export interface TableGroupRecord {
  /** Chosen by the page: letters, numbers, `_`, or `-`, up to 40 characters. */
  id: string
  name: string
  color: TableGroupColor
}

export interface GatheringRecord {
  _id: string
  name: string
  eventType?: string
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
  tableGroups?: TableGroupRecord[]
  /** Table `_id` to the group it belongs to. */
  tableGroupAssignments?: Record<string, string>
  /** Group `id` to the parties the host wants seated in it. */
  partyAllotments?: Record<string, string[]>
  openInvite?: { enabled: boolean, token: string | null }
  questions?: EventQuestion[]
  seatSelectionLocked?: boolean
  /** How many companions each guest can bring. 0 turns companions off. */
  maxCompanionsPerGuest?: number
  /** Raised by every seat change, so a page can tell its view is out of date. */
  seatVersion?: number
  guestCount: number
  attendingCount: number
  checkedInCount: number
  payment: SeatingPaymentRecord | null
  pendingUpgrade?: SeatingPaymentRecord | null
}

export interface JamUpgradeOption {
  _id: string
  name: string
  pricePhp: number
  maxGuests: number
  priceDifferencePhp: number
  additionalGuests: number
}

export interface JamUpgradeOptions {
  current: { packageId: string, packageName: string, pricePhp: number, maxGuests: number }
  options: JamUpgradeOption[]
  pendingUpgrade: SeatingPaymentRecord | null
}

export interface SeatingGuestRecord {
  _id: string
  /** Missing until a guest invited by email alone gives their name. */
  firstName?: string
  lastName?: string
  isBulkInvite?: boolean
  /** The guest who brought this companion, whose reply they follow. */
  companionOf?: string | null
  /** Missing for a companion, who gets their pass from the guest who brought them. */
  email?: string
  partyName: string
  rsvpStatus: RsvpStatus
  answers?: RsvpAnswer[]
  respondedAt?: string | null
  inviteSentAt?: string | null
  isAttending: boolean
  tableId: string | null
  /** The table's name, or "Table N" when the host gave it none. */
  tableLabel?: string | null
  /** The table's position, from 1. */
  tableNumber?: number | null
  /** The name the host gave the table, if any. */
  tableName?: string | null
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
  venue?: string
  eventDate?: string
  invitationMessage?: string
  design?: JamInvitationDesign
  questions?: EventQuestion[]
  answers?: RsvpAnswer[]
  rsvpStatus?: RsvpStatus
  needsName?: boolean
  maxCompanions?: number
}

export interface JamCompanion {
  _id: string
  firstName: string
  lastName: string
  name: string
  /** The name is still a placeholder such as "Skizzo's companion 1". */
  namePending: boolean
  tableId: string | null
  tableLabel: string | null
  tableNumber?: number | null
  tableName?: string | null
  seatNumber: number | null
  checkedInAt: string | null
  attendPath: string
}

export interface JamCompanionRow {
  _id?: string
  firstName?: string
  lastName?: string
}

export interface JamCompanionList {
  message?: string
  maxCompanions: number
  companions: JamCompanion[]
}

export interface SeatMoveTarget {
  /** Null takes the guest off their seat. */
  tableId: string | null
  /** Leave out to take the table's lowest open seat. */
  seatNumber?: number
  /** Who the page thinks holds the seat, so a seat that just changed isn't overwritten. */
  expectedGuestId?: string | null
}

export interface SeatMoveResult {
  message: string
  guest: SeatingGuestRecord
  swappedGuest: SeatingGuestRecord | null
  seatVersion?: number
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

export interface JamBulkPreview {
  requested: number
  toInvite: number
  invalidEmails: string[]
  duplicateCount: number
  alreadyOnList: number
  creditsRemaining: number
  shortBy: number
  canSend: boolean
}

export interface JamBulkResult {
  message: string
  created: number
  alreadyOnList: number
  sent: number
  skipped: number
  creditsRemaining: number
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

export type JamSeatStatus = 'OPEN' | 'TAKEN' | 'UNAVAILABLE' | 'YOURS' | 'COMPANION'

export type JamChosenSeat = { tableId: string, tableLabel: string, seatNumber: number }

export interface JamSeatMap {
  gatheringName: string
  locked: boolean
  message?: string
  seat: JamChosenSeat | null
  companions?: { _id: string, name: string, seat: JamChosenSeat | null }[]
  tables: { _id: string, label: string, seats: { number: number, status: JamSeatStatus, companionId?: string }[] }[]
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
  /** A companion's pass only shows their seat. Replies and seats go through their guest. */
  isCompanion?: boolean
  /** Only on a guest's own pass. Each has a link to their pass, which the guest can share. */
  companions?: JamCompanion[]
}

export interface CheckInResult {
  id: string
  name: string
  partyName: string
  tableLabel: string | null
  seatNumber: number | null
  checkedInAt: string | null
  attendanceToken: string
  companions?: { id: string, name: string, checkedInAt: string | null }[]
}

export function guestNeedsName(guest: Pick<SeatingGuestRecord, 'firstName' | 'lastName'>): boolean {
  return !guest.firstName || !guest.lastName
}

export function guestDisplayName(guest: Pick<SeatingGuestRecord, 'firstName' | 'lastName' | 'email'>): string {
  return `${guest.firstName ?? ''} ${guest.lastName ?? ''}`.trim() || guest.email || 'Guest'
}
