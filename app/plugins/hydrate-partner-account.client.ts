export default defineNuxtPlugin(() => {
  const { token, user, restoreSession } = useAuth('partner')
  const { isUiOnlyMode } = useApiMode()

  const hydrated = useState<boolean>('auth-partner-hydrated', () => false)

  if (hydrated.value) {
    return
  }
  hydrated.value = true

  if (isUiOnlyMode.value) {
    return
  }

  const stored = getStoredAccessToken('partner')
  const activeRole = getActiveAuthRole()
  if (stored || activeRole === 'partner') {
    restoreSession().then(async () => {
      if (token.value && !user.value?.email) {
        try {
          const { fetchAccount } = usePartnerAccount()
          await fetchAccount()
        } catch {
          // Keep the token and let pages retry if the backend is unavailable.
        }
      }
    }).catch(() => {})
  }
})
