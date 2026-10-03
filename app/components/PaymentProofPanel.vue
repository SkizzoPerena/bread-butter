<script setup lang="ts">
import { computed, ref } from 'vue'
import { PAYMENT_QR_OPTIONS, PAYMENT_QR_TABS } from '~/utils/paymentQrOptions'
import MockPaymentQrGraphic from '~/components/MockPaymentQrGraphic.vue'

const props = defineProps<{
  amountDue: number
  amountLabel?: string
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()

const toast = useToast()

const selectedQrId = ref<string>('gcash')
const transactionId = ref('')
const proofFile = ref<any>(null)

const gcashAccountName = 'Bread + Butter'
const gcashAccountNumber = '+639209328080'
const isCopied = ref(false)

async function copyGcashNumber() {
  try {
    await navigator.clipboard.writeText(gcashAccountNumber)
    isCopied.value = true
    toast.add({
      title: 'Copied to clipboard',
      description: `GCash number ${gcashAccountNumber} copied!`,
      color: 'success',
    })
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } catch {
    toast.add({
      title: 'Could not copy',
      description: 'Please copy +639209328080 manually.',
      color: 'warning',
    })
  }
}

function extractSingleFile(val: unknown): File | null {
  if (!val) return null
  if (val instanceof File) return val
  if (Array.isArray(val) && val.length > 0) {
    return val[0] instanceof File ? val[0] : (val[0] as File) || null
  }
  if (typeof (val as any)?.item === 'function') {
    const f = (val as any).item(0)
    return f instanceof File ? f : (f as File) || null
  }
  return (val as File) || null
}

function handleSubmit() {
  if (props.disabled || props.loading) return

  if (!transactionId.value.trim()) {
    toast.add({
      title: 'Reference number required',
      description: 'Please enter your payment reference / transaction ID.',
      color: 'warning',
    })
    return
  }

  const file = extractSingleFile(proofFile.value)
  if (!file) {
    toast.add({
      title: 'Proof of payment required',
      description: 'Please upload an image of your payment receipt or screenshot.',
      color: 'warning',
    })
    return
  }

  emit('submit')
}

const activeQr = computed(() => PAYMENT_QR_OPTIONS.find((o) => o.id === selectedQrId.value) ?? null)

const formattedAmount = computed(() => `Php ${props.amountDue.toLocaleString()}`)

defineExpose({
  get selectedQrId() {
    return selectedQrId.value
  },
  get transactionId() {
    return transactionId.value
  },
  get proofFile(): File | null {
    return extractSingleFile(proofFile.value)
  },
})
</script>

<template>
  <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 space-y-4">
    <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
      Scan & Pay
    </h2>

    <!-- Commented out UTabs as requested -->
    <!--
    <div class="space-y-1.5">
      <div class="text-[11px] font-bold text-toast-800 uppercase tracking-wider">
        Select QR Payment Method
      </div>
      <UTabs
        v-model="selectedQrId"
        :items="PAYMENT_QR_TABS"
        :content="false"
        class="w-full"
        :ui="{
          list: 'bg-toast-900/10 p-1 rounded-xl w-full grid grid-cols-3',
          indicator: 'bg-toast-600 shadow-sm rounded-lg',
          trigger: 'text-toast-800 data-[state=active]:text-white font-bold text-xs py-2',
        }"
      />
    </div>
    -->

    <!-- GCash Account Details Card with Copy Option -->
    <div class="bg-white/90 p-3.5 sm:p-4 rounded-xl border border-toast-600/20 space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-toast-900 font-bold text-xs sm:text-sm">
          <UIcon name="i-lucide-smartphone" class="w-4 h-4 text-toast-600" />
          <span>GCash Account Details</span>
        </div>

      </div>

      <div class="flex justify-between items-center text-xs">
        <span class="text-toast-600 font-bold uppercase text-[10px] tracking-wider">Account Name</span>
        <span class="font-bold text-toast-900 text-sm">{{ gcashAccountName }}</span>
      </div>

      <div class="flex justify-between items-center text-xs">
        <div>
          <span class="text-toast-600 font-bold uppercase text-[10px] tracking-wider block">GCash Number</span>
          <span class="font-mono font-bold text-toast-900 text-sm tracking-wide">{{ gcashAccountNumber }}</span>
        </div>
        <UButton color="toast" variant="solid" size="xs" :icon="isCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          class="font-bold text-xs cursor-pointer gap-1 transition-all" @click="copyGcashNumber">
          {{ isCopied ? 'Copied' : 'Copy' }}
        </UButton>
      </div>

    </div>
    <!-- QR CODES
    <div
      v-if="activeQr"
      class="bg-white/85 p-3.5 sm:p-4 rounded-xl border border-toast-600/20 flex flex-col items-center text-center space-y-2.5"
    >
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-1.5 text-toast-900 font-bold text-xs sm:text-sm">
          <UIcon :name="activeQr.icon" class="w-4 h-4 text-toast-600" />
          <span>Scan GCash QR</span>
        </div>
        <UBadge color="toast" variant="subtle" size="xs" class="text-[10px] font-semibold">
          Instant
        </UBadge>
      </div>

      <MockPaymentQrGraphic :logo-text="activeQr.logoText" />

      <p class="text-[11px] text-toast-700">Open your GCash app and scan this QR code or send directly to the number above</p>

      <div class="space-y-0.5 text-center text-xs w-full">
        <p class="font-bold text-toast-900">{{ gcashAccountName }}</p>
        <p class="text-[11px] font-mono text-toast-800">{{ gcashAccountNumber }}</p>
        <p class="text-[11px] text-toast-700 pt-0.5">
          {{ amountLabel ?? 'Amount Due' }}:
          <span class="font-bold text-toast-900">{{ formattedAmount }}</span>
        </p>
      </div>
    </div>
-->
    <UFormField label="Transaction / Reference ID" required>
      <UInput v-model="transactionId" placeholder="e.g. GCASH reference number" size="md"
        class="w-full bg-white text-toast-900 border-toast-300 rounded-lg" :disabled="disabled" />
    </UFormField>

    <!-- Upload Proof of Payment Section using native Nuxt UI UFileUpload -->
    <UFormField label="Upload Proof of Payment" required :ui="{ label: 'font-bold text-xs text-toast-900' }">
      <UFileUpload v-model="proofFile" :multiple="false" accept="image/*" size="md" variant="area"
        label="Click or drag receipt image here" description="Supports PNG, JPG, or WEBP (screenshots or photos)"
        icon="i-lucide-image-up" :disabled="disabled"
        class="w-full bg-white/80 hover:bg-white/95 border-2 border-dashed border-toast-400/80 hover:border-toast-600 rounded-xl transition-all shadow-xs"
        :ui="{
          wrapper: 'text-toast-900',
          label: 'text-xs font-bold text-toast-900',
          description: 'text-[11px] text-toast-700',
          icon: 'text-toast-600',
        }" />
    </UFormField>

    <!-- Submit Button -->
    <UButton block color="primary" size="md" :loading="loading" :disabled="disabled"
      class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md cursor-pointer transition-all"
      @click="handleSubmit">
      Submit Proof of Payment
    </UButton>
  </div>
</template>
