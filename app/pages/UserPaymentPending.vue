<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'signed-in-navbar',
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
  <div class="flex-1 flex flex-col items-center justify-center p-4 pt-24 sm:pt-28 pb-10 bg-toast-700 text-white">
    <UCard class="w-full max-w-sm sm:max-w-md mx-auto bread-container bg-bread-400 text-black shadow-lg rounded-xl"
      :ui="{ body: 'p-4 sm:p-5 flex flex-col items-center space-y-3.5 text-center w-full' }">

      <!-- Status Icon & Badge -->
      <div class="space-y-2 flex flex-col items-center justify-center">
        <div class="w-12 h-12 bg-toast-500/10 text-toast-600 rounded-full flex items-center justify-center">
          <UIcon name="i-lucide-clock" class="w-7 h-7 animate-pulse" />
        </div>

        <UBadge color="warning" variant="solid" size="sm" class="px-3 py-0.5 font-semibold rounded-full text-xs">
          Payment Pending Verification
        </UBadge>
      </div>

      <!-- Heading -->
      <div class="space-y-1 text-center">
        <h1 class="text-xl sm:text-2xl font-bold font-serif text-toast-900">
          We're heating the oven for you!
        </h1>
        <p class="text-xs text-toast-800 max-w-xs mx-auto">
          Your transaction has been submitted and is currently being verified by our payment gateway.
        </p>
      </div>

      <!-- Transaction Details Box -->
      <div class="w-full bg-white/80 p-3.5 rounded-xl border border-toast-600/20 text-left space-y-2 text-xs">
        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Reference Number</span>
          <span class="font-mono font-bold text-toast-900 text-sm">{{ referenceNumber }}</span>
        </div>

        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Event Name</span>
          <span class="font-bold text-toast-900">{{ eventName }}</span>
        </div>

        <div class="flex justify-between items-center border-b border-toast-600/10 pb-1.5">
          <span class="text-toast-700 font-medium">Package Portion</span>
          <span class="font-bold text-toast-900">{{ packageName }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-toast-700 font-medium">Payment Method</span>
          <span class="font-bold text-toast-900">{{ paymentMethod }}</span>
        </div>
      </div>

      <!-- Instructions -->
      <div
        class="w-full text-[11px] text-toast-700 bg-toast-500/10 p-3 rounded-lg text-center space-y-0.5 leading-snug">
        <p class="font-bold text-toast-900">What happens next?</p>
        <p>• Once verified, your package features will activate automatically.</p>
        <p>• You will receive a confirmation notice via email with access details.</p>
      </div>

    </UCard>
  </div>
</template>
