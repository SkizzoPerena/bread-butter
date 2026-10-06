export default defineNuxtPlugin(() => {
  const { token, user, restoreSession } = useAuth()
  const { fetchAccount } = useAccount()
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

  // Do not block the first paint. A hung refresh or account request used to
  // leave the app on a blank page until the API answered.
  void restoreSession().then(async () => {
    if (token.value && !user.value?.email) {
      try {
        await fetchAccount()
      } catch {
        // If the backend is asleep/unreachable, keep the token and let pages retry later.
      }
    }
  })
})
