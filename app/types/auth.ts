import { RestrictedAccountError } from '~/utils/restrictedAccount'

export interface AuthUser {
  email: string
  firstName: string
  lastName: string
  gender: string
  profileImageURL?: string
  emailNotifEnabled?: boolean
  isRestricted?: boolean
}

export interface UserAccount {
  email: string
  firstName: string
  lastName: string
  gender: string
  profileImageURL?: string
  emailNotifEnabled?: boolean
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
  status?: number
  accessToken: string
  user?: AuthUser
  message: string
}

export interface AuthRegisterResponse {
  success: boolean
  status?: number
  otpId: string
  message?: string
}

export interface AuthVerifyEmailResponse {
  success: boolean
  status?: number
  accessToken: string
  user?: AuthUser
  message: string
}

export interface AuthRefreshResponse {
  success: boolean
  status?: number
  accessToken: string
  message?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
}

export function isSuppressedApiError(error: unknown): boolean {
  return error instanceof RestrictedAccountError
}

export function reportApiError(
  toast: ReturnType<typeof useToast>,
  options: {
    title: string
    error: unknown
    fallback?: string
    color?: 'error' | 'warning'
  }
) {
  if (isSuppressedApiError(options.error)) {
    return
  }

  toast.add({
    title: options.title,
    description: getApiErrorMessage(options.error, options.fallback),
    color: options.color ?? 'error'
  })
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isSuppressedApiError(error)) {
    return fallback
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string; errors?: string[] } }).data
    const firstError = data?.errors?.find((entry) => typeof entry === 'string' && entry.trim())
    if (firstError) {
      return firstError
    }
    if (data?.message) {
      return data.message
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
