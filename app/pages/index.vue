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
  ],
  script: [
    {
      innerHTML: `try{if(localStorage.getItem('bpb_auth_role')||localStorage.getItem('bpb_user_token')||localStorage.getItem('bpb_partner_token')){document.documentElement.classList.add('has-stored-session');}}catch(e){}`,
      tagPosition: 'head'
    }
  ],
  style: [
    {
      innerHTML: `html.has-stored-session #auth-checking-overlay{display:flex!important;}`
    }
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

// Show loading overlay only while verifying an existing stored session
const isCheckingAuth = ref(import.meta.client ? hasAnyStoredSession : false)
const layoutName = computed(() => (isAuthenticated.value ? 'user-navbar' : 'landing-navbar'))

function clearAuthCheckingState() {
  if (import.meta.client) {
    document.documentElement.classList.remove('has-stored-session')
  }
  isCheckingAuth.value = false
}

onMounted(async () => {
  if (!hasAnyStoredSession) {
    clearAuthCheckingState()
    return
  }

  try {
    if (isUiOnlyMode.value) {
      const uiPending = getUiPendingPayment()
      if (uiPending) {
        clearAuthCheckingState()
        await navigateTo({
          path: '/user/payment-pending',
          query: uiPending as Record<string, string>,
        }, { replace: true })
        return
      }
      const uiUnpaid = getUiUnpaidEvent()
      if (uiUnpaid) {
        clearAuthCheckingState()
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
        clearAuthCheckingState()
        await navigateTo('/partners', { replace: true })
        return
      }
    }

    const userOk = await ensureSession('user')
    if (userOk) {
      try {
        const events = await fetchUserEvents()
        if (events.length === 0) {
          clearAuthCheckingState()
          await navigateTo('/user/create-event', { replace: true })
          return
        }
        if (isSinglePendingEventAccount(events)) {
          clearAuthCheckingState()
          await navigateTo({
            path: '/user/payment-pending',
            query: buildPendingPaymentQuery(events[0]) as Record<string, string>,
          }, { replace: true })
          return
        }
        if (isSingleUnpaidEventAccount(events)) {
          clearAuthCheckingState()
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
  } finally {
    clearAuthCheckingState()
  }
})
</script>

<template>
  <NuxtLayout :name="layoutName">
    <UserEventsDashboard v-if="isAuthenticated" />
    <LandingHome v-else />
  </NuxtLayout>

  <!-- Auth Checking Loading Overlay -->
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isCheckingAuth"
      id="auth-checking-overlay"
      class="fixed inset-0 z-100 flex flex-col items-center justify-center bg-bread-400/95 dark:bg-toast-950/95 backdrop-blur-xs select-none"
    >
      <div class="flex flex-col items-center gap-4 text-center px-4">
        <!-- Spinner & Brand Icon -->
        <div class="relative flex items-center justify-center">
          <div class="w-16 h-16 rounded-2xl bg-bread-300/80 dark:bg-toast-900 flex items-center justify-center shadow-inner">
            <UIcon name="i-lucide-sparkles" class="w-7 h-7 text-toast-800 dark:text-toast-200 animate-pulse" />
          </div>
          <div class="absolute -inset-1.5 rounded-2xl border-2 border-toast-400/30 border-t-toast-800 dark:border-t-toast-200 animate-spin" />
        </div>

        <div class="space-y-1">
          <h2 class="font-serif text-xl font-bold text-toast-900 dark:text-toast-100 tracking-wide">
            Bread &amp; Butter
          </h2>
          <p class="text-xs font-medium text-toast-600 dark:text-toast-400">
            Checking your session...
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
