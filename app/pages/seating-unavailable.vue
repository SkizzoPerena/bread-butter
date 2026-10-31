<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const fromPayment = computed(() => route.query.from === 'payment')

useHead({ title: 'Seating unavailable' })
</script>

<template>
  <div class="min-h-screen bg-toast-800 text-bread-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-bread-100 text-toast-900 p-6 space-y-4 text-center">
      <h1 class="text-3xl font-serif font-bold">
        Seating is not available right now
      </h1>
      <template v-if="fromPayment">
        <p>If you already paid, your payment and seating plan are saved.</p>
        <p class="text-sm">
          Contact us if you have questions about your payment.
        </p>
      </template>
      <template v-else>
        <p>Invitations, seat passes, and seating plans can't be opened at the moment.</p>
        <p class="text-sm">
          Hosts, your plan and guest list are saved. Guests, please check with your host.
        </p>
      </template>
      <div class="flex flex-wrap justify-center gap-2">
        <UButton to="/contact-us">
          Contact us
        </UButton>
        <UButton
          to="/"
          variant="outline"
        >
          Back home
        </UButton>
      </div>
    </div>
  </div>
</template>
