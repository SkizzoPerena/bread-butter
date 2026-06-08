export interface InvitationBlock {
  type: 'heading' | 'text'
  content: string
}

export interface InvitationRecord {
  _id: string
  event: string
  requestLine: string
  eventLabel: string
  eventDate: string
  eventTime: string
  eventVenue: string
  blocks: InvitationBlock[]
  deadlineText: string
  deadlineDate: string
}

export interface InvitationResponse {
  success: boolean
  invitation: InvitationRecord | null
}

export interface InvitationMutationResponse {
  success: boolean
  message?: string
  invitation?: InvitationRecord
}

export interface InvitationSavePayload {
  eventId: string
  requestLine: string
  eventLabel: string
  eventDate: string
  eventTime: string
  eventVenue: string
  blocks: InvitationBlock[]
  deadlineText: string
  deadlineDate: string
}
