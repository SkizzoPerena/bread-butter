export const NOT_LOGGED_IN_TOAST_TITLE = "Oops you don't seem to be logged in"

export function notifyNotLoggedIn() {
  if (!import.meta.client) return
  const toast = useToast()
  toast.add({
    title: NOT_LOGGED_IN_TOAST_TITLE,
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
  '/partners/forgot-password'
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
