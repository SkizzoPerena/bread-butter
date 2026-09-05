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
  '/user/login',
  '/user/signup',
  '/user/otp',
  '/user/forgot-password',
  '/partners/login',
  '/partners/signup',
  '/partners/forgot-password',
  '/partners/otp'
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
  '/partners/otp'
])

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true
  if (path.startsWith('/sites/')) return true
  if (path.startsWith('/rsvp/')) return true
  return false
}

export function isPartnerPath(path: string): boolean {
  return path === '/partners' || path.startsWith('/partners/')
}

export function isUserAuthPublicPath(path: string): boolean {
  return USER_AUTH_PUBLIC_PATHS.has(path)
}

export function isPartnerAuthPublicPath(path: string): boolean {
  return PARTNER_AUTH_PUBLIC_PATHS.has(path)
}

/** Authenticated user-only surfaces (not partner workspace or public auth). */
export function isUserExclusivePath(
  path: string,
  query: Record<string, unknown> | undefined = undefined
): boolean {
  const roleQuery = typeof query?.role === 'string' ? query.role.trim().toLowerCase() : ''
  if (roleQuery === 'partner') return false

  if (path.startsWith('/user/') && !isUserAuthPublicPath(path)) return true
  if (path.startsWith('/event/')) return true
  return false
}

export function isPartnerEventWorkspace(
  path: string,
  query: Record<string, unknown> | undefined = undefined
): boolean {
  const roleQuery = typeof query?.role === 'string' ? query.role.trim().toLowerCase() : ''
  if (roleQuery !== 'partner') return false
  return path === '/user/event-dashboard' || path.startsWith('/event/')
}
