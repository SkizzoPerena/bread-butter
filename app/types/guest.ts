import type { GuestRecord } from '~/types/event'

export interface GuestEntryInput {
  firstName: string
  lastName: string
  email: string
  mailingAddress?: string
  contactNumber?: string
  envelopeName?: string
}

export interface UpdateGuestInput {
  firstName?: string
  lastName?: string
  email?: string
  mailingAddress?: string
  contactNumber?: string
  envelopeName?: string
  tableCode?: string | null
}

export interface CreateGuestResponse {
  success: boolean
  status: number
  message: string
  guest: GuestRecord
}

export interface UpdateGuestResponse {
  success: boolean
  status: number
  message: string
  guest: GuestRecord
}

export interface CreateGuestsBulkResponse {
  success: boolean
  status: number
  message: string
  requested: number
  created: number
  skippedExisting: number
}

export interface GuestsListResponse {
  success: boolean
  status: number
  guests: GuestRecord[]
}

export interface SendInviteResponse {
  success: boolean
  status: number
  message: string
  requested: number
  created: number
  skippedAlreadyInvited: number
  notFound: number
  remainingEmails?: number
  /** Number of invitation emails successfully sent via EmailJS (0 when email is not configured). */
  emailsSent?: number
}

export interface DeleteGuestResponse {
  success: boolean
  status: number
  message: string
}

export interface EventTablesResponse {
  success: boolean
  status: number
  tableCodes: string[]
}

export interface BulkAssignTableResponse {
  success: boolean
  status: number
  message: string
  tableCode: string | null
  guests: GuestRecord[]
}
