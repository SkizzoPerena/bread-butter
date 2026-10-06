<script lang="ts" setup>
import {
  isSingleUnpaidEventAccount,
  buildUserPaymentQuery,
  getUiUnpaidEvent
} from '~/utils/paymentPendingGuard'

definePageMeta({
  layout: 'user-navbar',
})

const { isUiOnlyMode } = useApiMode()
const { fetchUserEvents } = useEvents()

onMounted(async () => {
  if (isUiOnlyMode.value) {
    const uiUnpaid = getUiUnpaidEvent()
    if (uiUnpaid) {
      await navigateTo({
        path: '/user/payment',
        query: uiUnpaid as Record<string, string>,
      }, { replace: true })
      return
    }
    return
  }

  const userOk = await ensureSession('user')
  if (userOk) {
    try {
      const events = await fetchUserEvents(true)
      if (events.length === 0) {
        await navigateTo('/user/create-event', { replace: true })
        return
      }
      if (isSingleUnpaidEventAccount(events)) {
        await navigateTo({
          path: '/user/payment',
          query: buildUserPaymentQuery(events[0]) as Record<string, string>,
        }, { replace: true })
        return
      }
    } catch {
      // Ignore network errors
    }
  }
})
</script>

<template>
  <UserEventsDashboard />
</template>
