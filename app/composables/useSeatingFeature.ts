interface PublicPlatformSettings {
  success: boolean
  seatingPlansEnabled: boolean
}

export function useSeatingFeature() {
  const { apiRequest, isUiOnlyMode } = useApiMode()
  const seatingPlansEnabled = useState('seating-plans-enabled', () => false)
  const seatingFeatureLoaded = useState('seating-plans-enabled-loaded', () => false)

  async function loadSeatingFeature() {
    if (isUiOnlyMode.value) {
      seatingPlansEnabled.value = false
      seatingFeatureLoaded.value = true
      return seatingPlansEnabled.value
    }
    try {
      const response = await apiRequest<PublicPlatformSettings>('/public/platform-settings', {
        authenticated: false,
      })
      seatingPlansEnabled.value = response.seatingPlansEnabled === true
    } catch {
      seatingPlansEnabled.value = false
    } finally {
      seatingFeatureLoaded.value = true
    }
    return seatingPlansEnabled.value
  }

  return { seatingPlansEnabled, seatingFeatureLoaded, loadSeatingFeature }
}
