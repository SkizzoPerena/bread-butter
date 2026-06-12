export interface RsvpAnswer {
  question: string
  answer: string | boolean | number | null
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
