export default defineNuxtPlugin(() => {
  const { token, user, restoreSession } = useAuth('partner')
  const { fetchAccount } = usePartnerAccount()
  const { isUiOnlyMode } = useApiMode()

  const hydrated = useState<boolean>('auth-partner-hydrated', () => false)

  if (hydrated.value) {
    return
  }
  hydrated.value = true

  if (isUiOnlyMode.value) {
    return
  }

  void restoreSession().then(async () => {
    if (token.value && !user.value?.email) {
      try {
        await fetchAccount()
      } catch {
        // Keep the token and let pages retry if the backend is unavailable.
      }
    }
  })
})
