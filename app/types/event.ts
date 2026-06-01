import type { EventPaymentSummary, PaymentRecord } from '~/types/payment'

export interface EventQuestion {
  question: string
  type: string
  options?: string[]
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
  latestPayment?: PaymentRecord | null
  paymentSummary?: EventPaymentSummary | null
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
  name: string
  email: string
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

export interface TaskPreview {
  _id: string
  title: string
  details: string
  budget: number
  status: string
  priority: number
  deadline?: string | null
  subtasks?: TaskPreview[]
}

export interface TasksSummary {
  totalTasks: number
  totalAllocatedBudget: number
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
  coverImage?: File
  coverImageURL?: string
  transactionId?: string
  proofOfPayment?: File
  payLater?: boolean
}

export interface UpdateEventPayload {
  eventType: string
  eventName: string
  description: string
  venue: string
  coverImage?: File
  coverImageURL?: string
}

export interface UpdateEventResponse {
  success: boolean
  status: number
  message: string
}

export function mapEventTypeToApi(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}
