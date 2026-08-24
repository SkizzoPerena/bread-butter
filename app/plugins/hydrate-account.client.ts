export default defineNuxtPlugin(async () => {
  const { token, user, restoreSession } = useAuth()
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

  // Restore session: checks stored token validity, schedules silent refresh or calls refresh endpoint
  await restoreSession()

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

