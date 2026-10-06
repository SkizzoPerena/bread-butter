<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useEvents } from '~/composables/useEvents'
import type { EventRecord } from '~/types/event'
import { isEventPendingVerification } from '~/utils/paymentPendingGuard'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Payment Pending - Bread + Butter',
})

const route = useRoute()
const { fetchUserEvents } = useEvents()
const fallbackEvent = ref<EventRecord | null>(null)

onMounted(async () => {
  const userOk = await ensureSession('user')
  if (userOk) {
    await navigateTo('/', { replace: true })
    return
  }

  if (!route.query.ref) {
    try {
      const events = await fetchUserEvents()
      const firstEvent = events[0]
      if (events.length === 1 && firstEvent && isEventPendingVerification(firstEvent)) {
        fallbackEvent.value = firstEvent
      }
    } catch {
      // Ignore network errors in pending display
    }
  }
})

const referenceNumber = computed(() => {
  if (typeof route.query.ref === 'string' && route.query.ref.trim()) {
    return route.query.ref.trim()
  }
  return fallbackEvent.value?.latestPayment?.transactionId || fallbackEvent.value?.latestPayment?._id || '—'
})

const eventName = computed(() => {
  if (typeof route.query.eventName === 'string' && route.query.eventName.trim()) {
    return route.query.eventName.trim()
  }
  return fallbackEvent.value?.eventName || 'My Celebration'
})

const packageName = computed(() => {
  if (typeof route.query.package === 'string' && route.query.package.trim()) {
    return route.query.package.replace(/-/g, ' ').toUpperCase()
  }
  const tier = fallbackEvent.value?.priceTier
  if (typeof tier === 'object' && tier?.name) return tier.name.toUpperCase()
  if (typeof tier === 'string') return tier.replace(/-/g, ' ').toUpperCase()
  return 'BREAD + BUTTER'
})

const paymentMethod = computed(() => {
  if (typeof route.query.method === 'string' && route.query.method.trim()) {
    return route.query.method.trim()
  }
  return fallbackEvent.value?.latestPayment?.paymentMethod || 'GCASH'
})
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 pt-24 sm:pt-28 pb-10 bg-toast-700 text-white">
    <UCard class="w-full max-w-sm sm:max-w-md mx-auto bread-container bg-bread-400 text-black shadow-lg rounded-xl"
      :ui="{ body: 'p-4 sm:p-5 flex flex-col items-center space-y-3.5 text-center w-full' }">

      <!-- Status Icon & Badge -->
      <div class="space-y-2 flex flex-col items-center justify-center">
        <div class="w-12 h-12 bg-toast-500/10 text-toast-600 rounded-full flex items-center justify-center">
          <UIcon name="i-lucide-clock" class="w-7 h-7 animate-pulse" />
        </div>

        <UBadge color="warning" variant="solid" size="sm" class="px-3 py-0.5 font-semibold rounded-full text-xs">
          Payment Pending Verification
        </UBadge>
      </div>

      <!-- Heading -->
      <div class="space-y-1 text-center">
        <h1 class="text-xl sm:text-2xl font-bold font-serif text-toast-900">
          We're heating the oven for you!
        </h1>
        <p class="text-xs text-toast-800 max-w-xs mx-auto">
          Your transaction has been submitted and is currently being verified by our admin team.
        </p>
      </div>

      <!-- Transaction Details Box -->
      <div class="w-full bg-white/80 p-3.5 rounded-xl border border-toast-600/20 text-left space-y-2 text-xs">
        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Reference Number</span>
          <span class="font-mono font-bold text-toast-900 text-sm">{{ referenceNumber }}</span>
        </div>

        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Event Name</span>
          <span class="font-bold text-toast-900">{{ eventName }}</span>
        </div>

        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Package Portion</span>
          <span class="font-bold text-toast-900">{{ packageName }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-toast-700 font-medium">Payment Method</span>
          <span class="font-bold text-toast-900">{{ paymentMethod }}</span>
        </div>
      </div>

      <!-- Instructions -->
      <div
        class="w-full text-[11px] text-toast-700 bg-toast-500/10 p-3 rounded-lg text-center space-y-0.5 leading-snug">
        <p class="font-bold text-toast-900">What happens next?</p>
        <p>• Once verified, your package features will activate automatically.</p>
        <p>• You will receive a confirmation notice via email with access details.</p>
      </div>

      <!-- Allowed User Actions -->
      <div class="w-full flex flex-col sm:flex-row items-center gap-2 pt-1">
        <UButton
          to="/user/transactions"
          block
          color="toast"
          variant="outline"
          size="sm"
          icon="i-lucide-receipt"
          class="font-semibold text-toast-900 border-toast-600/30 hover:bg-toast-500/10 flex-1"
        >
          View Transactions
        </UButton>
        <UButton
          to="/user/profile"
          block
          color="toast"
          variant="ghost"
          size="sm"
          icon="i-lucide-user-cog"
          class="font-semibold text-toast-900 hover:bg-toast-500/10 flex-1"
        >
          My Profile
        </UButton>
      </div>

    </UCard>
  </div>
</template>
