import type { GuestRecord } from '~/types/event'

export interface GuestRoleRecord {
  _id: string
  event: string
  name: string
  guests: GuestRecord[]
  createdAt?: string
  updatedAt?: string
}

export interface GuestRolesListResponse {
  success: boolean
  status: number
  guestRoles: GuestRoleRecord[]
}

export interface CreateGuestRolePayload {
  name: string
}

export interface CreateGuestRoleResponse {
  success: boolean
  status: number
  message: string
  guestRole: GuestRoleRecord
}

export interface UpdateGuestRoleResponse {
  success: boolean
  status: number
  message: string
  guestRole: GuestRoleRecord
}

export interface DeleteGuestRoleResponse {
  success: boolean
  status: number
  message: string
}

export interface AddGuestsToRoleResponse {
  success: boolean
  status: number
  message: string
  guestRole: GuestRoleRecord
}

export interface RemoveGuestFromRoleResponse {
  success: boolean
  status: number
  message: string
  guestRole: GuestRoleRecord
}
