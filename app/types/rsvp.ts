import type { EventQuestion } from '~/types/event'
import type { InvitationRecord } from '~/types/invitation'

export interface RsvpAnswer {
  question: string
  answer: string | boolean | number | null
  notes: string
}

export interface RsvpRecord {
  _id: string
  name: string
  email: string
  status: 'PENDING' | 'GOING' | 'NOT_GOING'
  invitedAt?: string | null
  respondedAt?: string | null
  answers: RsvpAnswer[]
}

export interface EventRsvpsListResponse {
  success: boolean
  page: number
  limit: number
  total: number
  totalPages: number
  rsvps: RsvpRecord[]
}

export type RsvpStatusFilter = 'ALL' | 'PENDING' | 'GOING' | 'NOT_GOING'

export interface FetchEventRsvpsOptions {
  page?: number
  limit?: number
  status?: RsvpStatusFilter
}

export interface GuestRsvpSummary {
  _id: string
  name: string
  email: string
  status: 'PENDING' | 'GOING' | 'NOT_GOING'
  respondedAt?: string | null
  answers: RsvpAnswer[]
  subEventId?: string | null
}

export interface GuestRsvpSubEventInfo {
  name: string
  eventDate?: string | null
  venue?: string | null
  description?: string | null
}

export interface GuestRsvpFormResponse {
  success: boolean
  status: number
  rsvp: GuestRsvpSummary
  alreadyResponded: boolean
  invitation: InvitationRecord | null
  subEvent: GuestRsvpSubEventInfo | null
  questions: EventQuestion[]
}

export interface GuestRsvpRespondPayload {
  status: 'GOING' | 'NOT_GOING'
  answers: RsvpAnswer[]
}

export interface GuestRsvpRespondResponse {
  success: boolean
  status: number
  message: string
  rsvp?: RsvpRecord
  alreadyResponded?: boolean
}

export class GuestRsvpError extends Error {
  status: number
  notFound?: boolean
  alreadyResponded?: boolean

  constructor(
    message: string,
    status: number,
    options: { notFound?: boolean; alreadyResponded?: boolean } = {}
  ) {
    super(message)
    this.name = 'GuestRsvpError'
    this.status = status
    this.notFound = options.notFound
    this.alreadyResponded = options.alreadyResponded
  }
}

export function isValidRsvpObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value.trim())
}
