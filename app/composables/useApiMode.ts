import {
  handleRestrictedAccount,
  isRestrictedAccountError
} from '~/utils/restrictedAccount'
import {
  type AuthRole,
  getStoredAccessToken,
  isLegacyObjectIdToken,
  isTokenExpired,
  isTokenExpiredOrExpiring,
  useAuth
} from '~/composables/useAuth'

type FetchOptions = Parameters<typeof $fetch>[1]
type ApiRequestOptions = FetchOptions & { authenticated?: boolean; _isRetry?: boolean }
type MaybePromise<T> = T | Promise<T>

function joinApiUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function detectRoleFromPath(path: string): AuthRole {
  const clean = path.replace(/^\/?api\/?/, '/').replace(/^\//, '')
  if (clean.startsWith('partner') || clean.startsWith('partners')) return 'partner'
  if (clean.startsWith('admin')) return 'admin'
  return 'user'
}

function getBearerHeaders(role: AuthRole = 'user'): Record<string, string> {
  const stored = getStoredAccessToken(role)
  const token = stored || useAuth(role).token.value
  if (!token) return {}
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim()
  if (!cleanToken || isLegacyObjectIdToken(cleanToken)) return {}
  return { Authorization: `Bearer ${cleanToken}` }
}

function isAuthBypassPath(path: string): boolean {
  const cleanPath = path.split('?')[0]?.replace(/^\/?api\/?/, '/').replace(/^\//, '') || ''
  const bypasses = [
    'user/login',
    'user/register',
    'user/auth/refresh',
    'user/auth/logout',
    'user/otp/verify-email',
    'user/otp/generate',
    'user/otp/verify',
    'user/otp/resend',
    'user/otp/change-password',
    'partner/login',
    'partner/register',
    'partner/auth/refresh',
    'partner/auth/logout',
    'partner/otp/generate',
    'partner/otp/verify',
    'partner/otp/resend',
    'partner/otp/change-password',
    'partners/login',
    'partners/register',
    'partners/auth/refresh',
    'partners/auth/logout',
    'admin/login',
    'admin/auth/refresh',
    'admin/auth/logout'
  ]
  return bypasses.some((b) => cleanPath.startsWith(b))
}

function isAuthenticationError(error: any): boolean {
  const status = error?.response?.status ?? error?.statusCode ?? error?.status
  const errorMsg = String(
    error?.data?.message ||
    error?.response?._data?.message ||
    error?.message ||
    ''
  ).toLowerCase()

  return (
    status === 401 ||
    (status === 400 && (
      errorMsg.includes('authorization') ||
      errorMsg.includes('bearer') ||
      errorMsg.includes('token') ||
      errorMsg.includes('jwt')
    )) ||
    (status == null && (
      errorMsg.includes('use authorization') ||
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('jwt expired') ||
      errorMsg.includes('invalid token') ||
      errorMsg.includes('invalid or expired access token')
    ))
  )
}

/**
 * Global API vs UI-only mode.
 *
 * - UI-only (default): navigate and display pages without backend calls.
 * - Real API: call PYOW-Backend on button presses and page loads.
 *
 * Toggle with NUXT_PUBLIC_USE_REAL_API in `.env`.
 */
export function useApiMode() {
  const config = useRuntimeConfig()

  const useRealApi = computed(() => config.public.useRealApi)
  const isUiOnlyMode = computed(() => !config.public.useRealApi)
  const apiBase = computed(() => config.public.apiBase as string)

  async function performRefresh(role: AuthRole = 'user'): Promise<{ token: string | null; expired: boolean }> {
    const { refreshSession } = useAuth(role)
    const result = await refreshSession()
    if (result === 'success') {
      return { token: getStoredAccessToken(role) || useAuth(role).token.value, expired: false }
    }
    return { token: null, expired: result === 'expired' }
  }

  async function handleSessionExpired(role: AuthRole = 'user') {
    const { clearSession } = useAuth(role)
    clearSession()
    if (import.meta.client) {
      const toast = useToast()
      toast.add({
        title: 'Session expired',
        description: 'Please log in again.',
        color: 'warning'
      })
      const loginPath = role === 'partner' ? '/partners/login' : `/${role}/login`
      await navigateTo(loginPath)
    }
  }

  async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    if (!useRealApi.value) {
      throw new Error('apiRequest was called while NUXT_PUBLIC_USE_REAL_API is disabled')
    }

    const { authenticated = true, _isRetry = false, ...fetchOptions } = options ?? {}
    const role = detectRoleFromPath(path)

    const currentToken = getStoredAccessToken(role) || useAuth(role).token.value
    const expired = currentToken ? isTokenExpired(currentToken) : !getBearerHeaders(role).Authorization
    const isExpiring = currentToken ? isTokenExpiredOrExpiring(currentToken, 30) : false

    if (authenticated && !isAuthBypassPath(path) && (!getBearerHeaders(role).Authorization || isExpiring) && !_isRetry) {
      const refresh = await performRefresh(role)
      if (!refresh.token && refresh.expired && (expired || !currentToken)) {
        await handleSessionExpired(role)
      }
    }

    try {
      return await $fetch<T>(joinApiUrl(apiBase.value, path), {
        ...fetchOptions,
        credentials: 'include',
        headers: {
          ...(authenticated ? getBearerHeaders(role) : {}),
          ...(fetchOptions.headers as Record<string, string> | undefined)
        }
      })
    } catch (error: any) {
      if (isRestrictedAccountError(error) && getBearerHeaders(role).Authorization) {
        return handleRestrictedAccount()
      }

      if (isAuthenticationError(error) && !isAuthBypassPath(path) && !_isRetry) {
        const refresh = await performRefresh(role)
        if (refresh.token) {
          return apiRequest<T>(path, { ...options, _isRetry: true })
        }
        if (refresh.expired) {
          await handleSessionExpired(role)
        }
      }

      throw error
    }
  }

  async function apiUpload<T>(
    path: string,
    formData: FormData,
    options?: { method?: 'POST' | 'PATCH'; _isRetry?: boolean }
  ): Promise<T> {
    if (!useRealApi.value) {
      throw new Error('apiUpload was called while NUXT_PUBLIC_USE_REAL_API is disabled')
    }

    const role = detectRoleFromPath(path)

    const currentToken = getStoredAccessToken(role) || useAuth(role).token.value
    const expired = currentToken ? isTokenExpired(currentToken) : !getBearerHeaders(role).Authorization
    const isExpiring = currentToken ? isTokenExpiredOrExpiring(currentToken, 30) : false

    if ((!getBearerHeaders(role).Authorization || isExpiring) && !options?._isRetry) {
      const refresh = await performRefresh(role)
      if (!refresh.token && refresh.expired && (expired || !currentToken)) {
        await handleSessionExpired(role)
      }
    }

    try {
      return await $fetch<T>(joinApiUrl(apiBase.value, path), {
        method: options?.method ?? 'POST',
        body: formData,
        credentials: 'include',
        headers: getBearerHeaders(role)
      })
    } catch (error: any) {
      if (isRestrictedAccountError(error) && getBearerHeaders(role).Authorization) {
        return handleRestrictedAccount()
      }

      if (isAuthenticationError(error) && !isAuthBypassPath(path) && !options?._isRetry) {
        const refresh = await performRefresh(role)
        if (refresh.token) {
          return apiUpload<T>(path, formData, { ...options, _isRetry: true })
        }
        if (refresh.expired) {
          await handleSessionExpired(role)
        }
      }

      throw error
    }
  }

  /** Button / form handlers: API when enabled, otherwise UI-only fallback. */
  async function executeAction<T>(options: {
    api: () => Promise<T>
    uiOnly: () => MaybePromise<unknown>
    onApiSuccess?: (result: T) => MaybePromise<unknown>
  }): Promise<T | undefined> {
    if (isUiOnlyMode.value) {
      await options.uiOnly()
      return undefined
    }
    const result = await options.api()
    await options.onApiSuccess?.(result)
    return result
  }

  /** Page initialization: fetch from API or use local mock data. */
  async function loadPageData<T>(options: {
    fetch: () => Promise<T>
    mock: () => T | Promise<T>
  }): Promise<T> {
    if (isUiOnlyMode.value) {
      return options.mock()
    }
    return options.fetch()
  }

  return {
    useRealApi,
    isUiOnlyMode,
    apiBase,
    apiRequest,
    apiUpload,
    executeAction,
    loadPageData
  }
}
