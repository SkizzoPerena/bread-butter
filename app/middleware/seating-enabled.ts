export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { isUiOnlyMode } = useApiMode()
  if (isUiOnlyMode.value) return

  const { loadSeatingFeature } = useSeatingFeature()
  if (await loadSeatingFeature()) return

  const query = to.path.startsWith('/user/seating-payment') ? { from: 'payment' } : {}
  return navigateTo({ path: '/seating-unavailable', query }, { replace: true })
})
