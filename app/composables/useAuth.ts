import { clearUserSessionData } from '~/composables/useUserSessionData'
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
import { normalizeReferralCode } from '~/utils/referralCode'

export type AuthRole = 'user' | 'partner' | 'admin'

export function isLegacyObjectIdToken(token: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(token.trim())
}

export function getTokenExpiration(token: string): number | null {
  try {
    const clean = token.replace(/^Bearer\s+/i, '').trim()
    const parts = clean.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiration(token)
  if (!exp) return false
  return Date.now() >= exp
}

export function isTokenExpiredOrExpiring(token: string, thresholdSeconds = 120): boolean {
  const exp = getTokenExpiration(token)
  if (!exp) return false
  return Date.now() >= exp - thresholdSeconds * 1000
}

export type RefreshSessionResult = 'success' | 'expired' | 'transient'

const TRANSIENT_REFRESH_RETRY_MS = 30_000
const refreshPromises: Partial<Record<AuthRole, Promise<RefreshSessionResult>>> = {}

export function getErrorStatus(error: unknown): number | undefined {
  const err = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  const status = err?.response?.status ?? err?.statusCode ?? err?.status
  return typeof status === 'number' ? status : undefined
}

export function isRefreshSessionExpiredError(error: unknown): boolean {
  return getErrorStatus(error) === 401
}

const silentRefreshTimers: Partial<Record<AuthRole, ReturnType<typeof setTimeout>>> = {}
let visibilityListenerAttached = false
const sessionEnsured: Partial<Record<AuthRole, boolean>> = {}
const ensurePromises: Partial<Record<AuthRole, Promise<boolean>>> = {}

export function cancelSilentRefresh(role: AuthRole = 'user') {
  if (silentRefreshTimers[role]) {
    clearTimeout(silentRefreshTimers[role])
    delete silentRefreshTimers[role]
  }
}

export function scheduleSilentRefresh(role: AuthRole = 'user', tokenOverride?: string | null) {
  if (!import.meta.client) return
  cancelSilentRefresh(role)

  const currentToken = tokenOverride || getStoredAccessToken(role)
  if (!currentToken) return

  const expTime = getTokenExpiration(currentToken)
  if (!expTime) return

  // Schedule refresh 2 minutes (120,000 ms) before expiration, or immediately if less than 2 mins left
  const bufferMs = 2 * 60 * 1000
  const timeUntilExp = expTime - Date.now()
  const delay = Math.max(0, timeUntilExp - bufferMs)

  silentRefreshTimers[role] = setTimeout(async () => {
    const { refreshSession } = useAuth(role)
    const result = await refreshSession()
    if (result === 'success') {
      scheduleSilentRefresh(role)
      return
    }
    if (result === 'transient') {
      silentRefreshTimers[role] = setTimeout(() => {
        scheduleSilentRefresh(role)
      }, TRANSIENT_REFRESH_RETRY_MS)
      return
    }
    if (import.meta.client) {
      const loginPath = role === 'partner' ? '/partners/login' : `/${role}/login`
      await navigateTo(loginPath)
    }
  }, delay)

  initVisibilityListener()
}

function initVisibilityListener() {
  if (!import.meta.client || visibilityListenerAttached) return
  visibilityListenerAttached = true

  const checkAndRefresh = () => {
    if (document.visibilityState === 'visible') {
      const roles: AuthRole[] = ['user', 'partner', 'admin']
      for (const role of roles) {
        const currentToken = getStoredAccessToken(role)
        if (currentToken && isTokenExpiredOrExpiring(currentToken, 120)) {
          const { refreshSession } = useAuth(role)
          refreshSession().then((result) => {
            if (result === 'success' || result === 'transient') {
              scheduleSilentRefresh(role)
              return
            }
            const loginPath = role === 'partner' ? '/partners/login' : `/${role}/login`
            navigateTo(loginPath)
          })
        }
      }
    }
  }

  document.addEventListener('visibilitychange', checkAndRefresh)
  window.addEventListener('focus', checkAndRefresh)
}

export function getAccessTokenStorageKey(role: AuthRole = 'user'): string {
  return `bpb_${role}_access_token`
}

/** @deprecated Use getAccessTokenStorageKey */
export function getSessionStorageKey(role: AuthRole = 'user'): string {
  return getAccessTokenStorageKey(role)
}

function readAccessToken(role: AuthRole): string | null {
  const key = getAccessTokenStorageKey(role)
  const fromLocal = localStorage.getItem(key)
  if (fromLocal) return fromLocal
  const fromSession = sessionStorage.getItem(key)
  if (fromSession) {
    localStorage.setItem(key, fromSession)
    sessionStorage.removeItem(key)
    return fromSession
  }
  return null
}

function writeAccessToken(role: AuthRole, token: string) {
  const key = getAccessTokenStorageKey(role)
  localStorage.setItem(key, token)
  sessionStorage.removeItem(key)
}

function removeAccessToken(role: AuthRole) {
  const key = getAccessTokenStorageKey(role)
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

export function getStoredAccessToken(role: AuthRole = 'user'): string | null {
  if (!import.meta.client) return null
  const rawToken = readAccessToken(role)
  if (!rawToken) return null
  const clean = rawToken.replace(/^Bearer\s+/i, '').trim()
  if (!clean || isLegacyObjectIdToken(clean)) {
    removeAccessToken(role)
    return null
  }
  return clean
}

export async function ensureSession(role: AuthRole = 'user'): Promise<boolean> {
  const { isUiOnlyMode } = useApiMode()
  const { restoreSession, isAuthenticated, syncSessionFromStorage } = useAuth(role)

  if (isUiOnlyMode.value) {
    syncSessionFromStorage()
    return isAuthenticated.value
  }

  if (sessionEnsured[role]) {
    return isAuthenticated.value
  }

  if (!ensurePromises[role]) {
    ensurePromises[role] = (async () => {
      try {
        await restoreSession()
        return isAuthenticated.value
      } finally {
        sessionEnsured[role] = true
        ensurePromises[role] = undefined
      }
    })()
  }

  return ensurePromises[role]!
}

export function useAuth(role: AuthRole = 'user') {
  const tokenStateKey = `auth-${role}-access-token`
  const userStateKey = `auth-${role}-user`

  const token = useState<string | null>(tokenStateKey, () => {
    return getStoredAccessToken(role)
  })

  // On client, ensure state is hydrated from persistent storage if available
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
      writeAccessToken(role, cleanToken)
      scheduleSilentRefresh(role, cleanToken)
    }
    if (newUser !== undefined) {
      user.value = newUser
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    sessionEnsured[role] = true
    if (import.meta.client) {
      removeAccessToken(role)
      cancelSilentRefresh(role)
    }
    if (role === 'user') {
      clearUserSessionData()
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
      setSession(
        `ui-only-${role}-token`,
        {
          email: credentials.email,
          firstName: role === 'partner' ? 'Partner' : 'Jane',
          lastName: 'User',
          gender: 'FEMALE'
        }
      )
      sessionEnsured[role] = true
      return null
    }

    clearSession()
    sessionEnsured[role] = true

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

    const normalizedReferral = credentials.referralCode
      ? normalizeReferralCode(credentials.referralCode)
      : ''

    const body: Record<string, string> = {
      email: credentials.email,
      password: credentials.password,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      gender: credentials.gender
    }

    if (normalizedReferral) {
      body.referralCode = normalizedReferral
    }

    const response = await apiRequest<AuthRegisterResponse>(`/${role}/register`, {
      method: 'POST',
      authenticated: false,
      body
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

  async function refreshSession(): Promise<RefreshSessionResult> {
    const { apiRequest, isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return token.value ? 'success' : 'expired'
    }

    if (refreshPromises[role]) {
      return refreshPromises[role]!
    }

    refreshPromises[role] = (async () => {
      try {
        const response = await apiRequest<AuthRefreshResponse>(`/${role}/auth/refresh`, {
          method: 'POST',
          authenticated: false
        })

        if (response?.accessToken) {
          setSession(response.accessToken)
          return 'success'
        }

        return 'transient'
      } catch (error) {
        if (isRefreshSessionExpiredError(error)) {
          clearSession()
          return 'expired'
        }
        return 'transient'
      } finally {
        delete refreshPromises[role]
      }
    })()

    return refreshPromises[role]!
  }

  async function restoreSession(): Promise<boolean> {
    const { isUiOnlyMode } = useApiMode()

    if (isUiOnlyMode.value) {
      return syncSessionFromStorage()
    }

    const stored = getStoredAccessToken(role)
    if (stored && !isTokenExpiredOrExpiring(stored, 60)) {
      if (syncSessionFromStorage()) {
        scheduleSilentRefresh(role, stored)
        return true
      }
    }

    const result = await refreshSession()
    if (result === 'success') {
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

    if (result === 'transient' && stored && !isTokenExpired(stored)) {
      if (syncSessionFromStorage()) {
        scheduleSilentRefresh(role, stored)
        return true
      }
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
    refreshSession,
    restoreSession,
    logout
  }
}
