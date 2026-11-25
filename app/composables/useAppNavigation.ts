import type { RouteLocationRaw } from 'vue-router'

const STORAGE_KEY = 'bpb_page_history'

export const MAIN_EVENT_DASHBOARD_PATHS = [
  '/event/dashboard-butter',
  '/event/dashboard-bread',
  '/event/dashboard-bread-butter',
  '/event/dashboard-testing',
  '/user/event-dashboard',
]

export const ALL_DASHBOARD_PATHS = [
  '/',
  '/user/dashboard',
  ...MAIN_EVENT_DASHBOARD_PATHS,
]

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

  function getLastMatchingHistoryEntry(allowedPaths: string[]): string | null {
    const currentNorm = normalizeRoutePath(route.fullPath || route.path)
    const allowedSet = new Set(allowedPaths.map((p) => normalizeRoutePath(p)))

    for (let i = historyStack.value.length - 1; i >= 0; i--) {
      const entry = historyStack.value[i]
      if (!entry) continue
      const entryNorm = normalizeRoutePath(entry)
      if (entryNorm !== currentNorm && allowedSet.has(entryNorm)) {
        return entry
      }
    }
    return null
  }

  function getMostRecentEventDashboardTarget(eventId?: string): RouteLocationRaw {
    const recent = getLastMatchingHistoryEntry(MAIN_EVENT_DASHBOARD_PATHS)
    if (recent) {
      return recent
    }
    if (eventId) {
      return {
        path: '/event/dashboard-butter',
        query: { eventId },
      }
    }
    return '/'
  }

  async function navigateBackTo(target: RouteLocationRaw) {
    await startPageTransition(target)
  }

  return {
    historyStack,
    recordPageVisit,
    getPreviousDifferentPage,
    getLastMatchingHistoryEntry,
    getMostRecentEventDashboardTarget,
    goBackToPreviousPage,
    navigateBackTo,
  }
}
