<script setup lang="ts">
import type { EventRecord } from '~/types/event'
import type { CurrentTierInfo, PlanCatalogEntry, TierUpgradeOption } from '~/types/upgrade'
import { formatEventPriceTier } from '~/types/event'
import { isEventFullyPaid, hasPendingPaymentBlockingUpgrade, getPendingUpgradeTargetName } from '~/types/payment'
import type { PendingUpgradeInfo } from '~/types/upgrade'
import { reportApiError } from '~/types/auth'
import { formatPaymentMethodLabel, mapUiPaymentMethodToApi } from '~/utils/paymentMethod'
import { formatPhp, getTierFeatureBullets } from '~/utils/tierUpgradeFeatures'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Upgrade Plan',
  bgClass: 'bg-amber-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { getTierUpgradeOptions, submitTierUpgradePayment } = useUpgrade()
const { isUiOnlyMode, loadPageData } = useApiMode()

type ViewStep = 'select' | 'pay'

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const currentStep = ref<ViewStep>('select')
const eventRecord = ref<EventRecord | null>(null)
const currentTier = ref<CurrentTierInfo | null>(null)
const planCatalog = ref<PlanCatalogEntry[]>([])
const upgradeOptions = ref<TierUpgradeOption[]>([])
const eventFullyPaidFromApi = ref(true)
const pendingUpgrade = ref<PendingUpgradeInfo | null>(null)
const selectedUpgrade = ref<TierUpgradeOption | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const paymentPanelRef = ref<InstanceType<typeof PaymentProofPanel> | null>(null)

const paymentPendingReview = computed(() =>
  hasPendingPaymentBlockingUpgrade(eventRecord.value),
)

const hasPendingUpgrade = computed(() =>
  Boolean(pendingUpgrade.value) || paymentPendingReview.value,
)

const pendingUpgradeTargetName = computed(() =>
  pendingUpgrade.value?.targetTierName
  ?? getPendingUpgradeTargetName(eventRecord.value)
  ?? 'selected plan',
)

const pendingUpgradeMessage = computed(() =>
  `Your upgrade to ${pendingUpgradeTargetName.value} is pending admin review. You cannot submit another upgrade until it is verified.`,
)

const isEventPaid = computed(() =>
  eventRecord.value ? isEventFullyPaid(eventRecord.value) : false,
)

const hasAvailableUpgrades = computed(() => upgradeOptions.value.length > 0)

const amountDue = computed(() => {
  if (!selectedUpgrade.value) return 0
  return selectedUpgrade.value.paymentSummary.balanceDue
    || selectedUpgrade.value.priceDifferencePhp
})

function planStatusLabel(plan: PlanCatalogEntry): string {
  if (plan.status === 'current') return 'Current plan'
  if (plan.eligible) return 'Available'
  return 'Not available'
}

function planStatusColor(plan: PlanCatalogEntry): 'success' | 'warning' | 'neutral' {
  if (plan.status === 'current') return 'success'
  if (plan.eligible) return 'warning'
  return 'neutral'
}

