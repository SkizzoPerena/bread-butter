<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const isScrolled = ref(false)

function handleScroll() {
  // 90vh from the top
  isScrolled.value = window.scrollY > window.innerHeight * 0.5
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const links = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
]
</script>

<template>
  <UHeader 
    :class="[
      'fixed top-0 w-full transition-all duration-300 z-50 border-none',
      isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
    ]"
  >
    <template #left>
      <!-- Left empty to allow center content to be truly centered -->
       <div></div>
    </template>


      <div class="flex items-center gap-x-8">
        <UButton to="/features" variant="link" color="bread" disabled class="font-semibold text-base text-white">Features</UButton>
        <UButton to="/pricing" variant="link" color="bread" disabled class="font-semibold text-base text-white">Pricing</UButton>
        <NuxtLink to="/" class="mx-4">
          <img src="..\assets\bpb-icons\logo-white.svg" class="h-8" />
        </NuxtLink>
        <UButton to="/about" variant="link" color="bread" disabled class="font-semibold text-base text-white">About</UButton>
        <UButton to="/contact" variant="link" color="bread" disabled class="font-semibold text-base text-white">Contact</UButton>
      </div>

    <template #right>
      <div class="flex items-center gap-x-4">
        <UButton to="/UserLogin" variant="link" color="bread" class="font-semibold text-white">Sign In</UButton>
        <UButton to="/UserSignup" color="bread" variant="solid" class="font-bold text-toast-700">Get Started</UButton>
      </div>
    </template>
  </UHeader>
  <slot />
  <UFooter class=" bg-bread-400">
    <template #left>
      <p class="text-sm text-toast-600">
        Copyright © {{ new Date().getFullYear() }} Bread+Butter. All rights reserved.
      </p>
    </template>

    <template #right>
      <UButton v-for="link in links" :key="link.to" :to="link.to" color="neutral" variant="ghost">{{ link.label }}</UButton>
    </template>
  </UFooter>
</template>

<style>
</style>