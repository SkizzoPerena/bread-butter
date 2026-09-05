export interface CollaborationInviteEvent {
  _id: string
  eventName: string
  eventDate?: string
  venue?: string
  status?: string
}

export interface CollaborationInviteUser {
  _id?: string
  firstName: string
  lastName: string
  email: string
}

export interface CollaborationInvite {
  _id: string
  event?: CollaborationInviteEvent | null
  invitedBy?: CollaborationInviteUser | null
  createdAt?: string
}

export interface CollaborationListResponse {
  success: boolean
  status?: number
  collaborations: CollaborationInvite[]
}

export interface CollaborationActionResponse {
  success: boolean
  status?: number
  message: string
  eventId?: string
}
