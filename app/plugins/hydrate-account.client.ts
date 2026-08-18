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

  // If there's no access token, try restoring session via refresh cookie
  if (!token.value) {
    await restoreSession()
    return
  }

  // If we already have user details, skip.
  if (user.value?.email) {
    return
  }

  try {
    const { fetchAccount } = useAccount()
    await fetchAccount()
  } catch {
    // If the backend is asleep/unreachable, keep the token and let pages retry later.
  }
})

