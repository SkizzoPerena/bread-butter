<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { GatheringRecord, JamPackageRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { getProofSubmitPayload, type PaymentProofPanelExpose } from '~/utils/paymentMethod'
import {
  setUiPendingSeatingPayment,
  isGatheringPendingVerification,
} from '~/utils/paymentPendingGuard'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({ layout: false, middleware: 'seating-enabled' })
useHead({ title: 'Jam Payment - Bread + Butter' })

const route = useRoute()
const toast = useToast()
const { isPaymongoActivated } = usePaymongoActivation()
const { startPageTransition, finishPageTransition } = usePageTransition()
const { getGathering, createGathering, submitProof, submitDraftProof, createCheckout, listPackages } = useSeating()

const gatheringId = computed(() => String(route.query.gatheringId || ''))
const draft = computed(() => ({
  packageId: String(route.query.packageId || ''),
  name: String(route.query.name || ''),
  eventType: String(route.query.eventType || 'WEDDING'),
  venue: String(route.query.venue || ''),
  eventDate: String(route.query.eventDate || ''),
}))
const gathering = ref<GatheringRecord | null>(null)
const draftPackage = ref<JamPackageRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const proofPanel = ref<PaymentProofPanelExpose | null>(null)

const formattedEventDate = computed(() => {
  const rawDate = gathering.value?.eventDate || draft.value.eventDate
  if (!rawDate) return ''
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

const summary = computed(() => {
  if (gathering.value) {
    return {
      name: gathering.value.name,
      venue: gathering.value.venue,
      eventDate: gathering.value.eventDate,
      packageName: gathering.value.packageName,
      maxGuests: gathering.value.maxGuests,
      pricePhp: gathering.value.pricePhp,
      payment: gathering.value.payment,
    }
  }
  if (draftPackage.value && draft.value.name) {
    return {
      name: draft.value.name,
      venue: draft.value.venue,
      eventDate: draft.value.eventDate,
      packageName: draftPackage.value.name,
      maxGuests: draftPackage.value.maxGuests,
      pricePhp: draftPackage.value.pricePhp,
      payment: null,
    }
  }
  return null
})

onMounted(load)

async function load() {
  if (!gatheringId.value && !draft.value.packageId) {
    loading.value = false
    finishPageTransition()
    return
  }
  try {
    if (gatheringId.value) {
      gathering.value = await getGathering(gatheringId.value)
      if (gathering.value.status === 'ACTIVE' || gathering.value.payment?.status === 'APPROVED') {
        await startPageTransition(`/jam/dashboard/${gathering.value._id}`)
        return
      }
      if (isGatheringPendingVerification(gathering.value)) {
        await startPageTransition({
          path: '/user/seating-payment/pending',
          query: {
            gatheringId: gathering.value._id,
            ref: gathering.value.payment?.transactionId || '',
            name: gathering.value.name,
            package: gathering.value.packageName,
            method: gathering.value.payment?.paymentMethod || '',
          },
        })
        return
      }
      return
    }
    const packages = await listPackages()
    draftPackage.value = packages.find((item) => item._id === draft.value.packageId) || null
  } catch (error) {
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
    finishPageTransition()
  }
}

async function payWithProof() {
  const payload = getProofSubmitPayload(proofPanel.value)
  if (!payload) {
    toast.add({ title: 'Add your payment proof', description: 'Reference number and receipt image are required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    let finalGatheringId = gathering.value?._id || ''
    const finalTransactionId = payload.transactionId
    const finalMethod = payload.paymentMethod
    const finalName = summary.value?.name || 'My Gathering'
    const finalPackageName = summary.value?.packageName || 'Jam Package'

    if (gathering.value) {
      await submitProof(gathering.value._id, payload)
    } else if (draftPackage.value) {
      const result = await submitDraftProof({
        packageId: draft.value.packageId,
        name: draft.value.name,
        eventType: draft.value.eventType,
        venue: draft.value.venue,
        eventDate: draft.value.eventDate,
      }, payload)
      finalGatheringId = result.gatheringId
    }

    setUiPendingSeatingPayment({
      gatheringId: finalGatheringId,
      ref: finalTransactionId,
      name: finalName,
      package: finalPackageName,
      method: finalMethod,
    })

    toast.add({
      title: 'Proof of Payment Submitted',
      description: 'Your payment transaction is currently being verified.',
      color: 'success',
    })

    await startPageTransition({
      path: '/user/seating-payment/pending',
      query: {
        gatheringId: finalGatheringId,
        ref: finalTransactionId,
        name: finalName,
        package: finalPackageName,
        method: finalMethod,
      },
    })
  } catch (error) {
    toast.add({ title: 'Could not submit payment', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function payWithCheckout() {
  if (!gathering.value && !draftPackage.value) return
  saving.value = true
  try {
    if (!gathering.value && draftPackage.value) {
      gathering.value = await createGathering({
        packageId: draft.value.packageId,
        name: draft.value.name,
        eventType: draft.value.eventType,
        venue: draft.value.venue,
        eventDate: draft.value.eventDate,
      })
      // Going back from checkout reopens this plan
      await navigateTo({ path: '/user/seating-payment', query: { gatheringId: gathering.value._id } }, { replace: true })
    }
    if (!gathering.value) return

    const checkout = await createCheckout(
      gathering.value._id,
      `/user/seating-payment?gatheringId=${gathering.value._id}&cancelled=1`,
    )
    if (checkout.alreadyPaid) {
      await startPageTransition({
        path: '/user/seating-payment/success',
        query: { gatheringId: gathering.value._id },
      })
      return
    }
    if (checkout.checkoutUrl) {
      window.location.assign(checkout.checkoutUrl)
      return
    }
    toast.add({ title: 'Checkout did not start', color: 'error' })
  } catch (error) {
    toast.add({ title: 'Could not start checkout', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen py-12 sm:py-16 md:py-20 px-4 flex flex-col items-center justify-center bg-jam-800 text-white">
    <div class="max-w-3xl w-full mx-auto space-y-6">

      <!-- Brand Logo -->
      <div class="flex justify-center mb-1">
        <NuxtLink to="/jam" aria-label="Jam by Bread + Butter">
          <img src="~/assets/bpb-icons/Jam Logos-01.png" alt="Jam Logo" class="h-9 sm:h-10 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" />
        </NuxtLink>
      </div>

      <!-- Page Header -->
      <div class="text-center space-y-1.5">
        <UBadge color="bread" variant="soft" size="sm"
          class="px-3 py-0.5 font-semibold rounded-full text-jam-950 bg-bread-400 text-xs">
          Jam Checkout & Payment
        </UBadge>
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-bread-400">
          Complete Your Order
        </h1>
        <p class="text-xs text-bread-200">
          {{ isPaymongoActivated
            ? 'Review your order, then continue to PayMongo to complete payment.'
            : 'Review your order, then scan the QR and upload your proof of payment.' }}
        </p>
      </div>

      <!-- Loading / Not Found State -->
      <div v-if="loading" class="text-white text-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-bread-400" />
        <p class="text-sm text-bread-200">Loading your seating order...</p>
      </div>

      <div v-else-if="!summary" class="bread-container bg-bread-400 text-jam-950 p-6 text-center max-w-md mx-auto space-y-3">
        <h2 class="text-xl font-serif font-bold text-jam-900">Seating Plan Not Found</h2>
        <p class="text-xs text-jam-800">We could not load details for this seating plan. Please start from setup.</p>
        <UButton to="/user/create-seating" color="primary" size="sm" class="font-bold text-white bg-jam-900 hover:bg-jam-950">
          Start a Jam Plan
        </UButton>
      </div>

      <!-- Main 12-col Container (5 cols summary, 7 cols payment) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

        <!-- Left Side: Order Summary Card -->
        <div class="bread-container bg-bread-400 text-jam-950 p-4 sm:p-5 md:col-span-5 space-y-4">
          <h2 class="text-lg font-bold font-serif text-jam-900 border-b border-jam-700/20 pb-2">
            Order Summary
          </h2>

          <div class="space-y-3">
            <!-- Gathering Details Summary -->
            <div class="bg-white/80 p-3 rounded-xl border border-jam-700/20 space-y-2 text-xs">
              <div class="space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <span class="text-[10px] text-jam-700 font-semibold block uppercase">Gathering Name</span>
                    <p class="font-bold text-jam-950 text-sm truncate">{{ summary.name || 'Untitled Gathering' }}</p>
                  </div>
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-pencil"
                    class="shrink-0 font-semibold cursor-pointer text-jam-900 bg-jam-900/10 hover:bg-jam-900/20"
                    :to="gathering
                      ? { path: '/user/create-seating', query: { gatheringId: gathering._id } }
                      : { path: '/user/create-seating', query: draft }"
                  >
                    Edit Setup
                  </UButton>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <span class="text-[10px] text-jam-700 font-semibold block uppercase">Date</span>
                    <p class="font-medium text-jam-950">{{ formattedEventDate || '—' }}</p>
                  </div>
                  <div>
                    <span class="text-[10px] text-jam-700 font-semibold block uppercase">Venue</span>
                    <p class="font-medium text-jam-950 truncate" :title="summary.venue">{{ summary.venue || '—' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Package Selection Box -->
            <div class="bg-white/80 p-3 rounded-xl border border-jam-700/20 space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-serif font-bold text-base text-jam-950">{{ summary.packageName }}</span>
                <UBadge color="neutral" variant="subtle" size="xs" class="bg-jam-800 text-white font-semibold">Selected</UBadge>
              </div>
              <p class="text-xs text-jam-800 leading-snug">
                Up to {{ summary.maxGuests }} guests · Tables, RSVP & check-in
              </p>
            </div>

            <!-- Cancelled or Denied Notices -->
            <div v-if="route.query.cancelled" class="p-2.5 rounded-lg bg-amber-500/15 border border-amber-600/30 text-amber-950 text-xs">
              Checkout was cancelled. You can try again or scan the QR code to submit proof.
            </div>
            <div v-if="summary.payment?.status === 'DENIED'" class="p-2.5 rounded-lg bg-red-500/15 border border-red-600/30 text-red-950 text-xs">
              Previous payment was denied{{ summary.payment.denialReason ? `: ${summary.payment.denialReason}` : '.' }} Please upload a valid receipt.
            </div>

            <!-- Price Breakdown -->
            <div class="space-y-1.5 pt-1.5 text-xs border-t border-jam-700/20">
              <div class="flex justify-between text-jam-800">
                <span>Standard Rate</span>
                <span class="line-through">₱{{ (summary.pricePhp * 2).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-jam-800">
                <span>Package total</span>
                <span class="font-semibold text-jam-950">₱{{ summary.pricePhp.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-jam-950 text-sm pt-1 border-t border-jam-700/10">
                <span>Amount due</span>
                <span class="text-jam-900 font-serif text-lg">₱{{ summary.pricePhp.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Payment Panel -->
        <div class="md:col-span-7">
          <PaymentCheckoutPanel
            v-if="isPaymongoActivated"
            :amount-due="summary.pricePhp"
            :loading="saving"
            submit-label="Pay with PayMongo"
            @submit="payWithCheckout"
          />
          <PaymentProofPanel
            v-else
            ref="proofPanel"
            :amount-due="summary.pricePhp"
            :loading="saving"
            @submit="payWithProof"
          />
        </div>

      </div>

    </div>
  </div>
</template>
