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

export type AuthRole = 'user' | 'partner' | 'admin'

export function isLegacyObjectIdToken(token: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(token.trim())
}

export function getSessionStorageKey(role: AuthRole = 'user'): string {
  return `bpb_${role}_access_token`
}

export function getStoredAccessToken(role: AuthRole = 'user'): string | null {
  if (!import.meta.client) return null
  const rawToken = sessionStorage.getItem(getSessionStorageKey(role))
  if (!rawToken) return null
  const clean = rawToken.replace(/^Bearer\s+/i, '').trim()
  if (!clean || isLegacyObjectIdToken(clean)) {
    sessionStorage.removeItem(getSessionStorageKey(role))
    return null
  }
  return clean
}

export function useAuth(role: AuthRole = 'user') {
  const storageKey = getSessionStorageKey(role)
  const tokenStateKey = `auth-${role}-access-token`
  const userStateKey = `auth-${role}-user`

  const token = useState<string | null>(tokenStateKey, () => {
    return getStoredAccessToken(role)
  })

  // On client, ensure state is hydrated from sessionStorage if available
  if (import.meta.client && !token.value) {
    const stored = getStoredAccessToken(role)
    if (stored) {
      token.value = stored
    }
  }

  const user = useState<AuthUser | null>(userStateKey, () => null)

  const isAuthenticated = computed(() => Boolean(token.value))

  function syncSessionFromStorage(): boolean {
    if (!import.meta.client) return false
    const stored = getStoredAccessToken(role)
    if (stored) {
      token.value = stored
      return true
    }
    return false
  }

  function setSession(newToken: string, newUser?: AuthUser | null) {
    const cleanToken = newToken.replace(/^Bearer\s+/i, '').trim()
    token.value = cleanToken
    if (import.meta.client) {
      sessionStorage.setItem(storageKey, cleanToken)
    }
    if (newUser !== undefined) {
      user.value = newUser
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    if (import.meta.client) {
      sessionStorage.removeItem(storageKey)
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
        await apiRequest(`/${role}/auth/logout`, {
          method: 'POST',
          authenticated: false
        })
      } catch {
        // Clear session locally regardless of server response
      }
    }
    clearSession()
    const loginPath = role === 'partner' ? '/partners/login' : `/${role}/login`
    await navigateTo(loginPath)
  }

  async function login(credentials: LoginCredentials) {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return null
    }

    clearSession()

    const response = await apiRequest<AuthLoginResponse>(`/${role}/login`, {
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

    const response = await apiRequest<AuthRegisterResponse>(`/${role}/register`, {
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

    const response = await apiRequest<AuthVerifyEmailResponse>(`/${role}/otp/verify-email/${otpId}`, {
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

    // 1. If sessionStorage has a valid access token, sync and keep it
    if (syncSessionFromStorage()) {
      return true
    }

    // 2. If sessionStorage is empty, attempt refresh via httpOnly cookie
    try {
      const response = await apiRequest<AuthRefreshResponse>(`/${role}/auth/refresh`, {
        method: 'POST',
        authenticated: false
      })

      if (response?.accessToken) {
        setSession(response.accessToken)
        if (role === 'user') {
          try {
            const { fetchAccount } = useAccount()
            await fetchAccount()
          } catch {
            // Token is restored even if fetching account details fails
          }
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
    syncSessionFromStorage,
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
