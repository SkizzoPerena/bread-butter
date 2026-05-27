export interface AuthUser {
  email: string
  firstName: string
  lastName: string
  gender: string
  profileImageURL?: string
}

export interface UserAccount {
  email: string
  firstName: string
  lastName: string
  gender: string
  profileImageURL?: string
  subscriptionLevel?: string
  contactNumber?: string
}

export interface AccountResponse {
  success: boolean
  account: UserAccount
}

export interface AccountUpdatePayload {
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
}

export interface AccountMessageResponse {
  success: boolean
  status?: number
  message: string
}

export interface AuthLoginResponse {
  success: boolean
  status: number
  token: string
  user?: AuthUser
  message: string
}

export interface AuthRegisterResponse {
  success: boolean
  status: number
  token: string
  message: string
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) {
      return data.message
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
