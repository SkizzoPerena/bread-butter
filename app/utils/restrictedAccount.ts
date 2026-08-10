export const RESTRICTED_ACCOUNT_MESSAGE = 'Your account is restricted by the admin'

export class RestrictedAccountError extends Error {
  override readonly name = 'RestrictedAccountError'

  constructor() {
    super(RESTRICTED_ACCOUNT_MESSAGE)
  }
}

export function isRestrictedAccountError(error: unknown): boolean {
  if (error instanceof RestrictedAccountError) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as {
    statusCode?: number
    status?: number
    data?: { message?: string }
  }

  const status = err.statusCode ?? err.status
  if (status !== 401) {
    return false
  }

  return err.data?.message === RESTRICTED_ACCOUNT_MESSAGE
}

export function isSuppressedApiError(error: unknown): boolean {
  return error instanceof RestrictedAccountError
}

export async function handleRestrictedAccount(): Promise<never> {
  const handling = useState('auth-restricted-handling', () => false)

  if (handling.value) {
    throw new RestrictedAccountError()
  }

  handling.value = true

  const { clearSession } = useAuth()
  const toast = useToast()

  clearSession()
  await navigateTo('/user/login', { replace: true })

  toast.add({
    title: 'Account restricted',
    description: RESTRICTED_ACCOUNT_MESSAGE,
    color: 'error'
  })

  window.setTimeout(() => {
    handling.value = false
  }, 2000)

  throw new RestrictedAccountError()
}
