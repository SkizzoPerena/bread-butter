<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Payment - Bread + Butter',
})

const route = useRoute()
const toast = useToast()

const selectedPkgId = computed(() => (typeof route.query.package === 'string' ? route.query.package : 'bread-butter'))
const eventName = computed(() => (typeof route.query.eventName === 'string' ? route.query.eventName : 'My Special Celebration'))

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

const paymentMethods = [
  { id: 'gcash', label: 'GCash', icon: 'i-lucide-smartphone', details: 'Scan or send payment via GCash QR code' },
  { id: 'maya', label: 'Maya', icon: 'i-lucide-wallet', details: 'Pay via Maya wallet or Maya QR' },
  { id: 'bank', label: 'Bank Transfer (BDO / BPI)', icon: 'i-lucide-landmark', details: 'Direct online banking deposit' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'i-lucide-credit-card', details: 'Visa, Mastercard, or JCB' }
]

const selectedPaymentMethod = ref('gcash')
const isProcessing = ref(false)

function submitPayment() {
  isProcessing.value = true

  setTimeout(() => {
    isProcessing.value = false
    toast.add({
      title: 'Payment Submitted',
      description: 'Your payment transaction is currently processing.',
      color: 'success'
    })

    const refNum = 'BB-' + Math.floor(100000 + Math.random() * 900000)
    navigateTo({
      path: '/user/payment-pending',
      query: {
        ref: refNum,
        package: selectedPkgId.value,
        eventName: eventName.value,
        method: selectedPaymentMethod.value
      }
    })
  }, 1000)
}
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto space-y-8">

      <!-- Page Header -->
      <div class="text-center space-y-3">
        <UBadge color="bread" variant="soft" size="lg" class="px-3.5 py-1 font-semibold rounded-full text-toast-900 bg-bread-400">
          Checkout & Payment
        </UBadge>
        <h1 class="text-4xl font-bold font-serif text-bread-400">
          Complete Your Order
        </h1>
        <p class="text-sm text-bread-200">
          Select your preferred payment option to activate your Bread + Butter portion.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- Left Side: Order Summary Card -->
        <div class="bread-container bg-bread-400 text-toast-900 p-6 md:col-span-5 space-y-6">
          <h2 class="text-xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3">
            Order Summary
          </h2>

          <div class="space-y-4">
            <div>
              <span class="text-xs text-toast-600 font-bold uppercase tracking-wider">Event Name</span>
              <p class="font-bold text-toast-900 text-base truncate">{{ eventName }}</p>
            </div>

            <div class="bg-white/80 p-4 rounded-xl border border-toast-600/20 space-y-2">
              <div class="flex justify-between items-center">
                <span class="font-serif font-bold text-lg text-toast-900">{{ currentPackage.title }}</span>
                <UBadge color="toast" variant="solid" size="xs">Selected</UBadge>
              </div>
              <p class="text-xs text-toast-800">{{ currentPackage.description }}</p>
            </div>

            <!-- Price breakdown -->
            <div class="space-y-2 pt-2 text-sm border-t border-toast-600/20">
              <div class="flex justify-between text-toast-700">
                <span>Standard Rate</span>
                <span class="line-through">{{ currentPackage.price }}</span>
              </div>
              <div class="flex justify-between font-bold text-toast-900 text-base">
                <span>Promo Total</span>
                <span class="text-toast-700 font-serif text-xl">{{ currentPackage.discountPrice }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Payment Method Selection -->
        <div class="bread-container bg-bread-400 text-toast-900 p-6 md:col-span-7 space-y-6">
          <h2 class="text-xl font-bold font-serif text-toast-800 border-b border-toast-600/20 pb-3">
            Select Payment Method
          </h2>

          <div class="space-y-3">
            <button
              v-for="method in paymentMethods"
              :key="method.id"
              @click="selectedPaymentMethod = method.id"
              :class="[
                'w-full flex items-center justify-between p-4 rounded-xl transition-all border-2 text-left',
                selectedPaymentMethod === method.id
                  ? 'bg-white border-toast-600 shadow-md ring-2 ring-toast-600/20'
                  : 'bg-white/70 border-toast-300 hover:border-toast-500'
              ]"
            >
              <div class="flex items-center gap-3">
                <UIcon :name="method.icon" class="w-6 h-6 text-toast-600 shrink-0" />
                <div>
                  <div class="font-bold text-toast-900 text-sm">{{ method.label }}</div>
                  <div class="text-xs text-toast-700">{{ method.details }}</div>
                </div>
              </div>
              <UIcon
                :name="selectedPaymentMethod === method.id ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                :class="selectedPaymentMethod === method.id ? 'text-toast-600' : 'text-toast-400'"
                class="w-5 h-5 shrink-0"
              />
            </button>
          </div>

          <div class="pt-4 space-y-3">
            <UButton
              block
              color="primary"
              size="lg"
              class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
              :loading="isProcessing"
              @click="submitPayment"
            >
              Pay {{ currentPackage.discountPrice }} Now
            </UButton>
            <p class="text-xs text-center text-toast-700">
              Transactions are encrypted and secured according to Philippine payment standards.
            </p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
