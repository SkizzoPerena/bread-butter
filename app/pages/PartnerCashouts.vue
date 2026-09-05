<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reportApiError } from '~/types/auth'
import type { CashoutRecord, CashoutStatus } from '~/types/cashout'

definePageMeta({
  layout: 'partner-navbar'
})

const toast = useToast()
const { listCashouts, requestCashout, getAvailableBalance } = useCashouts()

const schema = z.object({
  amountPhp: z.coerce.number().int().positive('Amount must be greater than zero')
})

type CashoutFormSchema = z.output<typeof schema>

const cashouts = ref<CashoutRecord[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const availableBalancePhp = ref(0)

const state = reactive<CashoutFormSchema>({
  amountPhp: 0
})

const statusColors: Record<CashoutStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error'
}

async function loadCashouts() {
  isLoading.value = true
  try {
    const [cashoutResponse, balance] = await Promise.all([
      listCashouts(),
      getAvailableBalance()
    ])
    cashouts.value = cashoutResponse.cashouts
    availableBalancePhp.value = balance
  } catch (error) {
    reportApiError(toast, { title: 'Could not load cashouts', error })
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<CashoutFormSchema>) {
  if (isSubmitting.value) {
    return
  }

  if (event.data.amountPhp > availableBalancePhp.value) {
    toast.add({
      title: 'Amount exceeds balance',
      description: 'Requested cashout cannot be greater than your available balance.',
      color: 'error'
    })
    return
  }

  isSubmitting.value = true
  try {
    const response = await requestCashout({
      amountPhp: event.data.amountPhp,
      paymentMethod: 'BANK_TRANSFER'
    })
    toast.add({ title: 'Cashout requested', description: response.message })
    state.amountPhp = 0
    await loadCashouts()
  } catch (error) {
    reportApiError(toast, { title: 'Could not request cashout', error })
  } finally {
    isSubmitting.value = false
  }
}

function formatPhp(value: number): string {
  return `Php ${value.toLocaleString()}`
}

onMounted(loadCashouts)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Cashouts"
      description="Request payouts from your available partner credit and review past requests."
    />

    <UPageGrid class="items-start">
      <UPageCard class="white-bread-container">
        <template #header>
          <div>
            <h2 class="font-semibold text-lg">Request cashout</h2>
            <p class="text-sm text-muted">Bank transfer is currently the only supported payout method.</p>
          </div>
        </template>

        <div class="mb-4 rounded-lg bg-toast-50 p-4">
          <div class="text-sm text-muted">Available balance</div>
          <div class="text-2xl font-bold font-serif text-toast-700">{{ formatPhp(availableBalancePhp) }}</div>
        </div>

        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Cashout amount (PHP)" name="amountPhp" required>
            <UInput v-model="state.amountPhp" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField label="Payout method">
            <UInput value="BANK_TRANSFER" disabled class="w-full" />
          </UFormField>
          <div class="flex justify-end">
            <UButton type="submit" :loading="isSubmitting">Request cashout</UButton>
          </div>
        </UForm>
      </UPageCard>

      <UPageCard class="white-bread-container col-span-2">
        <template #header>
          <div>
            <h2 class="font-semibold text-lg">Cashout history</h2>
            <p class="text-sm text-muted">Monitor request status and processed payouts.</p>
          </div>
        </template>

        <div v-if="isLoading" class="py-12 text-center text-muted">
          Loading cashouts...
        </div>
        <div v-else-if="cashouts.length === 0" class="py-12 text-center text-muted">
          No cashout requests yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="cashout in cashouts"
            :key="cashout._id"
            class="rounded-xl border border-bread-300/60 p-4"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="space-y-2">
                <div class="text-lg font-semibold">{{ formatPhp(cashout.amountPhp) }}</div>
                <div class="text-sm text-muted">Method: {{ cashout.paymentMethod }}</div>
                <div class="text-sm text-muted">
                  Requested: {{ cashout.createdAt ? new Date(cashout.createdAt).toLocaleString() : 'Pending review' }}
                </div>
                <div v-if="cashout.processedAt" class="text-sm text-muted">
                  Processed: {{ new Date(cashout.processedAt).toLocaleString() }}
                </div>
                <div v-if="cashout.denialReason" class="text-sm text-error">
                  {{ cashout.denialReason }}
                </div>
              </div>

              <UBadge :label="cashout.status" :color="statusColors[cashout.status]" variant="soft" />
            </div>
          </div>
        </div>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>

<style></style>
