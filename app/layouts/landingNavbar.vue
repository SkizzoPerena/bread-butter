<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [{
  label: 'Docs',
  to: '/docs/getting-started',
  icon: 'i-lucide-book-open',
  active: route.path.startsWith('/docs/getting-started')
}, {
  label: 'Components',
  to: '/docs/components',
  icon: 'i-lucide-box',
  active: route.path.startsWith('/docs/components')
}, {
  label: 'Figma',
  icon: 'i-simple-icons-figma',
  to: 'https://go.nuxt.com/figma-ui',
  target: '_blank'
}, {
  label: 'Releases',
  icon: 'i-lucide-rocket',
  to: 'https://github.com/nuxt/ui/releases',
  target: '_blank'
}])

const isScrolled = ref(false)
const isSlideoverOpen = ref(false)

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
  { label: 'Features', to: '/#introduction' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
]
</script>

<template>

  <UHeader :class="[
    'fixed top-0 w-full transition-all duration-300 z-50 border-none hidden lg:flex',
    isScrolled ? 'bg-toast-500/70 backdrop-blur-lg' : 'bg-transparent backdrop-blur-none'
  ]">
    <template #left>
      <!-- Left empty to allow center content to be truly centered -->
      <div></div>
    </template>

    <div class="flex items-center gap-x-8">
      <UButton to="/#introduction" variant="link" color="bread" class="font-semibold text-base text-white">Features</UButton>
      <UButton to="/#pricing" variant="link" color="bread" class="font-semibold text-base text-white">Pricing
      </UButton>
      <UButton to="/partners/login" variant="link" color="bread" class="font-semibold text-base text-white">Partners
      </UButton>
      <NuxtLink to="/" class="mx-4">
        <img src="..\assets\bpb-icons\logo-white.svg" class="h-8" />
      </NuxtLink>
      <UButton to="https://www.blinkpunch.com" target="_blank" variant="link" color="bread"
        class="font-semibold text-base text-white">About</UButton>
      <UButton to="/contact-us" variant="link" color="bread" class="font-semibold text-base text-white">Contact
      </UButton>
      <UButton variant="link" class="font-semibold text-toast-100/0">Features</UButton>
   </div>

    <template #right>
      <div class="flex items-center gap-x-4">
        <UButton to="/user/login" variant="link" color="bread" class="font-semibold text-white">Sign In</UButton>
        <UButton to="/user/signup" color="bread" variant="solid" class="font-bold text-toast-700">Get Started</UButton>
      </div>
    </template>
  </UHeader>

  <!-- Mobile and Tablet Header -->
  <UHeader :toggle="false" class="lg:hidden bg-toast-500 text-white border-none ">

    <template #title>
      <USlideover :overlay="true" side="left" 
        :close="{
      color: 'bread',
      variant: 'ghost',
      class: 'rounded-full'
    }"
    title="Bread + Butter"
    
    :ui="{ content: 'max-w-full sm:max-w-md w-[85%] sm:w-auto bg-toast-500', overlay: 'bg-toast-700/70', title: 'text-bread-400' }">
        <UButton icon="i-lucide-menu" color="bread" variant="ghost" class="mx-auto"/>

        <template #body>
          <UButton variant="link" class="w-full mb-1" color="bread" to="https://www.blinkpunch.com">About Us</UButton>
          <UButton variant="link" class="w-full my-1" color="bread" to="/contact-us">Contact Us</UButton>
          <UButton variant="link" class="w-full my-1" color="bread" to="/partners/login">Partners</UButton>
          <UButton variant="link" class="w-full my-1" color="bread" to="https://www.blinkpunch.com">About Us</UButton>

        </template>
      </USlideover>
      <img class="h-7 w-auto" src="..\assets\bpb-icons\logo-white.svg" />
    </template>


    <template #right>
      <UButton to="/user/login" variant="link" color="bread" class="font-semibold text-white">Sign In</UButton>
      <UButton to="/user/signup" color="bread" variant="solid" class="font-bold text-toast-700">Get Started</UButton>
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
      <UButton v-for="link in links" :key="link.to" :to="link.to" color="neutral" variant="ghost">{{ link.label }}
      </UButton>
    </template>
  </UFooter>
</template>

<style></style>