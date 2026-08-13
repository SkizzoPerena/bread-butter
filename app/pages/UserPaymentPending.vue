<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Payment Pending - Bread + Butter',
})

const route = useRoute()

const referenceNumber = computed(() => (typeof route.query.ref === 'string' ? route.query.ref : 'BB-' + Math.floor(100000 + Math.random() * 900000)))
const eventName = computed(() => (typeof route.query.eventName === 'string' ? route.query.eventName : 'My Celebration'))
const packageName = computed(() => (typeof route.query.package === 'string' ? route.query.package.replace('-', ' ').toUpperCase() : 'BREAD + BUTTER'))
const paymentMethod = computed(() => (typeof route.query.method === 'string' ? route.query.method.toUpperCase() : 'GCASH'))
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto space-y-8">

      <!-- Container Card -->
      <div class="bread-container bg-bread-400 text-toast-900 p-8 sm:p-10 space-y-6 text-center">
        
        <!-- Status Icon & Badge -->
        <div class="space-y-3">
          <div class="w-16 h-16 bg-toast-500/10 text-toast-600 rounded-full flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-clock" class="w-10 h-10 animate-pulse" />
          </div>

          <UBadge color="warning" variant="solid" size="lg" class="px-4 py-1 font-bold rounded-full">
            Payment Pending Verification
          </UBadge>
        </div>

        <!-- Heading -->
        <div class="space-y-2">
          <h1 class="text-3xl font-bold font-serif text-toast-900">
            We're baking your portion!
          </h1>
          <p class="text-sm text-toast-800 max-w-md mx-auto">
            Your transaction has been submitted and is currently being verified by our payment gateway.
          </p>
        </div>

        <!-- Transaction Details Box -->
        <div class="bg-white/80 p-5 rounded-2xl border border-toast-600/20 text-left space-y-3 text-sm">
          <div class="flex justify-between items-center border-b border-toast-600/10 pb-2">
            <span class="text-toast-700 font-medium">Reference Number</span>
            <span class="font-mono font-bold text-toast-900 text-base">{{ referenceNumber }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-toast-600/10 pb-2">
            <span class="text-toast-700 font-medium">Event Name</span>
            <span class="font-bold text-toast-900">{{ eventName }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-toast-600/10 pb-2">
            <span class="text-toast-700 font-medium">Package Portion</span>
            <span class="font-bold text-toast-900">{{ packageName }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-toast-700 font-medium">Payment Method</span>
            <span class="font-bold text-toast-900">{{ paymentMethod }}</span>
          </div>
        </div>

        <!-- Instructions -->
        <div class="text-xs text-toast-700 bg-toast-500/10 p-4 rounded-xl text-left space-y-1">
          <p class="font-bold text-toast-900">What happens next?</p>
          <p>• Once verified, your package features will activate automatically.</p>
          <p>• You will receive a confirmation notice via email with your account access details.</p>
        </div>

        <!-- Action Buttons -->
        <div class="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <UButton
            to="/user/transactions"
            variant="soft"
            color="neutral"
            size="lg"
            class="font-semibold"
          >
            View Transactions
          </UButton>
          <UButton
            to="/user/event-dashboard"
            color="primary"
            size="lg"
            class="font-bold text-white bg-toast-600 hover:bg-toast-700 shadow-md"
          >
            Go to Event Dashboard
          </UButton>
        </div>

      </div>

    </div>
  </div>
</template>
