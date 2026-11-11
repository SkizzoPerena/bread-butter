<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { GatheringRecord } from '~/types/seating'
import {
  clearUiPendingSeatingPayment,
  isGatheringPendingVerification,
  isGatheringActive,
} from '~/utils/paymentPendingGuard'

definePageMeta({
  layout: 'jam-landing-navbar',
  hideFooter: true,
  middleware: 'seating-enabled',
})

useHead({
  title: 'Jam Payment Pending - Bread + Butter',
})

const route = useRoute()
const { listGatherings, getGathering } = useSeating()
const { finishPageTransition, startPageTransition } = usePageTransition()
const fallbackGathering = ref<GatheringRecord | null>(null)

const gatheringId = computed(() => {
  if (typeof route.query.gatheringId === 'string' && route.query.gatheringId.trim()) {
    return route.query.gatheringId.trim()
  }
  return fallbackGathering.value?._id || ''
})

onMounted(async () => {
  try {
    if (gatheringId.value) {
      const gathering = await getGathering(gatheringId.value).catch(() => null)
      if (gathering) {
        fallbackGathering.value = gathering
        if (isGatheringActive(gathering)) {
          clearUiPendingSeatingPayment()
          await startPageTransition({
            path: '/user/seating-payment/success',
            query: { gatheringId: gathering._id },
          })
          return
        }
      }
    } else {
      const gatherings = await listGatherings().catch(() => [])
      const pending = gatherings.find((g) => isGatheringPendingVerification(g))
      if (pending) {
        fallbackGathering.value = pending
      }
    }
  } catch {
    // Ignore network errors in pending display
  } finally {
    finishPageTransition()
  }
})

const referenceNumber = computed(() => {
  if (typeof route.query.ref === 'string' && route.query.ref.trim()) {
    return route.query.ref.trim()
  }
  return fallbackGathering.value?.payment?.transactionId || fallbackGathering.value?.payment?._id || '—'
})

const gatheringName = computed(() => {
  if (typeof route.query.name === 'string' && route.query.name.trim()) {
    return route.query.name.trim()
  }
  return fallbackGathering.value?.name || 'My Jam Gathering'
})

const packageName = computed(() => {
  if (typeof route.query.package === 'string' && route.query.package.trim()) {
    return route.query.package.toUpperCase()
  }
  return fallbackGathering.value?.packageName?.toUpperCase() || 'STRAWBERRY'
})

const paymentMethod = computed(() => {
  if (typeof route.query.method === 'string' && route.query.method.trim()) {
    return route.query.method.trim().toUpperCase()
  }
  return fallbackGathering.value?.payment?.paymentMethod?.toUpperCase() || 'GCASH'
})
</script>

<template>
  <div
    class="min-h-screen pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 flex flex-col items-center justify-center bg-jam-800 text-white">
    <div class="w-full max-w-sm sm:max-w-md mx-auto">
      <UCard class="w-full bread-container bg-bread-400 text-black shadow-lg rounded-xl"
        :ui="{ body: 'p-4 sm:p-5 flex flex-col items-center space-y-3.5 text-center w-full' }">

        <!-- Status Icon & Badge -->
        <div class="space-y-2 flex flex-col items-center justify-center">
          <div class="w-12 h-12 bg-jam-900/10 text-jam-800 rounded-full flex items-center justify-center">
            <UIcon name="i-lucide-clock" class="w-7 h-7 animate-pulse text-amber-700" />
          </div>

          <UBadge color="warning" variant="solid" size="sm" class="px-3 py-0.5 font-semibold rounded-full text-xs">
            Payment Pending Verification
          </UBadge>
        </div>

        <!-- Heading -->
        <div class="space-y-1 text-center">
          <h1 class="text-xl sm:text-2xl font-bold font-serif text-jam-900">
            Spreading the Jam for you!
          </h1>
          <p class="text-xs text-jam-800 max-w-xs mx-auto">
            Your transaction has been submitted and is currently being verified by our admin team.
          </p>
        </div>

        <!-- Transaction Details Box (Matches Event Pending Layout) -->
        <div class="w-full bg-white/80 p-3.5 rounded-xl border border-jam-700/20 text-left space-y-2 text-xs">
          <div class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Reference Number</span>
            <span class="font-mono font-bold text-jam-950 text-sm">{{ referenceNumber }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Gathering Name</span>
            <span class="font-bold text-jam-950 truncate max-w-[180px]">{{ gatheringName }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-jam-700/10 pb-1.5">
            <span class="text-jam-700 font-medium">Package Tier</span>
            <span class="font-bold text-jam-950">{{ packageName }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-jam-700 font-medium">Payment Method</span>
            <span class="font-bold text-jam-950">{{ paymentMethod }}</span>
          </div>
        </div>

        <!-- Instructions Box -->
        <div class="w-full text-[11px] text-jam-800 bg-jam-900/10 p-3 rounded-lg text-center space-y-0.5 leading-snug">
          <p class="font-bold text-jam-900">What happens next?</p>
          <p>• Once verified, your guest list, tables, RSVP, and check-in will activate automatically.</p>
          <p>• You will receive a confirmation notice via email once approved.</p>
        </div>

        <!-- Allowed User Actions -->
        <div class="w-full flex flex-col sm:flex-row items-center gap-2 pt-1">
          <UButton to="/user/transactions" block color="neutral" variant="outline" size="sm" icon="i-lucide-receipt"
            class="font-semibold text-jam-900 border-jam-700/30 hover:bg-jam-900/10 flex-1">
            View Transactions
          </UButton>
          <UButton to="/user/profile" block color="neutral" variant="ghost" size="sm" icon="i-lucide-user-cog"
            class="font-semibold text-jam-900 hover:bg-jam-900/10 flex-1">
            My Profile
          </UButton>
        </div>

      </UCard>
    </div>
  </div>
</template>
