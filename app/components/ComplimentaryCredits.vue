<script setup lang="ts">
import type { ComplimentaryGrantRecord, ComplimentaryProduct } from '~/types/complimentary'
import { getApiErrorMessage } from '~/types/auth'
import { useComplimentary } from '~/composables/useComplimentary'

/**
 * The user's free events and Jams, with a box to redeem a code. Choosing one emits `use`.
 * Without `product`, both kinds are shown (the dashboard). With it, only that kind (create pages).
 */
const props = withDefaults(defineProps<{
  product?: ComplimentaryProduct
  selectedGrantId?: string | null
  /** Show the code box even when the user has no free credits. */
  showRedeem?: boolean
  tone?: 'bread' | 'jam'
}>(), {
  product: undefined,
  selectedGrantId: null,
  showRedeem: true,
  tone: 'bread'
})

const emit = defineEmits<{
  use: [grant: ComplimentaryGrantRecord]
}>()

const toast = useToast()
const { grants, loadGrants, redeemCode } = useComplimentary()

const code = ref('')
const redeeming = ref(false)
const redeemError = ref('')
const isRedeemOpen = ref(false)

const visibleGrants = computed(() =>
  grants.value.filter(grant => grant.status === 'AVAILABLE' && (!props.product || grant.product === props.product))
)

const formatPhp = (value: number | null) =>
  value == null ? '' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)

const grantTitle = (grant: ComplimentaryGrantRecord) =>
  grant.product === 'EVENT' ? `Free ${grant.packageName} event` : `Free ${grant.packageName} Jam`

const grantDetail = (grant: ComplimentaryGrantRecord) => {
  const worth = formatPhp(grant.currentPricePhp)
  const guests = grant.jamPackage ? `${grant.jamPackage.maxGuests} guests · ` : ''
  return `${guests}${worth ? `worth ${worth}` : ''}`.replace(/ · $/, '')
}

async function submitCode() {
  const value = code.value.trim()
  if (!value) {
    redeemError.value = 'Enter your code.'
    return
  }
  redeeming.value = true
  redeemError.value = ''
  try {
    const response = await redeemCode(value)
    toast.add({ title: response.message, color: 'success' })
    code.value = ''
    isRedeemOpen.value = false
    // A code for the kind of thing this page makes is ready to use straight away.
    if (!props.product || response.grant.product === props.product) {
      emit('use', response.grant)
    }
  } catch (error) {
    redeemError.value = getApiErrorMessage(error, 'That code could not be redeemed. Please try again.')
  } finally {
    redeeming.value = false
  }
}

onMounted(loadGrants)
</script>

<template>
  <div
    v-if="visibleGrants.length > 0 || showRedeem"
    class="space-y-3"
  >
    <div
      v-for="grant in visibleGrants"
      :key="grant._id"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 sm:p-4"
      :class="[
        tone === 'jam' ? 'bg-jam-50 border-jam-300 text-jam-950' : 'bg-white/90 border-toast-600/25 text-toast-900',
        selectedGrantId === grant._id ? 'ring-2 ring-offset-1 ring-green-600' : ''
      ]"
    >
      <div class="flex items-start gap-3 min-w-0">
        <UIcon
          name="i-lucide-gift"
          class="size-6 shrink-0 text-green-700"
        />
        <div class="min-w-0">
          <p class="font-serif font-bold text-sm sm:text-base">
            {{ grantTitle(grant) }}
          </p>
          <p class="text-xs opacity-80">
            {{ grantDetail(grant) }}{{ grantDetail(grant) ? ' · ' : '' }}no payment needed
          </p>
        </div>
      </div>
      <UButton
        v-if="selectedGrantId !== grant._id"
        size="sm"
        color="primary"
        class="font-semibold shrink-0 cursor-pointer"
        :label="grant.product === 'EVENT' ? 'Create my free event' : 'Create my free Jam'"
        @click="emit('use', grant)"
      />
      <UBadge
        v-else
        color="success"
        variant="soft"
        class="shrink-0"
      >
        Using this
      </UBadge>
    </div>

    <div
      v-if="showRedeem"
      class="text-xs"
      :class="tone === 'jam' ? 'text-jam-950' : ''"
    >
      <button
        v-if="!isRedeemOpen"
        type="button"
        class="underline font-semibold cursor-pointer"
        @click="isRedeemOpen = true"
      >
        Have a code for a free event or Jam?
      </button>
      <form
        v-else
        class="flex flex-col sm:flex-row gap-2 sm:items-start max-w-lg"
        @submit.prevent="submitCode"
      >
        <div class="flex-1 space-y-1">
          <UInput
            v-model="code"
            placeholder="Enter your code"
            aria-label="Redemption code"
            size="sm"
            class="w-full uppercase bg-white text-toast-900"
            autocomplete="off"
          />
          <p
            v-if="redeemError"
            class="text-[11px] text-red-700 bg-white/80 rounded px-1.5 py-0.5"
          >
            {{ redeemError }}
          </p>
        </div>
        <UButton
          type="submit"
          size="sm"
          color="primary"
          :loading="redeeming"
          class="font-semibold cursor-pointer"
        >
          Redeem
        </UButton>
      </form>
    </div>
  </div>
</template>
