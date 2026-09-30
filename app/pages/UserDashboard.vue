<script lang="ts" setup>
import {
  isSinglePendingEventAccount,
  isSingleUnpaidEventAccount,
  buildPendingPaymentQuery,
  buildUserPaymentQuery,
  getUiPendingPayment,
  getUiUnpaidEvent
} from '~/utils/paymentPendingGuard'

definePageMeta({
  layout: 'user-navbar',
})

const { isUiOnlyMode } = useApiMode()
const { fetchUserEvents } = useEvents()

onMounted(async () => {
  if (isUiOnlyMode.value) {
    const uiPending = getUiPendingPayment()
    if (uiPending) {
      await navigateTo({
        path: '/user/payment-pending',
        query: uiPending as Record<string, string>,
      }, { replace: true })
      return
    }
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
      const events = await fetchUserEvents()
      if (events.length === 0) {
        await navigateTo('/user/create-event', { replace: true })
        return
      }
      if (isSinglePendingEventAccount(events)) {
        await navigateTo({
          path: '/user/payment-pending',
          query: buildPendingPaymentQuery(events[0]) as Record<string, string>,
        }, { replace: true })
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