async function loadPage() {
  const id = eventId.value
  if (!id) {
    toast.add({
      title: 'Missing event',
      description: 'Open an event from your dashboard first.',
      color: 'error',
    })
    await navigateTo('/')
    return
  }

  isLoading.value = true
  try {
    const [eventResponse, optionsResponse] = await Promise.all([
      fetchEvent(id, true),
      getTierUpgradeOptions(id),
    ])

    eventRecord.value = eventResponse.event

    if (!isUiOnlyMode.value && !isEventFullyPaid(eventResponse.event)) {
      toast.add({
        title: 'Complete initial payment first',
        description: 'Your event must be fully paid before upgrading.',
        color: 'warning',
      })
      await navigateTo({ path: '/event/payment-review', query: { eventId: id } })
      return
    }

    currentTier.value = optionsResponse.currentTier
    planCatalog.value = optionsResponse.allPlans ?? []
    upgradeOptions.value = optionsResponse.upgrades ?? []
    pendingUpgrade.value = optionsResponse.pendingUpgrade ?? null
    eventFullyPaidFromApi.value = optionsResponse.eventFullyPaid !== false

    if (hasPendingUpgrade.value) {
      currentStep.value = 'select'
      selectedUpgrade.value = null
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load upgrade options', error })
    await navigateTo({ path: '/user/event-dashboard', query: { eventId: id } })
  } finally {
    isLoading.value = false
  }
}

function selectUpgrade(option: TierUpgradeOption) {
  if (hasPendingUpgrade.value) return
  selectedUpgrade.value = option
  currentStep.value = 'pay'
}

function selectUpgradeFromPlan(plan: PlanCatalogEntry) {
  if (!plan.eligible || hasPendingUpgrade.value) return
  const match = upgradeOptions.value.find((option) => option.targetTierId === plan.tierId)
  if (match) selectUpgrade(match)
}

function goBackToSelection() {
  currentStep.value = 'select'
  selectedUpgrade.value = null
}

async function submitUpgradePayment() {
  const id = eventId.value
  const upgrade = selectedUpgrade.value
  const panel = paymentPanelRef.value

  if (!id || !upgrade || !panel) return

  if (hasPendingUpgrade.value) {
    toast.add({
      title: 'Upgrade pending review',
      description: pendingUpgradeMessage.value,
      color: 'warning',
    })
    return
  }

  const paymentMethod = mapUiPaymentMethodToApi(panel.selectedQrId)
  if (!paymentMethod) {
    toast.add({ title: 'Payment method required', color: 'warning' })
    return
  }

  if (!panel.transactionId.trim()) {
    toast.add({ title: 'Transaction ID required', color: 'warning' })
    return
  }

  if (!panel.proofFile) {
    toast.add({ title: 'Proof of payment required', color: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    await submitTierUpgradePayment(id, {
      targetTierId: upgrade.targetTierId,
      transactionId: panel.transactionId,
      paymentMethod,
      proofOfPayment: panel.proofFile,
    })

    toast.add({
      title: 'Proof of Payment Submitted',
      description: 'Your upgrade payment is being verified.',
      color: 'success',
    })

    await navigateTo({
      path: '/user/payment-pending',
      query: {
        ref: panel.transactionId.trim(),
        eventName: eventRecord.value?.eventName ?? '',
        package: upgrade.name,
        method: formatPaymentMethodLabel(paymentMethod),
      },
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not submit upgrade payment', error })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void loadPageData({
    fetch: loadPage,
    mock: loadPage,
  })
})
</script>

<template>
  <UContainer class="py-6 space-y-6">
    <div v-if="isLoading" class="flex items-center justify-center py-16 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="ml-2 text-sm">Loading upgrade options...</span>
    </div>

    <template v-else>
      <UAlert
        v-if="hasPendingUpgrade"
        color="warning"
        variant="subtle"
        icon="i-lucide-clock"
        title="Upgrade pending verification"
        :description="pendingUpgradeMessage"
      />

      <template v-if="currentStep === 'select'">
        <div class="space-y-2 text-center">
          <UBadge color="warning" variant="subtle">Upgrade Event Plan</UBadge>
          <h1 class="text-2xl font-bold font-serif text-toast-900">Your plan</h1>
          <p class="text-sm text-muted">{{ eventRecord?.eventName }}</p>
        </div>

        <UPageCard class="white-bread-container space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-muted">Current plan (from server)</p>
              <h2 class="text-xl font-bold font-serif text-toast-900">
                {{ currentTier?.name ?? formatEventPriceTier(eventRecord) }}
              </h2>
              <p v-if="currentTier?.code" class="text-xs text-muted mt-1">
                Code: {{ currentTier.code }}
                <span v-if="currentTier.pricePhp"> · {{ formatPhp(currentTier.pricePhp) }}</span>
              </p>
            </div>
            <UBadge :color="hasPendingUpgrade ? 'warning' : 'success'" variant="subtle">
              {{ hasPendingUpgrade ? 'Upgrade pending' : 'Active' }}
            </UBadge>
          </div>
          <p v-if="!eventFullyPaidFromApi" class="text-sm text-amber-700">
            Initial event payment is not complete. Finish payment before upgrading.
          </p>
        </UPageCard>

        <div class="space-y-3">
          <h2 class="text-lg font-bold font-serif text-toast-900">All plans</h2>
          <p class="text-sm text-muted">
            Compare every plan and see why each upgrade is available or blocked for this event.
          </p>

          <div class="space-y-3">
            <UPageCard
              v-for="plan in planCatalog"
              :key="plan.tierId"
              class="white-bread-container"
              :class="plan.eligible ? 'cursor-pointer hover:ring-2 hover:ring-toast-500/40 transition-all' : ''"
              @click="selectUpgradeFromPlan(plan)"
            >
              <div class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 class="text-lg font-bold font-serif text-toast-900">{{ plan.name }}</h3>
                    <p class="text-sm text-muted">
                      {{ formatPhp(plan.pricePhp) }}
                      <span v-if="plan.priceDifferencePhp && plan.status !== 'current'">
                        · {{ formatPhp(plan.priceDifferencePhp) }} to upgrade
                      </span>
                    </p>
                  </div>
                  <UBadge :color="planStatusColor(plan)" variant="subtle">
                    {{ planStatusLabel(plan) }}
                  </UBadge>
                </div>

                <p
                  v-if="plan.reason"
                  class="text-sm"
                  :class="plan.eligible ? 'text-muted' : 'text-amber-800'"
                >
                  {{ plan.reason }}
                </p>

                <p v-if="plan.emailCreditsDelta > 0 && plan.eligible" class="text-xs text-toast-700">
                  +{{ plan.emailCreditsDelta.toLocaleString() }} email credits
                </p>

                <ul v-if="plan.eligible" class="text-xs space-y-1.5 text-toast-900">
                  <li
                    v-for="feature in getTierFeatureBullets(plan.code)"
                    :key="feature"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-600 shrink-0" />
                    <span>{{ feature }}</span>
                  </li>
                </ul>

                <UButton
                  v-if="plan.eligible"
                  block
                  color="primary"
                  class="bg-toast-600 hover:bg-toast-700 text-white font-bold"
                  @click.stop="selectUpgradeFromPlan(plan)"
                >
                  Upgrade to {{ plan.name }}
                </UButton>
              </div>
            </UPageCard>
          </div>
        </div>

        <div
          v-if="hasPendingUpgrade"
          class="white-bread-container p-6 text-center space-y-3"
        >
          <UIcon name="i-lucide-clock" class="size-10 text-amber-600 mx-auto" />
          <p class="text-sm text-muted max-w-lg mx-auto">
            {{ pendingUpgradeMessage }}
            Track status under
            <NuxtLink to="/user/transactions" class="font-semibold text-toast-700 underline">
              Transactions
            </NuxtLink>.
          </p>
          <UButton
            :to="{ path: '/user/event-dashboard', query: { eventId: eventId || undefined } }"
            color="neutral"
            variant="outline"
          >
            Back to Event Dashboard
          </UButton>
        </div>

        <div
          v-else-if="!hasAvailableUpgrades"
          class="white-bread-container p-6 text-center space-y-2"
        >
          <UIcon name="i-lucide-info" class="size-8 text-muted mx-auto" />
          <p class="text-sm text-muted max-w-lg mx-auto">
            No upgrades can be purchased right now. Check the reasons above for Butter and
            Bread + Butter. If you believe you are on Bread but see Bread + Butter as current,
            your event may already be on the highest tier in the database.
          </p>
          <UButton
            :to="{ path: '/user/event-dashboard', query: { eventId: eventId || undefined } }"
            color="neutral"
            variant="outline"
          >
            Back to Event Dashboard
          </UButton>
        </div>
      </template>

      <template v-else-if="selectedUpgrade">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            @click="goBackToSelection"
          >
            Back
          </UButton>
          <div>
            <h1 class="text-xl font-bold font-serif text-toast-900">Pay for {{ selectedUpgrade.name }}</h1>
            <p class="text-sm text-muted">{{ eventRecord?.eventName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <UPageCard class="white-bread-container md:col-span-5 space-y-3">
            <h2 class="text-lg font-bold font-serif text-toast-800">Order Summary</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Current plan</span>
                <span class="font-semibold">{{ currentTier?.name ?? '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Upgrading to</span>
                <span class="font-semibold">{{ selectedUpgrade.name }}</span>
              </div>
              <div class="flex justify-between font-bold text-toast-900 border-t border-default pt-2">
                <span>Amount due</span>
                <span>{{ formatPhp(amountDue) }}</span>
              </div>
            </div>
          </UPageCard>

          <div class="md:col-span-7">
            <PaymentProofPanel
              ref="paymentPanelRef"
              :amount-due="amountDue"
              :loading="isSubmitting"
              :disabled="hasPendingUpgrade || !isEventPaid"
              @submit="submitUpgradePayment"
            />
          </div>
        </div>
      </template>
    </template>
  </UContainer>
</template>
