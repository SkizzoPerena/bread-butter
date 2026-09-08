export default defineNuxtPlugin(async () => {
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

  await restoreSession()

  if (token.value && !user.value?.email) {
    try {
      const { fetchAccount } = usePartnerAccount()
      await fetchAccount()
    } catch {
      // Keep the token and let pages retry if the backend is unavailable.
    }
  }
})
