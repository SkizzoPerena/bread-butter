export interface SubEventRecord {
  _id: string
  event: string
  name: string
  description?: string | null
  venue?: string | null
  eventDate?: string | null
}

export interface SubEventsListResponse {
  success: boolean
  status: number
  subEvents: SubEventRecord[]
}

export interface CreateSubEventPayload {
  eventId: string
  name: string
  description?: string
  venue?: string
  eventDate: string
}

export interface CreateSubEventResponse {
  success: boolean
  status: number
  message: string
  subEvent: SubEventRecord
}

export interface UpdateSubEventPayload {
  name?: string
  description?: string | null
  venue?: string | null
  eventDate?: string | null
}

export interface UpdateSubEventResponse {
  success: boolean
  status: number
  message: string
  subEvent: SubEventRecord
}

export interface DeleteSubEventResponse {
  success: boolean
  status: number
  message: string
}
