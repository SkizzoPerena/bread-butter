<script setup lang="ts">
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: 'signed-in-navbar', middleware: 'seating-enabled' })
useHead({ title: 'Seating payment received - Bread + Butter' })

const route = useRoute()
const { getCheckoutStatus, getGathering } = useSeating()
const { isUiOnlyMode } = useApiMode()

const status = ref<'loading' | 'approved' | 'processing' | 'error'>('loading')
const gatheringName = ref('')
const gatheringId = ref('')

onMounted(async () => {
  gatheringId.value = String(route.query.gatheringId || '')
  const checkoutId = String(route.query.checkout_id || route.query.checkoutId || '')
  try {
    if (isUiOnlyMode.value && gatheringId.value) {
      const gathering = await getGathering(gatheringId.value)
      gathering.status = 'ACTIVE'
      gatheringName.value = gathering.name
      status.value = 'approved'
      return
    }
    if (!checkoutId) {
      status.value = gatheringId.value ? 'processing' : 'error'
      return
    }
    const result = await getCheckoutStatus(checkoutId)
    gatheringName.value = result.gatheringName || ''
    gatheringId.value = String(result.gatheringId || gatheringId.value)
    status.value = result.payment?.status === 'APPROVED' || result.alreadyPaid ? 'approved' : 'processing'
  } catch (error) {
    status.value = 'error'
    useToast().add({ title: 'Could not confirm payment', description: getApiErrorMessage(error), color: 'error' })
  }
})
</script>

<template>
  <div class="bg-toast-700 min-h-screen pt-24 sm:pt-28 pb-10">
    <UContainer class="max-w-lg">
      <div class="white-bread-container p-8 space-y-4 text-center">
        <h1 class="text-3xl font-serif font-bold">
          {{ status === 'approved' ? 'Payment received' : status === 'processing' ? 'Payment processing' : status === 'error' ? 'Payment not confirmed' : 'Checking payment' }}
        </h1>
        <p v-if="gatheringName">
          {{ gatheringName }}
        </p>
        <p
          v-if="status === 'processing'"
          class="text-sm"
        >
          If you paid with a manual receipt, the seating plan opens after review.
        </p>
        <UButton
          v-if="status === 'approved' && gatheringId"
          :to="`/seating/${gatheringId}`"
        >
          Open seating plan
        </UButton>
        <UButton
          v-else
          to="/"
          variant="outline"
        >
          Back home
        </UButton>
      </div>
    </UContainer>
  </div>
</template>
