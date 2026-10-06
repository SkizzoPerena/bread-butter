<script setup lang="ts">
import {
  isSinglePendingEventAccount,
  isSingleUnpaidEventAccount,
  buildPendingPaymentQuery,
  buildUserPaymentQuery,
  getUiPendingPayment,
  getUiUnpaidEvent
} from '~/utils/paymentPendingGuard'

definePageMeta({
  layout: false
})

useHead({
  link: [
    { rel: 'preload', href: '/images/hero-poster.webp', as: 'image', type: 'image/webp', fetchpriority: 'high' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=La+Belle+Aurore&display=swap' }
  ]
})

const { isAuthenticated, syncSessionFromStorage } = useAuth()
const { isUiOnlyMode } = useApiMode()
const { fetchUserEvents } = useEvents()

if (import.meta.client) {
  syncSessionFromStorage()
}

const activeRole = import.meta.client ? getActiveAuthRole() : null
const hasStoredUserToken = import.meta.client ? Boolean(getStoredAccessToken('user')) : false
const hasStoredPartnerToken = import.meta.client ? Boolean(getStoredAccessToken('partner')) : false
const hasAnyStoredSession = Boolean(activeRole || hasStoredUserToken || hasStoredPartnerToken)

// Anonymous visitors show LandingHome immediately with zero artificial loader delay
const authReady = ref(!hasAnyStoredSession)
const layoutName = computed(() => (isAuthenticated.value ? 'user-navbar' : 'landing-navbar'))

onMounted(async () => {
  if (!hasAnyStoredSession) {
    authReady.value = true
    return
  }

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
  }

  if (activeRole === 'partner') {
    const partnerOk = await ensureSession('partner')
    if (partnerOk) {
      await navigateTo('/partners', { replace: true })
      return
    }
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

  authReady.value = true
})
</script>

<template>
  <div
    v-if="!authReady"
    class="min-h-screen flex items-center justify-center bg-bread-400"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-700" />
  </div>
  <NuxtLayout v-else :name="layoutName">
    <UserEventsDashboard v-if="isAuthenticated" />
    <LandingHome v-else />
  </NuxtLayout>
</template>
