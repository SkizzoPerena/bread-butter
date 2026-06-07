import type { GuestRecord } from '~/types/event'

export interface GuestGroupRecord {
  _id: string
  event: string
  name?: string | null
  guests: GuestRecord[]
  createdAt?: string
  updatedAt?: string
}

export interface GuestGroupsListResponse {
  success: boolean
  status: number
  guestGroups: GuestGroupRecord[]
}

export interface CreateGuestGroupPayload {
  name?: string
  guestIds: string[]
}

export interface CreateGuestGroupResponse {
  success: boolean
  status: number
  message: string
  guestGroup: GuestGroupRecord
}

export interface AddGuestsToGroupResponse {
  success: boolean
  status: number
  message: string
  guestGroup: GuestGroupRecord
}

export interface RemoveGuestFromGroupResponse {
  success: boolean
  status: number
  message: string
  dissolved?: boolean
  guestGroup?: GuestGroupRecord
}

export interface DeleteGuestGroupResponse {
  success: boolean
  status: number
  message: string
}

export interface UpdateGuestGroupPayload {
  name?: string | null
  guestIds?: string[]
}

export interface UpdateGuestGroupResponse {
  success: boolean
  status: number
  message: string
  guestGroup: GuestGroupRecord
}
