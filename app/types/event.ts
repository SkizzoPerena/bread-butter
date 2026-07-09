import type { EventPaymentSummary, PaymentRecord } from '~/types/payment'
import type { PriceTierRecord } from '~/types/priceTier'
import type { TaskAssigneeRef } from '~/types/task'

export interface EventQuestion {
  question: string
  type: string
  options?: string[]
  notes?: string
}

export interface EventRecord {
  _id: string
  eventType: string
  eventName: string
  description: string
  venue: string
  eventDate: string
  status: string
  coverImageURL?: string | null
  isCatholicWedding?: boolean
  playlist?: string
  latestPayment?: PaymentRecord | null
  paymentSummary?: EventPaymentSummary | null
  priceTier?: PriceTierRecord | string | null
  tierPricePhp?: number | null
  allowedFeatures?: string[]
  questions?: EventQuestion[]
}

export interface EventsListResponse {
  success: boolean
  status: number
  events: EventRecord[]
}

export interface EventResponse {
  success: boolean
  status: number
  message: string
  event: EventRecord
}

export interface GuestRsvpSnapshot {
  _id: string
  status: string
  respondedAt?: string | null
  invitedAt?: string | null
}

export interface GuestRecord {
  _id: string
  firstName: string
  lastName: string
  mailingAddress?: string
  contactNumber?: string
  envelopeName?: string
  email: string
  roles?: { _id: string; name: string }[]
  tableCode?: string | null
  rsvp?: GuestRsvpSnapshot | null
}

export interface RsvpSummary {
  totalSent: number
  going: number
  notGoing: number
  pending: number
  preview?: {
    page: number
    limit: number
    rsvps: unknown[]
  }
}

export interface ChartSlice {
  label: string
  value: number
}

export function rsvpSummaryToChartData(summary: RsvpSummary): ChartSlice[] {
  return [
    { label: 'Attending', value: summary.going },
    { label: 'Not Attending', value: summary.notGoing },
    { label: 'Pending', value: summary.pending },
  ].filter((slice) => slice.value > 0)
}

export interface TaskPreview {
  _id: string
  title: string
  details: string
  status: string
  priority: number
  deadline?: string | null
  assignee?: TaskAssigneeRef | null
  subtasks?: TaskPreview[]
}

export interface TasksSummary {
  totalTasks: number
  byStatus: Record<string, number>
  preview: {
    page: number
    limit: number
    subtasksLimit: number
    tasks: TaskPreview[]
  }
}

export interface SelectedEventDetail {
  event: EventRecord
  guestList: GuestRecord[]
  rsvpSummary: RsvpSummary | null
  tasks: TasksSummary | null
}

export interface SelectedEventResponse {
  success: boolean
  event: EventRecord
  guestList: GuestRecord[]
  rsvpSummary: RsvpSummary | null
  tasks: TasksSummary | null
  subEvents?: unknown[]
}

export interface CreateEventPayload {
  eventType: string
  eventName: string
  description: string
  venue: string
  eventDate: string
  priceTierId: string
  coverImage?: File
  coverImageURL?: string
  transactionId?: string
  proofOfPayment?: File
  payLater?: boolean
  isCatholicWedding?: boolean
}

export interface UpdateEventPayload {
  eventType: string
  eventName: string
  description: string
  venue: string
  eventDate?: string
  coverImage?: File
  coverImageURL?: string
  isCatholicWedding?: boolean
}

export interface UpdateEventResponse {
  success: boolean
  status: number
  message: string
}

export function mapEventTypeToApi(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}

export function isWeddingEventType(eventType: string): boolean {
  return mapEventTypeToApi(eventType) === 'WEDDING'
}

const EVENT_TYPE_LABELS = [
  'Wedding',
  'Christening',
  'Birthday Party',
  'Family Reunion',
  'Other Events',
] as const

export const EVENT_TYPE_OPTIONS = [...EVENT_TYPE_LABELS]

export type EventTypeLabel = (typeof EVENT_TYPE_LABELS)[number]

const LEGACY_EVENT_TYPE_TO_LABEL: Record<string, (typeof EVENT_TYPE_LABELS)[number]> = {
  BAPTISM: 'Christening',
  GENDER_REVEAL_PARTY: 'Other Events',
  ENGAGEMENT: 'Other Events',
}

export function mapApiToEventTypeLabel(apiValue: string): string {
  const normalized = apiValue.trim().toUpperCase().replace(/\s+/g, '_')
  if (LEGACY_EVENT_TYPE_TO_LABEL[normalized]) {
    return LEGACY_EVENT_TYPE_TO_LABEL[normalized]
  }
  const match = EVENT_TYPE_LABELS.find(
    (label) => mapEventTypeToApi(label) === normalized
  )
  return match ?? EVENT_TYPE_LABELS[0]
}

export function formatEventPriceTier(
  event: Pick<EventRecord, 'priceTier' | 'tierPricePhp'>
): string {
  const tier = event.priceTier
  const snapshotPrice =
    typeof event.tierPricePhp === 'number' && event.tierPricePhp > 0
      ? event.tierPricePhp
      : null
  const tierPrice =
    tier && typeof tier === 'object' && typeof tier.pricePhp === 'number'
      ? tier.pricePhp
      : null
  const pricePhp = snapshotPrice ?? tierPrice

  if (tier && typeof tier === 'object' && tier.name) {
    const priceLabel =
      typeof pricePhp === 'number' && pricePhp > 0
        ? ` · Php ${pricePhp.toLocaleString()}`
        : ''
    return `${tier.name}${priceLabel}`
  }
  if (typeof pricePhp === 'number' && pricePhp > 0) {
    return `Php ${pricePhp.toLocaleString()}`
  }
  return '—'
}
