<script setup lang="ts">
import type { GatheringRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { getProofSubmitPayload, type PaymentProofPanelExpose } from '~/utils/paymentMethod'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({ layout: 'signed-in-navbar' })
useHead({ title: 'Seating payment - Bread + Butter' })

const route = useRoute()
const toast = useToast()
const { isPaymongoActivated } = usePaymongoActivation()
const { getGathering, submitProof, createCheckout } = useSeating()

const gatheringId = computed(() => String(route.query.gatheringId || ''))
const gathering = ref<GatheringRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const proofPanel = ref<PaymentProofPanelExpose | null>(null)

onMounted(load)

async function load() {
  if (!gatheringId.value) {
    loading.value = false
    return
  }
  try {
    gathering.value = await getGathering(gatheringId.value)
    if (gathering.value.status === 'ACTIVE') {
      await navigateTo(`/seating/${gathering.value._id}`)
    }
  } catch (error) {
    toast.add({ title: 'Could not load seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function payWithProof() {
  if (!gathering.value) return
  const payload = getProofSubmitPayload(proofPanel.value)
  if (!payload) {
    toast.add({ title: 'Add your payment proof', description: 'Reference number and receipt image are required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    await submitProof(gathering.value._id, payload)
    toast.add({ title: 'Payment submitted', description: 'We will open the seating plan after it is approved.', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not submit payment', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function payWithCheckout() {
  if (!gathering.value) return
  saving.value = true
  try {
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
  <div class="bg-toast-700 min-h-screen">
    <UContainer class="py-8 max-w-xl space-y-4">
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
        v-else-if="!gathering"
        class="white-bread-container p-6 text-center"
      >
        This seating plan could not be found.
      </div>
      <div
        v-else
        class="space-y-4"
      >
        <div class="white-bread-container p-5 space-y-1">
          <p class="font-serif text-2xl font-bold">
            {{ gathering.name }}
          </p>
          <p>{{ gathering.packageName }} · up to {{ gathering.maxGuests }} guests</p>
          <p class="font-semibold">
            ₱{{ gathering.pricePhp.toLocaleString() }}
          </p>
          <p
            v-if="gathering.payment?.status === 'PENDING'"
            class="text-sm"
          >
            Payment is pending review.
          </p>
          <p
            v-if="gathering.payment?.status === 'DENIED'"
            class="text-sm"
          >
            The last payment was denied{{ gathering.payment.denialReason ? `: ${gathering.payment.denialReason}` : '.' }}
          </p>
          <p
            v-if="route.query.cancelled"
            class="text-sm"
          >
            Checkout was cancelled. You can try again.
          </p>
        </div>

        <PaymentCheckoutPanel
          v-if="isPaymongoActivated && gathering.payment?.status !== 'PENDING'"
          :amount-due="gathering.pricePhp"
          :loading="saving"
          submit-label="Pay with PayMongo"
          @submit="payWithCheckout"
        />
        <PaymentProofPanel
          v-else-if="gathering.payment?.status !== 'PENDING'"
          ref="proofPanel"
          :amount-due="gathering.pricePhp"
          :loading="saving"
          @submit="payWithProof"
        />
      </div>
    </UContainer>
  </div>
</template>
