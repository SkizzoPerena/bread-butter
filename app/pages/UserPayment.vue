<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEvents } from '~/composables/useEvents'
import { usePriceTiers } from '~/composables/usePriceTiers'
import { reportApiError } from '~/types/auth'
import { formatPaymentMethodLabel, mapUiPaymentMethodToApi } from '~/utils/paymentMethod'

definePageMeta({
  layout: 'signed-in-navbar',
})

useHead({
  title: 'Payment - Bread + Butter',
})

const route = useRoute()
const toast = useToast()
const { createEvent } = useEvents()
const { resolvePriceTierId } = usePriceTiers()
const { isUiOnlyMode } = useApiMode()

const selectedPkgId = computed(() => (typeof route.query.package === 'string' ? route.query.package : 'bread-butter'))
const eventName = computed(() => (typeof route.query.eventName === 'string' ? route.query.eventName : ''))
const eventType = computed(() => (typeof route.query.eventType === 'string' ? route.query.eventType : 'WEDDING'))
const eventDate = computed(() => (typeof route.query.eventDate === 'string' ? route.query.eventDate : ''))
const venue = computed(() => (typeof route.query.venue === 'string' ? route.query.venue : ''))
const description = computed(() => {
  if (typeof route.query.description === 'string' && route.query.description.trim()) {
    return route.query.description.trim()
  }
  const name = eventName.value.trim()
  const loc = venue.value.trim()
  if (name && loc) return `${name} at ${loc}`
  if (name) return `${name} celebration`
  return 'Event celebration'
})

const packagesMap: Record<string, { title: string; price: string; discountPrice: string; description: string }> = {
  bread: {
    title: 'Bread',
    price: 'P10,000',
    discountPrice: 'P5,000',
    description: 'Essential tools for your website and guests.'
  },
  butter: {
    title: 'Butter',
    price: 'P15,000',
    discountPrice: 'P7,500',
    description: 'Advanced planning tools and supplier management.'
  },
  'bread-butter': {
    title: 'Bread + Butter',
    price: 'P20,000',
    discountPrice: 'P10,000',
    description: 'The ultimate package with full collaborator access.'
  }
}

const defaultPackage = {
  title: 'Bread + Butter',
  price: 'P20,000',
  discountPrice: 'P10,000',
  description: 'The ultimate package with full collaborator access.'
}

const currentPackage = computed(() => packagesMap[selectedPkgId.value] ?? defaultPackage)

interface QrOption {
  id: string
  label: string
  icon: string
  badgeText: string
  accountName: string
  accountNumber: string
  instructions: string
  logoText: string
}

const qrOptions: QrOption[] = [
  {
    id: 'gcash',
    label: 'GCash',
    icon: 'i-lucide-smartphone',
    badgeText: 'GCash QR',
    accountName: 'Bread + Butter Events',
    accountNumber: '0917 839 2883',
    instructions: 'Open your GCash app and scan this QR code',
    logoText: 'GCash'
  },
  {
    id: 'maya',
    label: 'Maya',
    icon: 'i-lucide-wallet',
    badgeText: 'Maya QR',
    accountName: 'Bread + Butter Events',
    accountNumber: '0918 920 1822',
    instructions: 'Open your Maya app and scan this QR code',
    logoText: 'Maya'
  },
  {
    id: 'qrph',
    label: 'Bank / QRPh',
    icon: 'i-lucide-landmark',
    badgeText: 'QRPh National Standard',
    accountName: 'Bread + Butter Events Inc.',
    accountNumber: 'BDO: 0012-3456-7890 / BPI: 1234-5678-90',
    instructions: 'Scan using BDO, BPI, UnionBank, or any QRPh banking app',
    logoText: 'QRPh'
  }
]

const qrTabs = [
  { value: 'gcash', label: 'GCash', icon: 'i-lucide-smartphone' },
  { value: 'maya', label: 'Maya', icon: 'i-lucide-wallet' },
  { value: 'qrph', label: 'Bank / QRPh', icon: 'i-lucide-landmark' }
]

const selectedQrId = ref<string | undefined>(undefined)
const activeQr = computed(() => qrOptions.find(o => o.id === selectedQrId.value) ?? null)

const proofFile = ref<File | null>(null)
const proofPreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const transactionId = ref('')

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    processFile(event.dataTransfer.files[0])
  }
}

