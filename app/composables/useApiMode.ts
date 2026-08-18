import {
  handleRestrictedAccount,
  isRestrictedAccountError
} from '~/utils/restrictedAccount'
import type { AuthRefreshResponse } from '~/types/auth'

type FetchOptions = Parameters<typeof $fetch>[1]
type ApiRequestOptions = FetchOptions & { authenticated?: boolean; _isRetry?: boolean }
type MaybePromise<T> = T | Promise<T>

let refreshPromise: Promise<string | null> | null = null

function joinApiUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function getBearerHeaders(): Record<string, string> {
  const { token } = useAuth()
  const rawToken = token.value || (import.meta.client ? sessionStorage.getItem('bpb_user_access_token') : null)
  if (!rawToken) return {}
  const bearerToken = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`
  return { Authorization: bearerToken }
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
    'user/otp/resend'
  ]
  return bypasses.some((b) => cleanPath.startsWith(b))
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

  async function performRefresh(): Promise<string | null> {
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = (async () => {
      try {
        const response = await $fetch<AuthRefreshResponse>(joinApiUrl(apiBase.value, '/user/auth/refresh'), {
          method: 'POST',
          credentials: 'include'
        })

        if (response?.accessToken) {
          const { setSession } = useAuth()
          setSession(response.accessToken)
          return response.accessToken
        }
      } catch {
        // Refresh failed
      } finally {
        refreshPromise = null
      }

      const { clearSession } = useAuth()
      clearSession()
      return null
    })()

    return refreshPromise
  }

  async function handleSessionExpired() {
    const { clearSession } = useAuth()
    clearSession()
    if (import.meta.client) {
      const toast = useToast()
      toast.add({
        title: 'Session expired',
        description: 'Please log in again.',
        color: 'warning'
      })
      await navigateTo('/user/login')
    }
  }

  async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    if (!useRealApi.value) {
      throw new Error('apiRequest was called while NUXT_PUBLIC_USE_REAL_API is disabled')
    }

    const { authenticated = true, _isRetry = false, ...fetchOptions } = options ?? {}

    try {
      return await $fetch<T>(joinApiUrl(apiBase.value, path), {
        ...fetchOptions,
        credentials: 'include',
        headers: {
          ...(authenticated ? getBearerHeaders() : {}),
          ...(fetchOptions.headers as Record<string, string> | undefined)
        }
      })
    } catch (error: any) {
      if (isRestrictedAccountError(error) && getBearerHeaders().Authorization) {
        return handleRestrictedAccount()
      }

      const status = error?.response?.status ?? error?.statusCode ?? error?.status
      if (status === 401 && !isAuthBypassPath(path) && !_isRetry) {
        const newToken = await performRefresh()
        if (newToken) {
          return apiRequest<T>(path, { ...options, _isRetry: true })
        } else {
          await handleSessionExpired()
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

    try {
      return await $fetch<T>(joinApiUrl(apiBase.value, path), {
        method: options?.method ?? 'POST',
        body: formData,
        credentials: 'include',
        headers: getBearerHeaders()
      })
    } catch (error: any) {
      if (isRestrictedAccountError(error) && getBearerHeaders().Authorization) {
        return handleRestrictedAccount()
      }

      const status = error?.response?.status ?? error?.statusCode ?? error?.status
      if (status === 401 && !isAuthBypassPath(path) && !options?._isRetry) {
        const newToken = await performRefresh()
        if (newToken) {
          return apiUpload<T>(path, formData, { ...options, _isRetry: true })
        } else {
          await handleSessionExpired()
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
