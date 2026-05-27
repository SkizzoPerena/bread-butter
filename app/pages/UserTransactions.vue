<script setup lang="ts">
import type { PaymentRecord } from '~/types/payment'
import { getApiErrorMessage } from '~/types/auth'
import { usePayments } from '~/composables/usePayments'

definePageMeta({
  layout: 'user-navbar',
})

const toast = useToast()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { getMyPayments } = usePayments()

const payments = ref<PaymentRecord[]>([])

onMounted(async () => {
  try {
    const response = await loadPageData({
      mock: () => ({ success: true, status: 200, payments: [] }),
      fetch: async () => getMyPayments(),
    })
    payments.value = response.payments
  } catch (error) {
    toast.add({ title: 'Could not load transactions', description: getApiErrorMessage(error), color: 'error' })
  }
})
</script>

<template>
  <UContainer class="space-y-6">
    <UPageHeader title="Transactions" description="Your payment history." />

    <UPageCard class="white-bread-container" title="Payments">
      <div v-if="isUiOnlyMode" class="text-sm text-muted">
        UI-only mode: no transactions to display.
      </div>
      <div v-else-if="payments.length === 0" class="text-sm text-muted">
        No transactions yet.
      </div>
      <div v-else class="space-y-3">
        <div v-for="p in payments" :key="p._id" class="flex items-start justify-between gap-4 border-b border-default pb-3">
          <div class="min-w-0">
            <div class="font-medium truncate">
              {{ typeof p.event === 'object' ? p.event.eventName : 'Event payment' }}
            </div>
            <div class="text-sm text-muted">
              {{ p.status }} • Php {{ p.amount.toLocaleString() }}
            </div>
          </div>
          <div class="text-sm text-muted text-right">
            {{ p.createdAt ? new Date(p.createdAt).toLocaleString() : '' }}
          </div>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>

