<script setup lang="ts">
import type { GatheringRecord, JamPackageRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { getProofSubmitPayload, type PaymentProofPanelExpose } from '~/utils/paymentMethod'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({ layout: 'signed-in-navbar', middleware: 'seating-enabled' })
useHead({ title: 'Seating payment - Bread + Butter' })

const route = useRoute()
const toast = useToast()
const { isPaymongoActivated } = usePaymongoActivation()
const { getGathering, createGathering, submitProof, submitDraftProof, createCheckout, listPackages } = useSeating()

const gatheringId = computed(() => String(route.query.gatheringId || ''))
const draft = computed(() => ({
  packageId: String(route.query.packageId || ''),
  name: String(route.query.name || ''),
  venue: String(route.query.venue || ''),
  eventDate: String(route.query.eventDate || ''),
}))
const gathering = ref<GatheringRecord | null>(null)
const draftPackage = ref<JamPackageRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const proofPanel = ref<PaymentProofPanelExpose | null>(null)

const summary = computed(() => {
  if (gathering.value) {
    return {
      name: gathering.value.name,
      packageName: gathering.value.packageName,
      maxGuests: gathering.value.maxGuests,
      pricePhp: gathering.value.pricePhp,
      payment: gathering.value.payment,
    }
  }
  if (draftPackage.value && draft.value.name) {
    return {
      name: draft.value.name,
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
    return
  }
  try {
    if (gatheringId.value) {
      gathering.value = await getGathering(gatheringId.value)
      if (gathering.value.status === 'ACTIVE') {
        await navigateTo(`/seating/${gathering.value._id}`)
      }
      return
    }
    const packages = await listPackages()
    draftPackage.value = packages.find((item) => item._id === draft.value.packageId) || null
  } catch (error) {
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
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
    if (gathering.value) {
      await submitProof(gathering.value._id, payload)
      toast.add({ title: 'Payment submitted', description: 'We will open the seating plan after it is approved.', color: 'success' })
      await load()
      return
    }
    if (!draftPackage.value) return
    const result = await submitDraftProof({
      packageId: draft.value.packageId,
      name: draft.value.name,
      venue: draft.value.venue,
      eventDate: draft.value.eventDate,
    }, payload)
    toast.add({ title: 'Payment submitted', description: 'We will open the seating plan after it is approved.', color: 'success' })
    await navigateTo({ path: '/user/seating-payment', query: { gatheringId: result.gatheringId } })
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
    if (!gathering.value) {
      gathering.value = await createGathering({
        packageId: draft.value.packageId,
        name: draft.value.name,
        venue: draft.value.venue,
        eventDate: draft.value.eventDate,
      })
      // Going back from checkout must reopen this plan, not create a second one.
      await navigateTo({ path: '/user/seating-payment', query: { gatheringId: gathering.value._id } }, { replace: true })
    }
    const checkout = await createCheckout(
      gathering.value._id,
      `/user/seating-payment?gatheringId=${gathering.value._id}&cancelled=1`,
    )
    if (checkout.alreadyPaid) {
      await navigateTo(`/seating/${gathering.value._id}`)
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
  <div class="bg-toast-700 min-h-screen pt-24 sm:pt-28 pb-10">
    <UContainer class="max-w-xl space-y-4">
      <h1 class="text-3xl font-bold font-serif text-bread-400 text-center">
        Pay for seating
      </h1>
      <div
        v-if="loading"
        class="text-white text-center"
      >
        Loading...
      </div>
      <div
        v-else-if="!summary"
        class="white-bread-container p-6 text-center"
      >
        This seating plan could not be found.
      </div>
      <div
        v-else
        class="space-y-4"
      >
        <div class="white-bread-container p-5 space-y-1">
          <div class="flex items-start justify-between gap-3">
            <p class="font-serif text-2xl font-bold">
              {{ summary.name }}
            </p>
            <UButton
              v-if="summary.payment?.status !== 'PENDING'"
              size="xs"
              variant="outline"
              :to="gathering
                ? { path: '/user/create-seating', query: { gatheringId: gathering._id } }
                : { path: '/user/create-seating', query: draft }"
            >
              Change package
            </UButton>
          </div>
          <p>{{ summary.packageName }} · up to {{ summary.maxGuests }} guests</p>
          <p class="font-semibold">
            ₱{{ summary.pricePhp.toLocaleString() }}
          </p>
          <p
            v-if="summary.payment?.status === 'PENDING'"
            class="text-sm"
          >
            Payment is pending review.
          </p>
          <p
            v-if="summary.payment?.status === 'DENIED'"
            class="text-sm"
          >
            The last payment was denied{{ summary.payment.denialReason ? `: ${summary.payment.denialReason}` : '.' }}
          </p>
          <p
            v-if="route.query.cancelled"
            class="text-sm"
          >
            Checkout was cancelled. You can try again.
          </p>
        </div>

        <PaymentCheckoutPanel
          v-if="isPaymongoActivated && summary.payment?.status !== 'PENDING'"
          :amount-due="summary.pricePhp"
          :loading="saving"
          submit-label="Pay with PayMongo"
          @submit="payWithCheckout"
        />
        <PaymentProofPanel
          v-else-if="summary.payment?.status !== 'PENDING'"
          ref="proofPanel"
          :amount-due="summary.pricePhp"
          :loading="saving"
          @submit="payWithProof"
        />
      </div>
    </UContainer>
  </div>
</template>
