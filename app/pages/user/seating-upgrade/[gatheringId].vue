<script setup lang="ts">
import type { JamUpgradeOption, JamUpgradeOptions, SeatingPaymentRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'
import { getProofSubmitPayload, type PaymentProofPanelExpose } from '~/utils/paymentMethod'
import PaymentCheckoutPanel from '~/components/PaymentCheckoutPanel.vue'
import PaymentProofPanel from '~/components/PaymentProofPanel.vue'

definePageMeta({ layout: 'signed-in-navbar', middleware: 'seating-enabled' })
useHead({ title: 'Upgrade seating plan - Bread + Butter' })

// These close an old attempt so a new one can start. They aren't something a host needs to fix.
const SYSTEM_DENIALS = ['Replaced by a newer upgrade request.', 'The checkout expired before it was paid.']

const route = useRoute()
const toast = useToast()
const { isPaymongoActivated } = usePaymongoActivation()
const { getUpgradeOptions, listGatheringPayments, submitUpgradeProof, createUpgradeCheckout } = useSeating()

const gatheringId = computed(() => String(route.params.gatheringId || ''))
const options = ref<JamUpgradeOptions | null>(null)
const denied = ref<SeatingPaymentRecord | null>(null)
const selected = ref<JamUpgradeOption | null>(null)
const loading = ref(true)
const saving = ref(false)
const proofPanel = ref<PaymentProofPanelExpose | null>(null)

const pending = computed(() => options.value?.pendingUpgrade ?? null)
const pendingManual = computed(() => pending.value?.provider === 'MANUAL')
const workspacePath = computed(() => `/seating/${gatheringId.value}`)

onMounted(load)

async function load() {
  loading.value = true
  selected.value = null
  try {
    const [loaded, payments] = await Promise.all([
      getUpgradeOptions(gatheringId.value),
      listGatheringPayments(gatheringId.value).catch(() => []),
    ])
    options.value = loaded
    denied.value = payments.find((payment) => (
      payment.type === 'SEATING_UPGRADE'
      && payment.status === 'DENIED'
      && !SYSTEM_DENIALS.includes(payment.denialReason || '')
    )) ?? null
    if (payments[0]?.type === 'SEATING_UPGRADE' && payments[0].status !== 'DENIED') denied.value = null
  } catch (error) {
    toast.add({ title: 'Could not load upgrades', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

/** One key per plan and package, so a retry or double click reuses the same checkout. */
function idempotencyKeyFor(packageId: string) {
  const storageKey = `jam-upgrade:${gatheringId.value}:${packageId}`
  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing) return existing
    const created = crypto.randomUUID()
    sessionStorage.setItem(storageKey, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

function forgetIdempotencyKey(packageId: string) {
  try {
    sessionStorage.removeItem(`jam-upgrade:${gatheringId.value}:${packageId}`)
  } catch {
    // Nothing was stored, so there is nothing to forget.
  }
}

async function payWithCheckout() {
  if (!selected.value) return
  saving.value = true
  try {
    const checkout = await createUpgradeCheckout(gatheringId.value, {
      packageId: selected.value._id,
      cancelPath: `/user/seating-upgrade/${gatheringId.value}?cancelled=1`,
      idempotencyKey: idempotencyKeyFor(selected.value._id),
    })
    if (checkout.alreadyPaid) {
      forgetIdempotencyKey(selected.value._id)
      toast.add({ title: 'Your plan is upgraded', color: 'success' })
      await navigateTo(workspacePath.value)
      return
    }
    if (checkout.checkoutUrl) {
      window.location.assign(checkout.checkoutUrl)
      return
    }
    toast.add({ title: 'Checkout did not start', color: 'error' })
  } catch (error) {
    toast.add({ title: 'Could not start checkout', description: getApiErrorMessage(error), color: 'error' })
    await load()
  } finally {
    saving.value = false
  }
}

async function payWithProof() {
  if (!selected.value) return
  const payload = getProofSubmitPayload(proofPanel.value)
  if (!payload) {
    toast.add({ title: 'Add your payment proof', description: 'Reference number and receipt image are required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    await submitUpgradeProof(gatheringId.value, selected.value._id, payload)
    toast.add({ title: 'Payment submitted', description: 'Your guest limit goes up once it is approved.', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Could not submit payment', description: getApiErrorMessage(error), color: 'error' })
    await load()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-toast-700 min-h-screen pt-24 sm:pt-28 pb-10">
    <UContainer class="max-w-xl space-y-4">
      <h1 class="text-3xl font-bold font-serif text-bread-400 text-center">
        Upgrade your plan
      </h1>
      <div
        v-if="loading"
        class="text-white text-center"
      >
        Loading...
      </div>
      <div
        v-else-if="!options"
        class="white-bread-container p-6 text-center"
      >
        Upgrades aren't available for this plan.
        <UButton
          :to="workspacePath"
          variant="outline"
          class="mt-3"
        >
          Back to my seating plan
        </UButton>
      </div>
      <template v-else>
        <div class="white-bread-container p-5 space-y-1">
          <p class="text-sm uppercase tracking-wide">
            Current plan
          </p>
          <p class="font-serif text-2xl font-bold">
            {{ options.current.packageName }}
          </p>
          <p>Up to {{ options.current.maxGuests }} guests</p>
        </div>

        <p
          v-if="route.query.cancelled && !pendingManual"
          class="white-bread-container p-4 text-sm"
        >
          Checkout was cancelled. You weren't charged, and can try again.
        </p>
        <p
          v-if="denied && !pending"
          class="white-bread-container p-4 text-sm"
          role="alert"
        >
          Your last upgrade payment was denied{{ denied.denialReason ? `: ${denied.denialReason}` : '.' }} You can try again.
        </p>

        <div
          v-if="pending"
          class="white-bread-container p-5 space-y-2"
          data-testid="pending-upgrade"
        >
          <p class="font-semibold">
            Upgrade to {{ pending.upgrade?.packageName }} in progress
          </p>
          <p
            v-if="pendingManual"
            class="text-sm"
          >
            We're reviewing your payment of ₱{{ pending.amount.toLocaleString() }}. Your limit goes up to {{ pending.upgrade?.maxGuests }} guests once it's approved.
          </p>
          <template v-else>
            <p class="text-sm">
              You started a checkout for ₱{{ pending.amount.toLocaleString() }}. You can finish it, or choose a different plan below, which closes it.
            </p>
            <UButton
              v-if="pending.paymongoCheckoutUrl"
              :to="pending.paymongoCheckoutUrl"
              external
              size="sm"
            >
              Resume checkout
            </UButton>
          </template>
        </div>

        <template v-if="!pendingManual">
          <div
            v-if="!options.options.length"
            class="white-bread-container p-6 text-center"
          >
            You're on our largest plan.
          </div>
          <div
            v-for="option in options.options"
            :key="option._id"
            class="white-bread-container p-5 flex items-center justify-between gap-3"
            :class="{ 'ring-2 ring-toast-600': selected?._id === option._id }"
            data-testid="upgrade-option"
          >
            <div>
              <p class="font-serif text-xl font-bold">
                {{ option.name }}
              </p>
              <p class="text-sm">
                Up to {{ option.maxGuests }} guests ({{ option.additionalGuests }} more)
              </p>
              <p class="font-semibold">
                Pay ₱{{ option.priceDifferencePhp.toLocaleString() }}
              </p>
            </div>
            <UButton
              size="sm"
              :variant="selected?._id === option._id ? 'solid' : 'outline'"
              :aria-label="`Choose ${option.name}`"
              @click="selected = option"
            >
              {{ selected?._id === option._id ? 'Chosen' : 'Choose' }}
            </UButton>
          </div>

          <template v-if="selected">
            <PaymentCheckoutPanel
              v-if="isPaymongoActivated"
              :amount-due="selected.priceDifferencePhp"
              :loading="saving"
              submit-label="Pay with PayMongo"
              @submit="payWithCheckout"
            />
            <PaymentProofPanel
              v-else
              ref="proofPanel"
              :amount-due="selected.priceDifferencePhp"
              :loading="saving"
              @submit="payWithProof"
            />
          </template>
        </template>

        <UButton
          :to="workspacePath"
          variant="ghost"
          class="text-white"
        >
          Back to my seating plan
        </UButton>
      </template>
    </UContainer>
  </div>
</template>
