import type { PaymentRecord } from '~/types/payment'

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

export interface SelectedEventResponse {
  success: boolean
  event: EventRecord
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

export function mapEventTypeToApi(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}
