export default defineNuxtPlugin(async () => {
  const { token, user } = useAuth()
  const { isUiOnlyMode } = useApiMode()

  // Avoid repeating the hydration across navigations/HMR.
  const hydrated = useState<boolean>('auth-user-hydrated', () => false)

  if (hydrated.value) {
    return
  }
  hydrated.value = true

  // If there's no token (or we're in UI-only mode), there's nothing to hydrate.
  if (!token.value || isUiOnlyMode.value) {
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

