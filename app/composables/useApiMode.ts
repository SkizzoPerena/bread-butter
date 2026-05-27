type FetchOptions = Parameters<typeof $fetch>[1]
type MaybePromise<T> = T | Promise<T>

const AUTH_TOKEN_COOKIE = 'bpb_auth_token'

function joinApiUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function authHeaders(): Record<string, string> {
  const token = useCookie<string | null>(AUTH_TOKEN_COOKIE).value
  return token ? { Authorization: token } : {}
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

  async function apiRequest<T>(path: string, options?: FetchOptions): Promise<T> {
    if (!useRealApi.value) {
      throw new Error('apiRequest was called while NUXT_PUBLIC_USE_REAL_API is disabled')
    }
    return $fetch<T>(joinApiUrl(apiBase.value, path), {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options?.headers as Record<string, string> | undefined)
      }
    })
  }

  async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
    if (!useRealApi.value) {
      throw new Error('apiUpload was called while NUXT_PUBLIC_USE_REAL_API is disabled')
    }
    return $fetch<T>(joinApiUrl(apiBase.value, path), {
      method: 'POST',
      body: formData,
      headers: authHeaders()
    })
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
