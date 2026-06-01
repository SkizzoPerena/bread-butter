export type IssueStatus = 'PENDING' | 'INVESTIGATING' | 'CLOSED'

export interface CreateIssuePayload {
  title: string
  description: string
  supplementaryFile?: File | null
}

export interface CreateIssueResponse {
  success: boolean
  status: number
  message: string
}
