import type { RouteLocationRaw } from 'vue-router'

const STORAGE_KEY = 'bpb_page_history'

export function normalizeRoutePath(url?: string | null): string {
  if (!url) return '/'
  try {
    const withoutHash = url.split('#')[0] || '/'
    const withoutQuery = withoutHash.split('?')[0] || '/'
    const trimmed = withoutQuery.replace(/\/+$/, '')
    return trimmed || '/'
  } catch {
    return '/'
  }
}

export function useAppNavigation() {
  const router = useRouter()
  const route = useRoute()
  const { startPageTransition } = usePageTransition()

  const historyStack = useState<string[]>('app_page_history_stack', () => {
    if (import.meta.client && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) return parsed
        }
      } catch {
        // ignore
      }
    }
    return []
  })

  function recordPageVisit(fullPath: string) {
    if (!fullPath) return

    // Avoid duplicate adjacent entries
    const lastEntry = historyStack.value[historyStack.value.length - 1]
    if (lastEntry === fullPath) return

    historyStack.value.push(fullPath)

    // Keep history stack bounded
    if (historyStack.value.length > 50) {
      historyStack.value.shift()
    }

    if (import.meta.client && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(historyStack.value))
      } catch {
        // ignore
      }
    }
  }

  function getPreviousDifferentPage(): string | null {
    const currentNorm = normalizeRoutePath(route.fullPath || route.path)

    for (let i = historyStack.value.length - 1; i >= 0; i--) {
      const entry = historyStack.value[i]
      if (entry && normalizeRoutePath(entry) !== currentNorm) {
        return entry
      }
    }

    if (import.meta.client && typeof window !== 'undefined' && window.history?.state?.back) {
      const backUrl = String(window.history.state.back)
      if (backUrl && normalizeRoutePath(backUrl) !== currentNorm) {
        return backUrl
      }
    }

    return null
  }

  async function goBackToPreviousPage(fallbackTarget?: RouteLocationRaw) {
    const currentNorm = normalizeRoutePath(route.fullPath || route.path)

    let targetIdx = -1
    for (let i = historyStack.value.length - 1; i >= 0; i--) {
      const entry = historyStack.value[i]
      if (entry && normalizeRoutePath(entry) !== currentNorm) {
        targetIdx = i
        break
      }
    }

    let targetUrl: string | null = null

    if (targetIdx !== -1) {
      targetUrl = historyStack.value[targetIdx]!
      // Truncate history stack so back navigation unwinds properly
      historyStack.value = historyStack.value.slice(0, targetIdx)
      if (import.meta.client && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(historyStack.value))
        } catch {
          // ignore
        }
      }
    } else if (import.meta.client && typeof window !== 'undefined' && window.history?.state?.back) {
      const backUrl = String(window.history.state.back)
      if (backUrl && normalizeRoutePath(backUrl) !== currentNorm) {
        targetUrl = backUrl
      }
    }

    const destination = targetUrl || fallbackTarget || '/'
    await startPageTransition(destination)
  }

  return {
    historyStack,
    recordPageVisit,
    getPreviousDifferentPage,
    goBackToPreviousPage,
  }
}
