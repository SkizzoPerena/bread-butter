<script setup lang="ts">
import type { PaymentRecord, PaymentStatus, RefundStatus } from '~/types/payment'
import { formatPaymentPurpose } from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { usePayments } from '~/composables/usePayments'

definePageMeta({
  layout: 'partner-navbar'
})

const toast = useToast()
const { isUiOnlyMode, loadPageData } = useApiMode()
const { getMyPayments } = usePayments()

const payments = ref<PaymentRecord[]>([])

const paymentStatusColor: Record<PaymentStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error'
}

const refundStatusColor: Record<RefundStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error'
}

interface PaymentEntry {
  id: string
  kind: 'payment'
  eventName: string
  purpose: string
  status: PaymentStatus
  amount: number
  expectedAmount: number
  isOverpaid: boolean
  isUnderpaid: boolean
  proofOfPaymentURL?: string
  date?: string
}

interface RefundEntry {
  id: string
  kind: 'refund'
  eventName: string
  purpose: string
  status: RefundStatus
  amount: number
  reason?: string
  date?: string
}

type TransactionEntry = PaymentEntry | RefundEntry

const transactions = computed<TransactionEntry[]>(() => {
  const entries: TransactionEntry[] = []

  for (const p of payments.value) {
    const eventName = typeof p.event === 'object' ? p.event.eventName : 'Event payment'
    const paidAmount = typeof p.amountReceived === 'number' ? p.amountReceived : p.amount
    const isOverpaid = typeof p.amountReceived === 'number' && p.amountReceived > p.amount
    const isUnderpaid =
      p.status === 'APPROVED' &&
      typeof p.amountReceived === 'number' &&
      p.amountReceived < p.amount

    entries.push({
      id: `${p._id}-payment`,
      kind: 'payment',
      eventName,
      purpose: formatPaymentPurpose(p),
      status: p.status,
      amount: paidAmount,
      expectedAmount: p.amount,
      isOverpaid,
      isUnderpaid,
      proofOfPaymentURL: p.proofOfPaymentURL,
      date: p.createdAt
    })

    if (p.refund) {
      entries.push({
        id: `${p._id}-refund`,
        kind: 'refund',
        eventName,
        purpose: formatPaymentPurpose(p),
        status: p.refund.status,
        amount: p.refund.amount,
        reason: p.refund.reason,
        date: p.refund.createdAt ?? p.createdAt
      })
    }
  }

  return entries.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0
    const bTime = b.date ? new Date(b.date).getTime() : 0
    return bTime - aTime
  })
})

onMounted(async () => {
  try {
    const response = await loadPageData({
      mock: () => ({ success: true, status: 200, payments: [] }),
      fetch: async () => getMyPayments()
    })
    payments.value = response.payments
  } catch (error) {
    reportApiError(toast, { title: 'Could not load transactions', error })
  }
})
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader title="Partner Transactions" description="Your payment and refund history." />

    <div v-if="isUiOnlyMode" class="text-sm text-muted">
      UI-only mode: no transactions to display.
    </div>
    <div v-else-if="transactions.length === 0" class="text-sm text-muted">
      No transactions yet.
    </div>
    <div v-else class="space-y-3">
      <UPageCard
        v-for="entry in transactions"
        :key="entry.id"
        class="white-bread-container"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-2">
              <UIcon
                :name="entry.kind === 'refund' ? 'i-lucide-banknote' : 'i-lucide-receipt'"
                class="size-4 text-muted shrink-0"
              />
              <span class="font-medium truncate">
                {{ entry.kind === 'refund' ? `Refund - ${entry.eventName}` : entry.eventName }}
              </span>
            </div>
            <div class="text-sm text-muted">
              {{ entry.purpose }}
            </div>

            <template v-if="entry.kind === 'payment'">
              <div class="text-lg font-semibold">
                Php {{ entry.amount.toLocaleString() }}
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :label="entry.status"
                  :color="paymentStatusColor[entry.status]"
                  variant="soft"
                  size="sm"
                />
              </div>
              <div v-if="entry.isOverpaid" class="text-xs text-muted">
                Includes Php {{ (entry.amount - entry.expectedAmount).toLocaleString() }}
                over the Php {{ entry.expectedAmount.toLocaleString() }} fee.
              </div>
              <div v-else-if="entry.isUnderpaid" class="text-xs text-warning">
                Partial payment - Php {{ (entry.expectedAmount - entry.amount).toLocaleString() }}
                remaining.
              </div>
              <PaymentProofPreview
                :url="entry.proofOfPaymentURL"
                :label="entry.eventName"
              />
            </template>

            <template v-else>
              <div class="text-lg font-semibold">
                Php {{ entry.amount.toLocaleString() }}
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="refundStatusColor[entry.status]"
                  variant="soft"
                  size="sm"
                  :label="entry.status"
                />
                <span
                  v-if="entry.status === 'REJECTED' && entry.reason"
                  class="text-xs text-muted"
                >
                  - {{ entry.reason }}
                </span>
              </div>
            </template>
          </div>

          <div class="text-sm text-muted text-right shrink-0">
            {{ entry.date ? new Date(entry.date).toLocaleString() : '' }}
          </div>
        </div>
      </UPageCard>
    </div>
  </UContainer>
</template>
