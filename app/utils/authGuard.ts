export const NOT_LOGGED_IN_TOAST_TITLE = "Oops you don't seem to be logged in"

export function notifyNotLoggedIn() {
  if (!import.meta.client) return
  const toast = useToast()
  toast.add({
    title: NOT_LOGGED_IN_TOAST_TITLE,
    color: 'warning'
  })
}

export function notifyWrongRoleAccess(expected: 'user' | 'partner') {
  if (!import.meta.client) return
  const toast = useToast()
  toast.add({
    title: expected === 'partner' ? 'Partner access only' : 'User access only',
    description:
      expected === 'partner'
        ? 'Switch to a partner account to open partner pages.'
        : 'Switch to a user account to open user pages.',
    color: 'warning'
  })
}

const PUBLIC_PATHS = new Set([
  '/',
  '/faqs',
  '/terms',
  '/contact-us',
  '/our-suppliers',
  '/our-bakery',
  '/bakery',
  '/ourbakery',
  '/suppliers',
  '/about',
  '/news-and-events',
  '/useful-tips',
  '/user/login',
  '/user/signup',
  '/user/otp',
  '/user/forgot-password',
  '/partners/login',
  '/partners/signup',
  '/partners/forgot-password',
  '/partners/otp',
  '/dough-makers/login',
  '/dough-makers/signup',
  '/doughmakers/login',
  '/doughmakers/signup',
  '/bakers/login',
  '/bakers/signup',
  '/baker/login',
  '/baker/signup',
  '/event/dashboard',
  '/event-dashboard'
])

const USER_AUTH_PUBLIC_PATHS = new Set([
  '/user/login',
  '/user/signup',
  '/user/otp',
  '/user/forgot-password'
])

const PARTNER_AUTH_PUBLIC_PATHS = new Set([
  '/partners/login',
  '/partners/signup',
  '/partners/forgot-password',
  '/partners/otp',
  '/dough-makers/login',
  '/dough-makers/signup',
  '/doughmakers/login',
  '/doughmakers/signup',
  '/bakers/login',
  '/bakers/signup',
  '/baker/login',
  '/baker/signup'
])

export function normalizeAuthPath(path: string): string {
  if (!path) return '/'
  const clean = path.split('?')[0]?.split('#')[0]?.trim().toLowerCase() || '/'
  return clean.replace(/\/+$/, '') || '/'
}

export function isPublicPath(path: string): boolean {
  const normalized = normalizeAuthPath(path)
  if (PUBLIC_PATHS.has(normalized)) return true
  if (normalized === '/our-suppliers' || normalized.startsWith('/our-suppliers/')) return true
  if (normalized === '/our-bakery' || normalized.startsWith('/our-bakery/')) return true
  if (normalized === '/bakery' || normalized.startsWith('/bakery/')) return true
  if (normalized === '/suppliers' || normalized.startsWith('/suppliers/')) return true
  if (normalized === '/ourbakery' || normalized.startsWith('/ourbakery/')) return true
  if (normalized.startsWith('/sites/')) return true
  if (normalized.startsWith('/rsvp/')) return true
  if (normalized.startsWith('/seat/')) return true
  if (normalized.startsWith('/attend/')) return true
  if (normalized.startsWith('/jam/')) return true
  return false
}

export function isPartnerPath(path: string): boolean {
  const normalized = normalizeAuthPath(path)
  return normalized === '/partners' || normalized.startsWith('/partners/')
}

export function isUserAuthPublicPath(path: string): boolean {
  const normalized = normalizeAuthPath(path)
  return USER_AUTH_PUBLIC_PATHS.has(normalized)
}

export function isPartnerAuthPublicPath(path: string): boolean {
  const normalized = normalizeAuthPath(path)
  return PARTNER_AUTH_PUBLIC_PATHS.has(normalized)
}

/** Authenticated user-only surfaces (not partner workspace or public auth). */
export function isUserExclusivePath(
  path: string,
  query: Record<string, unknown> | undefined = undefined
): boolean {
  const normalized = normalizeAuthPath(path)
  const roleQuery = typeof query?.role === 'string' ? query.role.trim().toLowerCase() : ''
  if (roleQuery === 'partner') return false

  if (normalized.startsWith('/user/') && !isUserAuthPublicPath(normalized)) return true
  if (normalized === '/event/dashboard' || normalized === '/event-dashboard') return false
  if (normalized.startsWith('/event/')) return true
  if (normalized.startsWith('/seating/')) return true
  return false
}

export function isPartnerEventWorkspace(
  path: string,
  query: Record<string, unknown> | undefined = undefined
): boolean {
  const normalized = normalizeAuthPath(path)
  const roleQuery = typeof query?.role === 'string' ? query.role.trim().toLowerCase() : ''
  if (roleQuery !== 'partner') return false
  return normalized === '/user/event-dashboard' || normalized.startsWith('/event/')
}
