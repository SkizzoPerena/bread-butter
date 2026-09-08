<script lang="ts" setup>
import { reportApiError } from '~/types/auth'
import { usePartnerDashboard } from '~/composables/usePartnerDashboard'

definePageMeta({
  layout: 'partner-navbar'
})

const toast = useToast()
const { isUiOnlyMode } = useApiMode()
const { fetchDashboardSummary } = usePartnerDashboard()

const isLoading = ref(true)
const summary = ref({
  balancePhp: 0,
  activeVouchers: 0,
  pendingCashoutsPhp: 0,
  collaboratedEvents: 0,
  recentVouchers: [] as Array<{ _id: string; code?: string; useCount?: number }>,
  recentCashouts: [] as Array<{ _id: string; amountPhp: number; status: string; createdAt?: string }>
})

const financialStats = computed(() => [
  {
    label: 'Available Balance',
    value: formatPhp(summary.value.balancePhp),
    icon: 'i-lucide-wallet'
  },
  {
    label: 'Active Vouchers',
    value: String(summary.value.activeVouchers),
    icon: 'i-lucide-ticket-percent'
  },
  {
    label: 'Pending Cashouts',
    value: formatPhp(summary.value.pendingCashoutsPhp),
    icon: 'i-lucide-timer'
  },
  {
    label: 'Collaborated Events',
    value: String(summary.value.collaboratedEvents),
    icon: 'i-lucide-calendar-heart'
  }
])

function formatPhp(value: number): string {
  return `Php ${value.toLocaleString()}`
}

async function loadDashboard() {
  isLoading.value = true
  try {
    summary.value = await fetchDashboardSummary()
  } catch (error) {
    reportApiError(toast, {
      title: 'Unable to load dashboard',
      error,
      fallback: 'Could not load partner dashboard data.'
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <UContainer class="space-y-6 py-6">
    <UPageHeader
      title="Partner Dashboard"
      description="Track your available balance, vouchers, cashout requests, and collaborated events."
    />

    <div v-if="isUiOnlyMode" class="text-sm text-muted">
      UI-only mode is enabled, so dashboard values are shown with demo data.
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-toast-700" />
    </div>

    <template v-else>
      <UPageGrid>
        <UPageCard
          v-for="stat in financialStats"
          :key="stat.label"
          :title="stat.label"
          :icon="stat.icon"
          class="white-bread-container"
        >
          <template #description>
            <span class="text-3xl font-bold font-serif text-toast-700">{{ stat.value }}</span>
          </template>
        </UPageCard>
      </UPageGrid>

      <UPageGrid class="items-start">
        <UPageCard class="white-bread-container">
          <template #header>
            <div>
              <h2 class="font-semibold text-lg">Recent Voucher Activity</h2>
              <p class="text-sm text-muted">Your most recently created partner vouchers.</p>
            </div>
          </template>

          <div v-if="summary.recentVouchers.length === 0" class="text-sm text-muted">
            No vouchers yet.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="voucher in summary.recentVouchers"
              :key="voucher._id"
              class="flex items-center justify-between rounded-lg border border-bread-300/60 px-4 py-3"
            >
              <div>
                <div class="font-medium">{{ voucher.code || 'Untitled voucher' }}</div>
                <div class="text-sm text-muted">Used {{ voucher.useCount ?? 0 }} time(s)</div>
              </div>
              <UButton to="/partners/vouchers" variant="ghost" color="neutral" icon="i-lucide-arrow-right" />
            </div>
          </div>
        </UPageCard>

        <UPageCard class="white-bread-container">
          <template #header>
            <div>
              <h2 class="font-semibold text-lg">Recent Cashouts</h2>
              <p class="text-sm text-muted">Track your latest payout requests.</p>
            </div>
          </template>

          <div v-if="summary.recentCashouts.length === 0" class="text-sm text-muted">
            No cashout requests yet.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="cashout in summary.recentCashouts"
              :key="cashout._id"
              class="rounded-lg border border-bread-300/60 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-medium">{{ formatPhp(cashout.amountPhp) }}</div>
                  <div class="text-sm text-muted">
                    {{ cashout.createdAt ? new Date(cashout.createdAt).toLocaleString() : 'Pending review' }}
                  </div>
                </div>
                <UBadge :label="cashout.status" color="warning" variant="soft" />
              </div>
            </div>
          </div>
        </UPageCard>
      </UPageGrid>
    </template>
  </UContainer>
</template>

<style scoped></style>
