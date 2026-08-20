export default defineNuxtPlugin(async () => {
  const { token, user, restoreSession, syncSessionFromStorage } = useAuth()
  const { isUiOnlyMode } = useApiMode()

  // Avoid repeating the hydration across navigations/HMR.
  const hydrated = useState<boolean>('auth-user-hydrated', () => false)

  if (hydrated.value) {
    return
  }
  hydrated.value = true

  if (isUiOnlyMode.value) {
    return
  }

  // First, check if sessionStorage has a valid access token and sync state
  const hasToken = syncSessionFromStorage()

  // If sessionStorage is empty, attempt restoring session via httpOnly refresh cookie
  if (!hasToken) {
    await restoreSession()
  }

  // If we have an access token but user details are not yet loaded, fetch account details
  if (token.value && !user.value?.email) {
    try {
      const { fetchAccount } = useAccount()
      await fetchAccount()
    } catch {
      // If the backend is asleep/unreachable, keep the token and let pages retry later.
    }
  }
})

