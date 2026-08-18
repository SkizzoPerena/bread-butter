import type {
  AuthLoginResponse,
  AuthRefreshResponse,
  AuthRegisterResponse,
  AuthUser,
  AuthVerifyEmailResponse,
  LoginCredentials,
  RegisterCredentials
} from '~/types/auth'
import { RestrictedAccountError } from '~/utils/restrictedAccount'

const SESSION_STORAGE_KEY = 'bpb_user_access_token'
const AUTH_USER_STATE_KEY = 'auth-user'

export function useAuth() {
  const token = useState<string | null>('auth-access-token', () => {
    if (import.meta.client) {
      return sessionStorage.getItem(SESSION_STORAGE_KEY)
    }
    return null
  })

  const user = useState<AuthUser | null>(AUTH_USER_STATE_KEY, () => null)

  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(newToken: string, newUser?: AuthUser | null) {
    token.value = newToken
    if (import.meta.client) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, newToken)
    }
    if (newUser) {
      user.value = newUser
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    if (import.meta.client) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  function updateUser(updates: Partial<AuthUser>) {
    user.value = user.value
      ? { ...user.value, ...updates }
      : (updates as AuthUser)
  }

  async function logout() {
    const { apiRequest, isUiOnlyMode } = useApiMode()
    if (!isUiOnlyMode.value) {
      try {
        await apiRequest('/user/auth/logout', {
          method: 'POST',
          authenticated: false
        })
      } catch {
        // Clear session locally regardless of server response
      }
    }
    clearSession()
    await navigateTo('/user/login')
  }

  async function login(credentials: LoginCredentials) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    clearSession()

    const response = await apiRequest<AuthLoginResponse>('/user/login', {
      method: 'POST',
      authenticated: false,
      body: {
        email: credentials.email.trim(),
        password: credentials.password
      }
    })

    if (response.user?.isRestricted === true) {
      clearSession()
      throw new RestrictedAccountError()
    }

    if (response.accessToken) {
      setSession(response.accessToken, response.user ?? null)
    }

    return response
  }

  async function register(credentials: RegisterCredentials) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    const response = await apiRequest<AuthRegisterResponse>('/user/register', {
      method: 'POST',
      authenticated: false,
      body: {
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        gender: credentials.gender
      }
    })

    return response
  }

  async function verifyEmail(otpId: string, pinCode: string) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    const response = await apiRequest<AuthVerifyEmailResponse>(`/user/otp/verify-email/${otpId}`, {
      method: 'PATCH',
      authenticated: false,
      body: { pinCode }
    })

    if (response.accessToken) {
      setSession(response.accessToken, response.user ?? null)
    }

    return response
  }

  async function restoreSession(): Promise<boolean> {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return false
    }

    if (token.value) {
      return true
    }

    try {
      const response = await apiRequest<AuthRefreshResponse>('/user/auth/refresh', {
        method: 'POST',
        authenticated: false
      })

      if (response.accessToken) {
        setSession(response.accessToken)
        try {
          const { fetchAccount } = useAccount()
          await fetchAccount()
        } catch {
          // If fetching account fails, token is still restored
        }
        return true
      }
    } catch {
      clearSession()
    }

    return false
  }

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    setSession,
    clearSession,
    updateUser,
    login,
    register,
    verifyEmail,
    restoreSession,
    logout
  }
}
