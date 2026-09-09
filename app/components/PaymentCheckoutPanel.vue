<script setup lang="ts">
const props = defineProps<{
  amountDue: number
  loading?: boolean
  disabled?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: []
}>()

function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}
</script>

<template>
  <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 space-y-4">
    <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
      Pay securely
    </h2>

    <div class="bg-white/85 p-4 rounded-xl border border-toast-600/20 space-y-3">
      <div class="flex items-center gap-2 font-bold text-toast-900">
        <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-toast-600" />
        <span>PayMongo hosted checkout</span>
      </div>
      <p class="text-sm text-toast-800 leading-snug">
        You will be redirected to PayMongo to pay with card, GCash, Maya, GrabPay, or QRPh.
        After a successful payment you will return here automatically.
      </p>
      <div class="flex justify-between items-center text-sm font-semibold text-toast-900 pt-1">
        <span>Amount due</span>
        <span class="font-serif text-lg">{{ formatPhp(props.amountDue) }}</span>
      </div>
    </div>

    <UButton
      block
      color="primary"
      size="md"
      icon="i-lucide-lock"
      :disabled="props.disabled || props.loading || props.amountDue <= 0"
      :loading="props.loading"
      class="font-bold text-white bg-toast-600 hover:bg-toast-700 disabled:opacity-50 shadow-md"
      @click="emit('submit')"
    >
      {{ props.submitLabel || 'Proceed to checkout' }}
    </UButton>
    <p class="text-[11px] text-center text-toast-700 leading-tight">
      Payments are processed by PayMongo. We never store your card or e-wallet details.
    </p>
  </div>
</template>