function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Invalid File',
      description: 'Please upload an image file (PNG, JPG, WEBP).',
      color: 'error'
    })
    return
  }
  proofFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    proofPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeFile() {
  proofFile.value = null
  proofPreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function submitPayment() {
  if (!selectedQrId.value) {
    toast.add({
      title: 'Payment method required',
      description: 'Please select a QR payment option.',
      color: 'warning',
    })
    return
  }

  if (!transactionId.value.trim()) {
    toast.add({
      title: 'Transaction ID required',
      description: 'Enter the reference or transaction ID from your payment receipt.',
      color: 'warning',
    })
    return
  }

  if (!proofFile.value) {
    toast.add({
      title: 'Proof of payment required',
      description: 'Upload a screenshot or photo of your payment receipt.',
      color: 'warning',
    })
    return
  }

  if (!eventName.value.trim() || !eventDate.value.trim() || !venue.value.trim()) {
    toast.add({
      title: 'Missing event details',
      description: 'Please go back and complete your event setup first.',
      color: 'warning',
    })
    return
  }

  const paymentMethod = mapUiPaymentMethodToApi(selectedQrId.value)
  if (!paymentMethod) {
    toast.add({
      title: 'Invalid payment method',
      color: 'error',
    })
    return
  }

  isProcessing.value = true

  try {
    if (isUiOnlyMode.value) {
      await navigateTo({
        path: '/user/payment-pending',
        query: {
          ref: transactionId.value.trim(),
          package: selectedPkgId.value,
          eventName: eventName.value,
          method: formatPaymentMethodLabel(paymentMethod),
        },
      })
      return
    }

    const priceTierId = await resolvePriceTierId(selectedPkgId.value)
    await createEvent({
      eventType: eventType.value,
      eventName: eventName.value.trim(),
      description: description.value,
      venue: venue.value.trim(),
      eventDate: eventDate.value,
      priceTierId,
      transactionId: transactionId.value.trim(),
      proofOfPayment: proofFile.value,
      paymentMethod,
    })

    toast.add({
      title: 'Proof of Payment Submitted',
      description: 'Your payment transaction is currently being verified.',
      color: 'success',
    })

    await navigateTo({
      path: '/user/payment-pending',
      query: {
        ref: transactionId.value.trim(),
        package: selectedPkgId.value,
        eventName: eventName.value,
        method: formatPaymentMethodLabel(paymentMethod),
      },
    })
  } catch (error) {
    reportApiError(toast, {
      title: 'Could not create event',
      error,
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 pt-20 pb-10 bg-toast-700 text-white">
    <div class="max-w-3xl w-full mx-auto space-y-5">

      <!-- Page Header -->
      <div class="text-center space-y-1.5">
        <UBadge color="bread" variant="soft" size="sm"
          class="px-3 py-0.5 font-semibold rounded-full text-toast-900 bg-bread-400 text-xs">
          Checkout & Payment
        </UBadge>
        <h1 class="text-2xl sm:text-3xl font-bold font-serif text-bread-400">
          Complete Your Order
        </h1>
        <p class="text-xs text-bread-200">
          Select your QR payment option and upload your proof of payment to activate your Bread + Butter portion.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

        <!-- Left Side: Order Summary Card -->
        <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 md:col-span-5 space-y-4">
          <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
            Order Summary
          </h2>

          <div class="space-y-3">
            <div>
              <span class="text-[10px] text-toast-600 font-bold uppercase tracking-wider">Event Name</span>
              <p class="font-bold text-toast-900 text-sm truncate">{{ eventName }}</p>
            </div>

            <div class="bg-white/80 p-3 rounded-xl border border-toast-600/20 space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-serif font-bold text-base text-toast-900">{{ currentPackage.title }}</span>
                <UBadge color="toast" variant="solid" size="xs">Selected</UBadge>
              </div>
              <p class="text-xs text-toast-800 leading-snug">{{ currentPackage.description }}</p>
            </div>

            <!-- Price breakdown -->
            <div class="space-y-1.5 pt-1.5 text-xs border-t border-toast-600/20">
              <div class="flex justify-between text-toast-700">
                <span>Standard Rate</span>
                <span class="line-through">{{ currentPackage.price }}</span>
              </div>
              <div class="flex justify-between font-bold text-toast-900 text-sm">
                <span>Promo Total</span>
                <span class="text-toast-700 font-serif text-lg">{{ currentPackage.discountPrice }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: QR Code & Upload Proof -->
        <div class="bread-container bg-bread-400 text-toast-900 p-4 sm:p-5 md:col-span-7 space-y-4">
          <h2 class="text-lg font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-2">
            Scan & Pay
          </h2>

          <!-- UTabs: QR Code Selector -->
          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-toast-800 uppercase tracking-wider">
              Select QR Payment Method
            </div>
            <UTabs v-model="selectedQrId" :items="qrTabs" :content="false" class="w-full" :ui="{
              list: 'bg-toast-900/10 p-1 rounded-xl w-full grid grid-cols-3',
              indicator: 'bg-toast-600 shadow-sm rounded-lg',
              trigger: 'text-toast-800 data-[state=active]:text-white font-bold text-xs py-2'
            }" />
          </div>

          <!-- Active QR Code Display Card -->
          <div v-if="activeQr"
            class="bg-white/85 p-3.5 sm:p-4 rounded-xl border border-toast-600/20 flex flex-col items-center text-center space-y-2.5 transition-all">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-1.5 text-toast-900 font-bold text-xs sm:text-sm">
                <UIcon :name="activeQr.icon" class="w-4 h-4 text-toast-600" />
                <span>{{ activeQr.label }} QR</span>
              </div>
              <UBadge color="toast" variant="subtle" size="xs" class="text-[10px] font-semibold">
                {{ activeQr.badgeText }}
              </UBadge>
            </div>

            <!-- Placeholder QR Code Graphic -->
            <div
              class="relative bg-white p-2.5 sm:p-3 rounded-xl border-2 border-toast-600/20 shadow-sm flex flex-col items-center">
              <svg viewBox="0 0 160 160" class="w-36 h-36 sm:w-40 sm:h-40 text-toast-900" fill="currentColor">
                <!-- Top-Left Position Detection Pattern -->
                <rect x="10" y="10" width="42" height="42" rx="4" fill="currentColor" />
                <rect x="16" y="16" width="30" height="30" rx="2" fill="white" />
                <rect x="22" y="22" width="18" height="18" rx="1" fill="currentColor" />

                <!-- Top-Right Position Detection Pattern -->
                <rect x="108" y="10" width="42" height="42" rx="4" fill="currentColor" />
                <rect x="114" y="16" width="30" height="30" rx="2" fill="white" />
                <rect x="120" y="22" width="18" height="18" rx="1" fill="currentColor" />

                <!-- Bottom-Left Position Detection Pattern -->
                <rect x="10" y="108" width="42" height="42" rx="4" fill="currentColor" />
                <rect x="16" y="114" width="30" height="30" rx="2" fill="white" />
                <rect x="22" y="120" width="18" height="18" rx="1" fill="currentColor" />

                <!-- Timing and Alignment Patterns / Data Matrix Dots -->
                <rect x="60" y="14" width="6" height="6" fill="currentColor" />
                <rect x="74" y="14" width="6" height="6" fill="currentColor" />
                <rect x="88" y="14" width="6" height="6" fill="currentColor" />
                <rect x="60" y="28" width="6" height="6" fill="currentColor" />
                <rect x="88" y="28" width="6" height="6" fill="currentColor" />
                <rect x="60" y="42" width="6" height="6" fill="currentColor" />
                <rect x="74" y="42" width="6" height="6" fill="currentColor" />
                <rect x="88" y="42" width="6" height="6" fill="currentColor" />

                <rect x="14" y="60" width="6" height="6" fill="currentColor" />
                <rect x="28" y="60" width="6" height="6" fill="currentColor" />
                <rect x="42" y="60" width="6" height="6" fill="currentColor" />
                <rect x="14" y="74" width="6" height="6" fill="currentColor" />
                <rect x="42" y="74" width="6" height="6" fill="currentColor" />
                <rect x="14" y="88" width="6" height="6" fill="currentColor" />
                <rect x="28" y="88" width="6" height="6" fill="currentColor" />
                <rect x="42" y="88" width="6" height="6" fill="currentColor" />

                <rect x="60" y="60" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="76" y="60" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="92" y="60" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="108" y="60" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="124" y="60" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="140" y="60" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="60" y="76" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="92" y="76" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="124" y="76" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="60" y="92" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="76" y="92" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="108" y="92" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="140" y="92" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="108" y="76" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="140" y="76" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="60" y="108" width="6" height="6" fill="currentColor" />
                <rect x="74" y="108" width="6" height="6" fill="currentColor" />
                <rect x="88" y="108" width="6" height="6" fill="currentColor" />
                <rect x="108" y="108" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="124" y="108" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="140" y="108" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="60" y="122" width="6" height="6" fill="currentColor" />
                <rect x="88" y="122" width="6" height="6" fill="currentColor" />
                <rect x="108" y="124" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="140" y="124" width="8" height="8" rx="1" fill="currentColor" />

                <rect x="60" y="136" width="6" height="6" fill="currentColor" />
                <rect x="74" y="136" width="6" height="6" fill="currentColor" />
                <rect x="88" y="136" width="6" height="6" fill="currentColor" />
                <rect x="108" y="140" width="8" height="8" rx="1" fill="currentColor" />
                <rect x="124" y="140" width="8" height="8" rx="1" fill="currentColor" />

                <!-- Center Logo Overlay Badge -->
                <circle cx="80" cy="80" r="18" fill="white" stroke="currentColor" stroke-width="2" />
                <text x="80" y="83" font-size="7.5" font-family="sans-serif" font-weight="bold" fill="currentColor"
                  text-anchor="middle">
                  {{ activeQr.logoText }}
                </text>
              </svg>
            </div>

            <div class="space-y-0.5 text-center text-xs">
              <p class="font-bold text-toast-900">{{ activeQr.accountName }}</p>
              <p class="text-[11px] font-mono text-toast-800">{{ activeQr.accountNumber }}</p>
              <p class="text-[11px] text-toast-700 pt-0.5">Amount Due: <span class="font-bold text-toast-900">{{
                currentPackage.discountPrice }}</span></p>
            </div>
          </div>

          <!-- Transaction ID -->
          <div class="space-y-2">
            <UFormField label="Transaction / Reference ID" required>
              <UInput
                v-model="transactionId"
                placeholder="e.g. GCASH reference number"
                size="md"
                class="w-full bg-white text-toast-900 border-toast-300 rounded-lg"
              />
            </UFormField>
          </div>

          <!-- Upload Image Section -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-bold text-xs text-toast-900 flex items-center gap-1.5">
                <UIcon name="i-lucide-upload" class="w-3.5 h-3.5 text-toast-600" />
                <span>Upload Proof of Payment</span>
              </label>
              <span v-if="!proofFile" class="text-[10px] text-toast-600 italic">Required</span>
            </div>

            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

            <!-- Empty Drop Zone -->
            <div v-if="!proofFile" @click="triggerFileInput" @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop" :class="[
                'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5',
                isDragging
                  ? 'border-toast-600 bg-white/90 shadow-sm scale-[1.01]'
                  : 'border-toast-400/80 bg-white/60 hover:bg-white/85 hover:border-toast-600'
              ]">
              <div class="w-9 h-9 rounded-full bg-toast-500/10 text-toast-600 flex items-center justify-center">
                <UIcon name="i-lucide-image-up" class="w-5 h-5" />
              </div>
              <div class="space-y-0.5">
                <p class="text-xs font-bold text-toast-900">
                  Click or drag receipt image here
                </p>
                <p class="text-[10px] text-toast-700">
                  Supports PNG, JPG, or WEBP (up to 5MB)
                </p>
              </div>
            </div>

            <!-- Uploaded Preview Card -->
            <div v-else
              class="bg-white/90 p-3 rounded-xl border-2 border-toast-600/30 flex items-center justify-between gap-3 shadow-xs">
              <div class="flex items-center gap-3 min-w-0">
                <img v-if="proofPreview" :src="proofPreview" alt="Proof Preview"
                  class="w-12 h-12 object-cover rounded-lg border border-toast-300 shrink-0 bg-toast-50" />
                <div class="min-w-0 space-y-0.5">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-emerald-600 shrink-0" />
                    <p class="text-xs font-bold text-toast-900 truncate">
                      {{ proofFile.name }}
                    </p>
                  </div>
                  <p class="text-[10px] text-toast-600">
                    {{ (proofFile.size / 1024).toFixed(1) }} KB &bull; Attached
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <UButton color="toast" variant="ghost" size="xs"
                  class="text-xs font-medium text-toast-800 hover:bg-toast-100" @click="triggerFileInput">
                  Change
                </UButton>
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2"
                  class="text-red-600 hover:bg-red-50" @click="removeFile" />
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2 space-y-2">
            <UButton block color="primary" size="md"
              :disabled="!proofFile || !transactionId.trim() || !selectedQrId || isProcessing"
              :loading="isProcessing"
              class="font-bold text-white bg-toast-600 hover:bg-toast-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
              @click="submitPayment">
              Submit Proof of Payment
            </UButton>
            <p class="text-[11px] text-center text-toast-700 leading-tight">
              Transactions are encrypted and secured according to Philippine payment standards.
            </p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
