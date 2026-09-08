<script setup lang="ts">
import { computed } from 'vue'
import { PAYMENT_QR_OPTIONS, PAYMENT_QR_TABS } from '~/utils/paymentQrOptions'
import { usePaymentProofForm } from '~/composables/usePaymentProofForm'
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

const {
  selectedQrId,
  proofFile,
  proofPreview,
  fileInput,
  isDragging,
  transactionId,
  triggerFileInput,
  handleFileChange,
  handleDrop,
  removeFile,
} = usePaymentProofForm()

const activeQr = computed(() => PAYMENT_QR_OPTIONS.find((o) => o.id === selectedQrId.value) ?? null)

const formattedAmount = computed(() => `Php ${props.amountDue.toLocaleString()}`)

const canSubmit = computed(() =>
  Boolean(
    !props.disabled
    && !props.loading
    && selectedQrId.value
    && transactionId.value.trim()
    && proofFile.value,
  ),
)

defineExpose({
  get selectedQrId() {
    return selectedQrId.value
  },
  get transactionId() {
    return transactionId.value
  },
  get proofFile() {
    return proofFile.value
  },
})
</script>

<template>
  <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 space-y-4">
    <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
      Scan & Pay
    </h2>

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

    <div
      v-if="activeQr"
      class="bg-white/85 p-3.5 sm:p-4 rounded-xl border border-toast-600/20 flex flex-col items-center text-center space-y-2.5"
    >
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-1.5 text-toast-900 font-bold text-xs sm:text-sm">
          <UIcon :name="activeQr.icon" class="w-4 h-4 text-toast-600" />
          <span>{{ activeQr.label }} QR</span>
        </div>
        <UBadge color="toast" variant="subtle" size="xs" class="text-[10px] font-semibold">
          {{ activeQr.badgeText }}
        </UBadge>
      </div>

      <MockPaymentQrGraphic :logo-text="activeQr.logoText" />

      <p class="text-[11px] text-toast-700">{{ activeQr.instructions }}</p>

      <div class="space-y-0.5 text-center text-xs w-full">
        <p class="font-bold text-toast-900">{{ activeQr.accountName }}</p>
        <p class="text-[11px] font-mono text-toast-800">{{ activeQr.accountNumber }}</p>
        <p class="text-[11px] text-toast-700 pt-0.5">
          {{ amountLabel ?? 'Amount Due' }}:
          <span class="font-bold text-toast-900">{{ formattedAmount }}</span>
        </p>
      </div>
    </div>

    <UFormField label="Transaction / Reference ID" required>
      <UInput
        v-model="transactionId"
        placeholder="e.g. GCASH reference number"
        size="md"
        class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
        :disabled="disabled"
      />
    </UFormField>

    <div class="space-y-2">
      <label class="font-bold text-xs text-toast-900 flex items-center gap-1.5">
        <UIcon name="i-lucide-upload" class="w-3.5 h-3.5 text-toast-600" />
        <span>Upload Proof of Payment</span>
      </label>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange">

      <div
        v-if="!proofFile"
        :class="[
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          isDragging
            ? 'border-toast-600 bg-white/90 shadow-sm scale-[1.01]'
            : 'border-toast-400/80 bg-white/60 hover:bg-white/85 hover:border-toast-600',
        ]"
        @click="!disabled && triggerFileInput()"
        @dragover.prevent="!disabled && (isDragging = true)"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="!disabled && handleDrop($event)"
      >
        <div class="w-9 h-9 rounded-full bg-toast-500/10 text-toast-600 flex items-center justify-center">
          <UIcon name="i-lucide-image-up" class="w-5 h-5" />
        </div>
        <p class="text-xs font-bold text-toast-900">Click or drag receipt image here</p>
      </div>

      <div
        v-else
        class="bg-white/90 p-3 rounded-xl border-2 border-toast-600/30 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3 min-w-0">
          <img
            v-if="proofPreview"
            :src="proofPreview"
            alt="Proof Preview"
            class="w-12 h-12 object-cover rounded-lg border border-toast-300 shrink-0"
          >
          <p class="text-xs font-bold text-toast-900 truncate">{{ proofFile.name }}</p>
        </div>
        <UButton
          color="error"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          :disabled="disabled"
          @click="removeFile"
        />
      </div>
    </div>

    <UButton
      block
      color="primary"
      size="md"
      :disabled="!canSubmit"
      :loading="loading"
      class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
      @click="emit('submit')"
    >
      Submit Proof of Payment
    </UButton>
  </div>
</template>
