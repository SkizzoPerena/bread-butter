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

/** Who the host is inviting: a regular collaborator or a coordinator (partner). */
export type CollaboratorRole = 'USER' | 'PARTNER'

export interface EventCollaboratorPerson {
  _id: string
  firstName: string
  lastName: string
  email: string
  profileImageURL?: string
}

export interface EventPartnerCollaborator extends EventCollaboratorPerson {
  /** VOUCHER when they were added because the event was booked with their voucher. */
  joinedVia?: 'VOUCHER' | 'INVITE'
}

export interface EventCollaboratorsResponse {
  success: boolean
  status?: number
  owner: EventCollaboratorPerson | null
  collaborators: EventCollaboratorPerson[]
  partnerCollaborators: EventPartnerCollaborator[]
}

export interface EventInvite {
  _id: string
  inviteeEmail: string
  inviteeType: CollaboratorRole
  intendedRole?: CollaboratorRole | null
  awaitingSignup?: boolean
  invitee?: EventCollaboratorPerson | null
  inviteePartner?: EventCollaboratorPerson | null
  createdAt?: string
}

export interface EventInvitesResponse {
  success: boolean
  status?: number
  invites: EventInvite[]
}
