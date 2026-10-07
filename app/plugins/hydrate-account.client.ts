export default defineNuxtPlugin(() => {
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

  const stored = getStoredAccessToken('user')
  const activeRole = getActiveAuthRole()
  if (stored || activeRole === 'user') {
    restoreSession().then(async () => {
      if (token.value && !user.value?.email) {
        try {
          const { fetchAccount } = useAccount()
          await fetchAccount()
        } catch {
          // If the backend is asleep/unreachable, keep the token and let pages retry later.
        }
      }
    }).catch(() => {})
  }
})

