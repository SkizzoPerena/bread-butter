<script setup lang="ts">
import type { EventRecord } from '~/types/event'
import type { EmailCreditPackage } from '~/types/upgrade'
import { isEmailCreditPurchasePending } from '~/types/payment'
import { reportApiError } from '~/types/auth'
import { formatPaymentMethodLabel, mapUiPaymentMethodToApi } from '~/utils/paymentMethod'
import { formatPhp } from '~/utils/tierUpgradeFeatures'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({
  layout: 'event-sub-navbar',
  key: (route) => route.fullPath,
  useLogo: true,
  title: 'Buy Email Credits',
  bgClass: 'bg-violet-50',
})

const toast = useToast()
const route = useRoute()
const { fetchEvent } = useEvents()
const { getEmailCreditPackages, submitEmailCreditPayment } = useUpgrade()
const { isUiOnlyMode, loadPageData } = useApiMode()

type ViewStep = 'select' | 'pay'

const eventId = computed(() => {
  const value = route.query.eventId
  return typeof value === 'string' ? value : ''
})

const currentStep = ref<ViewStep>('select')
const eventRecord = ref<EventRecord | null>(null)
const packages = ref<EmailCreditPackage[]>([])
const selectedPackage = ref<EmailCreditPackage | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const paymentPanelRef = ref<InstanceType<typeof PaymentProofPanel> | null>(null)

const hasPendingEmailCreditPayment = computed(() =>
  isEmailCreditPurchasePending(eventRecord.value),
)

const pendingEmailCreditMessage =
  'Your email credit payment is pending admin review. You cannot buy more credits until it is verified.'

const remainingEmails = computed(() => {
  const value = eventRecord.value?.remainingEmails
  return typeof value === 'number' ? value : null
})

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
    const [eventResponse, packagesResponse] = await Promise.all([
      fetchEvent(id),
      getEmailCreditPackages(),
    ])

    eventRecord.value = eventResponse.event
    packages.value = packagesResponse.packages ?? []

    if (isEmailCreditPurchasePending(eventResponse.event)) {
      currentStep.value = 'select'
      selectedPackage.value = null
    }
  } catch (error) {
    reportApiError(toast, { title: 'Could not load email credit packages', error })
    await navigateTo({ path: '/user/event-dashboard', query: { eventId: id } })
  } finally {
    isLoading.value = false
  }
}

function selectPackage(pkg: EmailCreditPackage) {
  if (hasPendingEmailCreditPayment.value) return
  selectedPackage.value = pkg
  currentStep.value = 'pay'
}

function goBackToSelection() {
  currentStep.value = 'select'
  selectedPackage.value = null
}

async function submitCreditPayment() {
  const id = eventId.value
  const pkg = selectedPackage.value
  const panel = paymentPanelRef.value

  if (!id || !pkg || !panel) return

  if (hasPendingEmailCreditPayment.value) {
    toast.add({
      title: 'Email credit payment pending review',
      description: pendingEmailCreditMessage,
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
    await submitEmailCreditPayment(id, {
      emailCreditPackageId: pkg._id,
      transactionId: panel.transactionId,
      paymentMethod,
      proofOfPayment: panel.proofFile,
    })

    toast.add({
      title: 'Proof of Payment Submitted',
      description: 'Your email credit purchase is being verified.',
      color: 'success',
    })

    await navigateTo({
      path: '/user/payment-pending',
      query: {
        ref: panel.transactionId.trim(),
        eventName: eventRecord.value?.eventName ?? '',
        package: pkg.name,
        method: formatPaymentMethodLabel(paymentMethod),
      },
    })
  } catch (error) {
    reportApiError(toast, { title: 'Could not submit payment', error })
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
      <span class="ml-2 text-sm">Loading packages...</span>
    </div>

    <template v-else>
      <UAlert
        v-if="hasPendingEmailCreditPayment"
        color="warning"
        variant="subtle"
        icon="i-lucide-clock"
        title="Email credit payment pending verification"
        :description="pendingEmailCreditMessage"
      />

      <div v-if="remainingEmails != null" class="flex justify-center">
        <UBadge color="violet" variant="subtle" size="lg">
          {{ remainingEmails.toLocaleString() }} emails remaining
        </UBadge>
      </div>

      <div v-if="!packages.length" class="white-bread-container p-8 text-center space-y-4">
        <UIcon name="i-lucide-mail" class="size-10 text-violet-600 mx-auto" />
        <h1 class="text-xl font-bold font-serif text-toast-900">No packages available</h1>
        <p class="text-sm text-muted">Email credit packages are not available right now. Please try again later.</p>
        <UButton
          :to="{ path: '/event/guests', query: { eventId: eventId || undefined } }"
          color="primary"
          class="bg-toast-600 hover:bg-toast-700 text-white"
        >
          Back to Guest List
        </UButton>
      </div>

      <template v-else-if="currentStep === 'select'">
        <div class="space-y-2 text-center">
          <UBadge color="violet" variant="subtle">Email Credits</UBadge>
          <h1 class="text-2xl font-bold font-serif text-toast-900">Buy more email credits</h1>
          <p class="text-sm text-muted">
            For <span class="font-semibold">{{ eventRecord?.eventName }}</span>
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <UPageCard
            v-for="pkg in packages"
            :key="pkg._id"
            class="white-bread-container transition-all"
            :class="hasPendingEmailCreditPayment
              ? 'opacity-60'
              : 'cursor-pointer hover:ring-2 hover:ring-violet-500/40'"
            @click="selectPackage(pkg)"
          >
            <div class="space-y-3 text-center">
              <UIcon name="i-lucide-mail" class="size-8 text-violet-600 mx-auto" />
              <h2 class="text-lg font-bold font-serif text-toast-900">{{ pkg.name }}</h2>
              <p class="text-2xl font-bold text-violet-700">{{ pkg.emailCredits.toLocaleString() }} emails</p>
              <p class="text-sm text-muted">{{ formatPhp(pkg.pricePhp) }}</p>
              <UButton
                block
                color="primary"
                class="bg-toast-600 hover:bg-toast-700 text-white font-bold"
                :disabled="hasPendingEmailCreditPayment"
              >
                {{ hasPendingEmailCreditPayment ? 'Purchase pending' : 'Select Package' }}
              </UButton>
            </div>
          </UPageCard>
        </div>
      </template>

      <template v-else-if="selectedPackage">
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
            <h1 class="text-xl font-bold font-serif text-toast-900">{{ selectedPackage.name }}</h1>
            <p class="text-sm text-muted">{{ eventRecord?.eventName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <UPageCard class="white-bread-container md:col-span-5 space-y-3">
            <h2 class="text-lg font-bold font-serif text-toast-800">Order Summary</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Package</span>
                <span class="font-semibold">{{ selectedPackage.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Email credits</span>
                <span class="font-semibold">{{ selectedPackage.emailCredits.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-toast-900 border-t border-default pt-2">
                <span>Amount due</span>
                <span>{{ formatPhp(selectedPackage.pricePhp) }}</span>
              </div>
            </div>
          </UPageCard>

          <div class="md:col-span-7">
            <PaymentProofPanel
              ref="paymentPanelRef"
              :amount-due="selectedPackage.pricePhp"
              :loading="isSubmitting"
              :disabled="hasPendingEmailCreditPayment"
              @submit="submitCreditPayment"
            />
          </div>
        </div>
      </template>
    </template>
  </UContainer>
</template>
